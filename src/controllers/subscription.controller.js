import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, 'Channel Id is missing!');
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Channel Id is invalid!');
    }

    const isSubscribed = await Subscription.findOneAndDelete({ channel: channelId, subscriber: req.user?._id });

    if (isSubscribed) {
        return res.status(200).json(
            new ApiResponse(200, null, 'Channel unsubscribed successfully!')
        )
    } else {
        await Subscription.create({ channel: channelId, subscriber: req.user?._id });
        return res.status(200).json(
            new ApiResponse(200, null, 'Channel subscribed successfully!')
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, 'Channel Id is missing!')
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Channel Id is invalid!')
    }

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'subscriber',
                            foreignField: '_id',
                            as: 'user',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        email: 1,
                                        coverImage: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    { $unwind: '$user' },
                    { $replaceRoot: { newRoot: '$user' } }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, user?.[0].subscribers, 'Subscribers list fetched successfully!')
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId) {
        throw new ApiError(400, 'Subscriber Id is missing!')
    }

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, 'Subscriber Id is invalid!')
    }

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'channel',
                            foreignField: '_id',
                            as: 'user',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        email: 1,
                                        coverImage: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    { $unwind: '$user' },
                    { $replaceRoot: { newRoot: '$user' } }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, user?.[0].subscribedTo, 'Subscribed channels fetched successfully!')
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}