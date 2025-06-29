import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import {
  deleteFromCloudinary,
  uploadOnClodianry,
} from "../utils/cloudinary.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { json } from "express";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user =  await User.findById(userId); 
    if (!user) {
      throw new ApiError(404, "User Not found by ID");
    }

    const accessToken = user.generateAccesToken(); // ✅ Make sure method name is correct
    const refreshToken = user.generateRefreshToken();

user.refreshToken = refreshToken;
await user.save({ validateBeforeSave: false });


    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};


const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  console.log("Body:", req.body);
  console.log("Files:", req.files);

  if (
    [fullname, username, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(404, "User with email or Username is already exist");
  }

  // Get file paths
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");
  if (!coverLocalPath) throw new ApiError(400, "Cover image is required");

  // Upload avatar
  const uploadedAvatar = await uploadOnClodianry(avatarLocalPath);
  if (!uploadedAvatar || !uploadedAvatar.url) {
    throw new ApiError(500, "Failed to upload avatar to Cloudinary");
  }

  // Upload cover image
  const uploadedCover = await uploadOnClodianry(coverLocalPath);
  if (!uploadedCover || !uploadedCover.url) {
    throw new ApiError(500, "Failed to upload cover image to Cloudinary");
  }

  try {
    const user = await User.create({
      fullname,
      avatar: uploadedAvatar.url,
      coverImage: uploadedCover.url,
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wring while regitering the user");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    console.error("User creation failed:", error.message);
    console.error(error);


    throw new ApiError(
      500,
      "Something went wrong while registering a user and images were deleted"
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  //get the data from body
  const { email, username, password } = req.body;

  //validation
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //valiadte the pasword whre the user sends and password in db
  const isPasswordValid = await user.isPasswordCorrect (password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password"
  );

  if (!loggedInUser) {
    throw new ApiError("User not loggedin");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "user logged in successfully"));
});

const refreshAccssToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token/expire");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accesToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Acces token refreshed successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Something went wrong");
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});




const changeCurrentPassword = asyncHandler(async (req,res)=>{
   const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)

   const isPasswordvalid = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordvalid){
    throw new ApiError(401, "Old password is incorrect")
   }
   user.password = newPassword;
   await user.save({validateBeforeSave : false})
   return res.status(200).json(new ApiResponse(200, {}, "Password changed succesfully"))
})


const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200).json(new ApiResponse(200, req.user, "Current user details"))
})


const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname, email} = req.body;

    if(!fullname){
      throw new ApiError(400, "Fullname is required")
    }

    if(!email){
      throw new ApiError(400, "email is required")
    }


    const userUpdated = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set : {
          fullname,
          email : email
        }
      },
      {new : true}
    ).select("-password -refreshToken")


    return res.status(200).json(new ApiResponse(200, userUpdated, "Account details updated successfully"));

})


const updateUserAvatar = asyncHandler(async (req,res)=>{
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new ApiError(400,"File is required")
  }

   const avatar = await uploadOnClodianry(avatarLocalPath)

   if(!avatar.url){
    throw new ApiError(500, "Something went wrong while uploading avatar")
   }

   const userAvatarUpdate = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {
      new : true
    }
   ).select("-password -refreshToken")

   return res
  .status(200)
  .json(new ApiResponse(200, userAvatarUpdate, "Avatar updated successfully"));

})


const updateUserCoverImage = asyncHandler(async (req,res)=>{
const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new ApiError(400,"File is required")
  }

   const coverImage = await uploadOnClodianry(coverImageLocalPath)

   if(!coverImage.url){
    throw new ApiError(500, "Something went wrong while uploading avatar")
   }

   const userCoverUpdate = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },
    {
      new : true
    }
   ).select("-password -refreshToken")

   res.status(200).json(new ApiResponse(200,userCoverUpdate, "CoverImage updated successfully"))
})

const getUserchannelProfile = asyncHandler( async (req,res) => {
    const {username} = req.params

    if(!username?.trim()){
      throw new ApiError(400, 'username is required')
    }


    //collect all the channels who are subsriber to the specific user
   const channel = await User.aggregate([
  {
    $match: {
      $expr: {
        $eq: [{ $toLower: "$username" }, username.toLowerCase()]
      }
    }
  },
  {
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"
    }
  },
  {
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "subscriber",
      as: "subscriberedTo"
    }
  },
  {
    $addFields: {
      subscriberCount: { $size: "$subscribers" },
      channelSubscribedToCount: { $size: "$subscriberedTo" },
      isSubscribed: {
        $cond: {
          if: {
            $in: [
              { $toObjectId: req.user._id.toString() },
              {
                $map: {
                  input: "$subscribers",
                  as: "sub",
                  in: "$$sub.subscriber"
                }
              }
            ]
          },
          then: true,
          else: false
        }
      }
    }
  },
  {
    $project: {
      fullname: 1,
      username: 1,
      avatar: 1,
      subscriberCount: 1,
      channelSubscribedToCount: 1,
      isSubscribed: 1,
      coverImage: 1,
      email: 1
    }
  }
]);
    console.log('Channel', channel);

    if(!channel.length){
      throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json( new ApiResponse(200, channel[0], "Channel profile fetched succesfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner", // optional, if you want single object instead of array
          },
        ],
      },
    },
  ]);

  console.log("WatchHistory", user);

  if (!user.length) {
    throw new ApiError(404, "Watch history not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully"
      )
    );
});


export { registerUser, loginUser, refreshAccssToken, logoutUser, changeCurrentPassword,updateUserCoverImage,updateUserAvatar,getCurrentUser,updateAccountDetails,getUserchannelProfile,getWatchHistory};
