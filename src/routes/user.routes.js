import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser, logoutUser, loginUser, refreshAccssToken, changeCurrentPassword, getCurrentUser, getUserchannelProfile, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewareas.js";

const router = Router();

//unsecured routes
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccssToken);


//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/c/:username").get(verifyJWT,getUserchannelProfile);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/history").get(verifyJWT,getWatchHistory)

export default router;
