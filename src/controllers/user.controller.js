import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser=asyncHandler(async(req, res)=>{
    //get user detail from frontend
    //validation->not empty
    //check if user aldready exist=>username and email
    //check if files are present=>avatar compulsary
    //upload to cloudinary, avatar
    //create user object=>create entry in DB (Mongo is NOSQL DB, so object needed to push in DB)
    //remove password and refresh token from response 
    //check for user creation
    //return response

    const {fullName, email, username, password}=req.body
    console.log(email);

    if(fullName===""){
        throw new ApiError(400, "fullname is required")
    }
    if(email===""){
        throw new ApiError(400, "email is required")
    }
    if(username===""){
        throw new ApiError(400, "username is required")
    }
    if(password===""){
        throw new ApiError(400, "password is required")
    }
    
    
    const existedUser=await User.findOne({
        $or:[{username}, {email}]  //throwing error if username or password aldready exist in DB
    })

    if(existedUser){
        throw new ApiError(409, "User with email/username aldready exist")
    }

    //file handling
    const avatarLocalpath=req.files?.avatar[0]?.path; //from multer middlewear
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalpath){
        throw new ApiError(400, "Avatar file needed")
    }
    //upload them to cloudinary
    const avatar=await uploadonCloudinary(avatarLocalpath);
    const coverImage=await uploadonCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400, "Avatar file needed")
    }

    //create object
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //check if user is created and remove pass and ref-token
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered")
    )
})

export {registerUser}