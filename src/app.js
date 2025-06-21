import express from "express";
import cors from "cors";

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

//import routes
import healathcheckRouter from "./routes/healthcheck.route.js"

//route
app.use('/api/v1/healthcheck', healathcheckRouter)
export { app };
