import {v2 as cloudinary} from "cloudinary"
import fs from "fs" //file system => comes with js for file operations

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});


//here we are uploading the file from local storage to cloudinary services
const uploadonCloudinary=async(localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //file uploaded successfully
        console.log("File uploaded on cloudinary");
        console.log(response.url);
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove file from local storage since operation has failed
        return null;
    }
}

export {uploadonCloudinary};