import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv"

// Configuration

dotenv.config();

// ✅ ACTUALLY APPLY THE CONFIG
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


console.log("Cloudinary config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✓" : "❌ missing",
});


// const uploadOnClodianry = async (localFilePath) =>{
//     try {
//         if(!localFilePath) return null
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type:"auto"
//         })
//         console.log("File uplaoded on cloudinary,File src: "+response.url);
//         //once the file is uploaded, we would like to delete it from our server/local
//         fs.unlinkSync(localFilePath)
//         return response
//     } catch (error) {
//         console.log("File uplosd error");
        
//        fs.unlinkSync(localFilePath) 
//        return null
//     }
// }

const uploadOnClodianry = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      throw new Error("Local file path is missing or does not exist.");
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("File upload error:", error.message);
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null; // not throwing here is okay, but must be checked above
  }
};


const deleteFromCloudinary = async (publicId)=>{
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    console.log("Dleted from cloudinary. Public Id",publicId);
    
  } catch (error) {
    console.log("Error deleting from clodinary");
    return null
    
  }
}


export { uploadOnClodianry, deleteFromCloudinary };



