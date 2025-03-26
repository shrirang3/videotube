import {Router} from "express";
import {registerUser} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"; //this is the multer middlewear for file upload

const router=Router()

router.route("/register").post(
    upload.fields([
        {name:"avatar",  //this name should be same in frontend of field
            maxCount:1
        },

        {
            name:"coverImage",
            maxCount:1
        }
    ])
    ,registerUser)

export default router