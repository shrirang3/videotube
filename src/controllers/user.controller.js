import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


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
    if (!username && !email) {
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

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

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


const refreshAccessToken=asyncHandler(async(req, res)=>{

    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
            const decodedToken=jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user=await User.findById(decodedToken?._id)
        
            if(!user){
                throw new ApiError(401, "Invalid Refresh Token")
            }
        
            //check both referesh token
            if(incomingRefreshToken!==user?.refreshToken){
                throw new ApiError(401, "Refresh Token is Expired or Used")
            }
        
            //now we have validated token=>so we generate new tokens
            const options={
                httpOnly:true,
                secure:true
            }
        
            const {accessToken, newrefreshToken}=await generateAccessAndRefereshToken(user._id)
        
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken:newrefreshToken},
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword=asyncHandler(async(req, res)=>{

    const {oldPassword, newPassword}=req.body
    const user=await User.findById(req.user?._id)

    //checking if old pass is correct
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Pass")
    }

    user.password=newPassword
    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
    
})

const getCurrentUser=asyncHandler(async(req, res)=>{
    //user has aldready been injected in req coz of middleware
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully") //middleware has been run on my req
})

const updateAccountDetails=asyncHandler(async(req, res)=>{
    //updating account details
    const {fullName, email}=req.body
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Account Details Updated successfully"))
})


//file updation should be done seperately
const updateuserAvatar=asyncHandler(async(req, res)=>{
    const avatarLocalpath=req.files?.path
    if(!avatarLocalpath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar=await uploadonCloudinary(avatarLocalpath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image updated successfully"))
})

const updateuserCoverImage=asyncHandler(async(req, res)=>{
    const coverLocalpath=req.files?.path
    if(!coverLocalpath){
        throw new ApiError(400, "Cover file is missing")
    }

    const cover=await uploadonCloudinary(coverLocalpath)

    if(!cover.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:cover.url
            }
        },
        {new:true}
    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})

const getUserChannelProfile=asyncHandler(async(req, res)=>{
    const {username}=req.params //we will be fetching it from routes like videotube.com/shrirang=>thus using params
    
    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    //using Aggregation pipeline
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",    //export const Subscription=mongoose.model("Subscription", subscriptionSchema)
                localField:"_id",                      //everything is converted to lowercase and becomes plural
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",      //using lookup to get count of subscribed To count
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size:"$subscribers" 
                },
                channelsSubscribedToCount:{  //using size function to get exact count of subs subsTo
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in:[req.user?._id, "$subscribers.subscriber"]}, //checking if the user who is 
                        // viewing has subscribed to profile he is viewing
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                //only sends mentioned info to frontend
                fullName: 1,
                username: 1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched succesfully"))
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateuserAvatar,
    updateuserCoverImage,
    getUserChannelProfile
}