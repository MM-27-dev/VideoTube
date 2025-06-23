import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Saving to ./public/temp", file.fieldname);
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    console.log("Incoming file:", file.originalname); 
    cb(null, file.originalname);
  },
});

export const upload = multer({  storage });