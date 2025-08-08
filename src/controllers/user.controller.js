import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/FileUpload.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {

    //step 1: get user details from frontend
    const { username, email, fullName, password } = req.body;
    console.log('User', req.body);

    //step 2: validate user details
    if ([fullName, username, email, password].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required!');
    }
    if (!email?.includes('@')) {
        throw new ApiError(400, 'Invalid email found!');
    }

    //step 3: check if user already exists -> username, email
    const existingUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        console.log('Existing User', existingUser);
        throw new ApiError(409, 'User with username or email already exists!');
    }

    //step 4: check for images, avatar
    console.log('Local Files', req?.files);
    const avatarLocalPath = req?.files?.avatar[0]?.path;
    const coverImgLocalPath = req?.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required!');
    }

    //step 5: upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImgLocalPath);
    console.log('Avatar', avatar);

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

export { registerUser };