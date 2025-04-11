import {Router} from "express";
import {loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateuserAvatar, updateuserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"; //this is the multer middlewear for file upload
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router=Router()

router.route("/register").post(
    upload.fields([
        {name:"avatar",  //this name should be same in frontend of field
            maxCount:1
        },

        {
            name:"coverImage",   //this name should be same in frontend of field
            maxCount:1
        }
    ])
    ,registerUser)


router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)    //middleware injected to add user object in req
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails) //use .patch
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateuserAvatar) 
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateuserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile) //use this when getting from params
router.route("/history").get(verifyJWT, getWatchHistory)


export default router