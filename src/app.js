import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//common middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

//import routes
import healathcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middlerware.js";

//route
app.use('/api/v1/healthcheck', healathcheckRouter)
app.use("/api/v1/users", userRouter);
app.use(errorHandler)
export { app };
