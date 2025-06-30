import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary URL
      required: true,
    },
    coverImage: {
      type: String,
      required: false,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // corrected key + method
  this.password = await bcrypt.hash(this.password, 10); // await added
  next();
});

//Checking the whaether the password (what user sends) is equal too the password in the DB
userSchema.methods.isPasswordCorrect  = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccesToken = function(){
   return jwt.sign({
        _id : this._id,
        email : this.email,
        username : this.username,
        fullname : this.fullname
    },process.env.ACCES_TOKEN_SECRET,{expiresIn : process.env.ACCES_TOKEN_EXPIRY})
}
userSchema.methods.generateRefreshToken = function(){
   return jwt.sign({
        _id : this._id
    },process.env.REFRESH_TOKEN_SECRET,{expiresIn : process.env.REFRESH_TOKEN_EXPIRY})
}

//mongooes model will create th etable as User(always start with upper) using the schema provided
export const User = mongoose.model("User", userSchema);

//MangoDB will add the id by default with unique
