import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, 'Video Id is missing!');
    }

    //check if video id exists in the db
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Video Id is invalid!');
    }

    const userId = req.user._id;

    //check if a like is already present, if found remove it (unlike) or else create a new document (like)
    const removedLike = await Like.findOneAndDelete({ video: videoId, likedBy: userId });

    if (removedLike) {
        return res.status(200).json(
            new ApiResponse(200, null, 'Video unliked successfully!')
        );
    } else {
        const newLike = await Like.create({ video: videoId, likedBy: userId });
        // console.log('New Like', JSON.stringify(newLike, null, 2));
        return res.status(200).json(
            new ApiResponse(200, null, 'Video liked successfully!')
        );
    };
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, 'Comment Id is missing!');
    }

    //check if comment id exists in the db
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Comment Id is invalid!');
    }

    const userId = req.user._id;

    //check if a like is already present, if found remove it (unlike) or else create a new document (like)
    const removedLike = await Like.findOneAndDelete({ comment: commentId, likedBy: userId });

    if (removedLike) {
        return res.status(200).json(
            new ApiResponse(200, null, 'Comment unliked successfully!')
        );
    } else {
        await Like.create({ comment: commentId, likedBy: userId });
        return res.status(200).json(
            new ApiResponse(200, null, 'Comment liked successfully!')
        );
    };
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, 'Tweet Id is missing!');
    }

    //check if tweet id exists in the db
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, 'Tweet Id is invalid!');
    }

    const userId = req.user._id;

    //check if a like is already present, if found remove it (unlike) or else create a new document (like)
    const removedLike = await Like.findOneAndDelete({ tweet: tweetId, likedBy: userId });

    if (removedLike) {
        return res.status(200).json(
            new ApiResponse(200, null, 'Tweet unliked successfully!')
        );
    } else {
        await Like.create({ tweet: tweetId, likedBy: userId });
        return res.status(200).json(
            new ApiResponse(200, null, 'Tweet liked successfully!')
        );
    };
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: userId,
                video: { $exists: true, $ne: null } //filters out docs where video field exists and is not null
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'video'
            }
        },
        { $unwind: '$video' }, //Deconstructs an array field into multiple documents, one per element. e.g. in this case: {...rest, video: [v1]} => {...rest, video: v1}
        { $replaceRoot: { newRoot: '$video' } } //Returns plain video documents as the final result list. e.g. in this case it returns: [v1, v2, ...]
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideos, 'Liked videos fetched successfully!'))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
