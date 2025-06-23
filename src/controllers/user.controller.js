import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnClodianry } from "../utils/cloudinary.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

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

export { registerUser };
