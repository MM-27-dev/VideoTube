import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnClodianry,
} from "../utils/cloudinary.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { use } from "react";
import jwt from "jsonwebtoken";
const generateAccesAndRefreshToken = async (userId) => {
  try {
    const user = User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User Not found by ID");
    }
    const accessToken = user.generateAccesToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.schemaLevelProjections({ validateBeforeSave: false });
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

  // const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverLocalPath = req.files?.coverImage?.[0]?.path;

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file is missing");
  // }

  // const uploadedAvatar = await uploadOnClodianry(avatarLocalPath);
  // if (!uploadedAvatar || !uploadedAvatar.url) {
  //   throw new ApiError(500, "Failed to upload avatar to Cloudinary");
  // }

  // let coverImage =" ";
  // let uploadedCover;
  // if (coverLocalPath) {
  //   const uploadedCover = await uploadOnClodianry(coverLocalPath);
  //   if (uploadedCover && uploadedCover.url) {
  //     coverImage = uploadedCover.url;
  //   }
  // }

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

    // if (uploadedAvatar?.public_id) {
    //   await deleteFromCloudinary(uploadedAvatar.public_id);
    // }

    // if (uploadedCover?.public_id) {
    //   await deleteFromCloudinary(uploadedCover.public_id);
    // }

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
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccesAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
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
    req.cookies.refreshToken || req.body.refreshAccssToken;

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
      await generateAccesAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accesRoken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Acces token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Something went wrong");
  }
});

const logoutUser = asyncHandler(async (res, req) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
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

export { registerUser, loginUser, refreshAccssToken, logoutUser };
