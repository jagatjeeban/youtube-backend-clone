import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/FileUpload.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

//function to generate access & refresh tokens
const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(500, 'Something went wrong while generating tokens!');
    }
}

//function to register the user
const registerUser = asyncHandler(async (req, res) => {

    //step 1: get user details from frontend
    const { username, email, fullName, password } = req.body;
    // console.log('User', req.body);

    //step 2: validate user details
    if ([fullName, username, email, password].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required!');
    }
    if (!email?.includes('@')) {
        throw new ApiError(400, 'Invalid email found!');
    }

    //step 3: check if user already exists -> username, email
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        console.log('Existing User', existingUser);
        throw new ApiError(409, 'User with username or email already exists!');
    }

    //step 4: check for images, avatar
    // console.log('Local Files', req?.files);
    const avatarLocalPath = req?.files?.avatar[0]?.path;

    let coverImgLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImgLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required!');
    }

    //step 5: upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImgLocalPath);
    // console.log('Avatar', avatar);

    //step 6: check if avatar is successfully uploaded
    if (!avatar) {
        throw new ApiError(400, 'Avatar is required!');
    }

    //step 7: create user object & create entry in database
    const user = await User.create({
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url || null,
        email,
        password,
        username: username?.trim()?.toLowerCase()
    })

    //step 8: check for user creation (findById(user?._id))
    //step 9: remove password & refresh token field from response (select("-password -refreshToken"))
    const createdUser = await User.findById(user?._id)?.select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while registering the user!');
    }

    //step 10: return response
    return res.status(200).json(
        new ApiResponse(200, createdUser, 'User registered successfully!')
    )
})

//function to login the user
const loginUser = asyncHandler(async (req, res) => {

    //get user details from frontend
    const { username, email, password } = req.body;

    //validate user details
    if (!username && !email) {
        throw new ApiError(400, 'Username or Email is required!');
    }

    //find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    //check if the user exists
    if (!user) {
        throw new ApiError(404, 'User does not exist!');
    }

    //check if the password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials!');
    }

    //generate access & refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user?._id);

    //read user details from database
    //remove password & refresh token
    const loggedInUser = await User.findById(user?._id).select('-password -refreshToken');

    //set cookie options
    const options = {
        httpOnly: true,
        secure: true
    }

    //return response 
    return res.status(200)
        .cookie('accessToken', accessToken, options) //send cookies
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, 'User logged in successfully!')
        )
})

//function to log out the user
const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: null } },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(new ApiResponse(200, null, 'User logged out successfully!'))
})

//function to give the user a new access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unathorized access');
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, 'Invalid refresh token');
    }
    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(400, 'Token is expired or used');
    }

    const { accessToken, refreshToken } = await generateTokens(user?._id);

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(200, { accessToken, refreshToken }, 'Access token refreshed!')
        )
})

//function to change the user's current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req?.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, 'Invalid old password');
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully!'));
})

//function to get the current user 
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user));
})

//function to update the user details
const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if ([fullName, email].every(field => !field)) {
        throw new ApiError(400, 'At least one field is required!');
    }
    if (!email.includes('@')) {
        throw new ApiError(400, 'Invalid email Id!');
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullName, email }
        },
        { new: true }
    ).select('-password');

    return res.status(200).json(new ApiResponse(200, user, 'User details updated successfully!'));
})

//function to update the user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, 'User avatar is missing!');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) {
        throw new ApiError(500, 'Something went wrong while uploading avatar!');
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { avatar: avatar?.url }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, { newAvatar: avatar?.url }, 'User avatar updated successfully!')
    );
})

//function to update the user cover image
const updateUserCoverImg = asyncHandler(async (req, res) => {
    const coverImgLocalPath = req.file?.path;
    if (!coverImgLocalPath) {
        throw new ApiError(400, 'User cover image is missing!');
    }

    const coverImage = await uploadOnCloudinary(coverImgLocalPath);
    if (!coverImage?.url) {
        throw new ApiError(500, 'Something went wrong while uploading cover image!');
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { coverImage: coverImage?.url }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, { newCoverImage: coverImage?.url }, 'User cover image updated successfully!')
    );
})

//function to get the user channel profile details
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, 'Username is required!');
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: '$subscribers'
                },
                channelsSubscribedToCount: {
                    $size: '$subscribedTo'
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, '$subscribers.subscriber'] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, 'Channel does not exist!');
    }

    console.log('Channel Details', channel);

    return res.status(200).json(
        new ApiResponse(200, channel[0], 'User channel fetched successfully!')
    )
})

//function to get the user's watch history
const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, 'Watch history fetched successfully!')
    )
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getUserChannelProfile,
    getUserWatchHistory
};