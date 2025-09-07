import { Router } from 'express';
import {
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
} from "../controllers/like.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJwt); // Apply verifyJwt middleware to all routes in this file

router.route("/toggle/video/:videoId").get(toggleVideoLike);
router.route("/toggle/comment/:commentId").get(toggleCommentLike);
router.route("/toggle/tweet/:tweetId").get(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router