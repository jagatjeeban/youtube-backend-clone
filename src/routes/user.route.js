import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logOutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImg, updateUserDetails } from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
);

router.route('/login').post(loginUser);
router.route('/details').get(verifyJwt, getCurrentUser);
router.route('/changePassword').post(verifyJwt, changeCurrentPassword);
router.route('/update').post(verifyJwt, updateUserDetails);
// router.route('/updateAvatar').post(
//     verifyJwt,
//     upload.single('avatar'),
//     updateUserAvatar
// );
// router.route('/updateCoverImage').post(
//     verifyJwt,
//     upload.single('coverImage'),
//     updateUserCoverImg
// );

//secured routes
router.route('/logout').post(verifyJwt, logOutUser);
router.route('/refresh-tokens').post(refreshAccessToken);

export default router;