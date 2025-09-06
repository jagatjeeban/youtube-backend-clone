import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { LIMIT } from './constants.js';

//import routes
import userRoutes from './routes/user.route.js';
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";

const app = express();

//app middleware configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({
    limit: LIMIT
}))
app.use(express.urlencoded({
    extended: true,
    limit: LIMIT
}))
app.use(express.static('public'));
app.use(cookieParser());

//routes declaration
app.use('/api/v1/users', userRoutes);
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)

export { app }