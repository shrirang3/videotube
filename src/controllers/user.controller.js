import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessAndRefereshToken = async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAcessToken()
        const refereshToken=user.generateRefreshToken()

        user.refereshToken=refereshToken //we save referesh token with us in DB
        await user.save({validateBeforeSave:false})

        return {accessToken, refereshToken}
    } catch (error) {
        throw new ApiError(500, 'Something went wrong while generating Token')
    }
}




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
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;
    //checking coverImgae exists or not 
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

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

const loginUser=asyncHandler(async(req, res)=>{
    //take data from frontend
    //validation
    //find user
    //password check
    //access token and refresh token
    //send cookie

    const {email, username, password}=req.body
    if (!username || !email) {
        throw new ApiError(400, 'username or email is required')
    }

    const user = await User.findOne({
        $or:[{username}, {email}] //checking on basis of username or email
    })

    if(!user){
        throw new ApiError(404, 'User does not exist')
    }

    //pass check
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid User credentials')
    }

    //accesss and refresh token->write seperate method
    const {accessToken, refereshToken}=await generateAccessAndRefereshToken(user._id)
    //send in cookie

    const loggedInUser=User.findById(user._id).select("-password -refreshToken")

    const options= {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refereshToken, options)
    .json(
        new ApiResponse(200, 
            {
                user:loggedInUser, accessToken, refereshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req, res)=>{
    //for logout we do not have acces to user object from DB
    await User.findByIdAndUpdate(
        req.user._id,
            {
            $set: {
                refreshToken: undefined
            }
        },
            {
                new:true
            }
        
    )

    const options= {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"))
})

export {registerUser,
    loginUser,
    logoutUser
}