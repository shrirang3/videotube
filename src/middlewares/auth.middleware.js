import { ApiError } from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js" 
import jwt  from "jsonwebtoken"
import { User } from "../models/user.model.js"

//this function is implemented so that we can have access of user in logout user controller

export const verifyJWT=asyncHandler(async(req, res, next)=>{
    try {
        //req has access to cookie coz of app.use(cookieParser()) in app.js
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") //Format=> Authorization: Bearer <token>
        //using .replace coz i only need token value  
    
        if(!token){
            throw new ApiError(401, "Unauthorized Request")
        }
    
        const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Acess token")
        }
        
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})