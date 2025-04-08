import {Router} from "express";
import {loginUser, logoutUser, registerUser, refreshAccessToken} from "../controllers/user.controller.js"
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

export default router