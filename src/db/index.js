// //Main purpose is have the db conection
// import mongoose from "mongoose";
// import { DB_NAME } from "../constants.js";

// const connectDB = async () => {
//     try {
//       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//       console.log(`\n MongoDB connected DB host: ${connectionInstance.connection.host}`);
      
//     } catch (error) {
//         console.log("MongoDB Connection error", error);
//         process.exit(1)
        
//     }
// }

// export default connectDB;

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\nMongoDB connected: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection error:", error?.message);
    process.exit(1);
  }
};

export default connectDB;
