const app = require("./app");
const connectToDB = require("./db/database");
const cloudinary = require("cloudinary");

// handling uncaught exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server for handling uncaught exception`);
});

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// connect db
connectToDB();

// cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// create server
const server = app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`Shutting down th server for unhandled promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});

// // tR40PvsVjst42p3J

// const app = require("./app");
// const connectToDB = require("./db/database");
// const cloudinary = require("cloudinary");

// process.on("uncaughtException", (err) => {
//   console.log(`Error: ${err.message}`);
//   console.log(`Shutting down the server for handling uncaught exception`);
//   process.exit(1);
// });

// if (process.env.NODE_ENV !== "PRODUCTION") {
//   require("dotenv").config({ path: "config/.env" });
// }

// // connect db & start server only after success
// const startServer = async () => {
//   await connectToDB();

//   cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//   });

//   const server = app.listen(process.env.PORT || 8000, () => {
//     console.log(`Server is running on http://localhost:${process.env.PORT}`);
//   });

//   process.on("unhandledRejection", (err) => {
//     console.log(`Shutting down the server for ${err.message}`);
//     server.close(() => process.exit(1));
//   });
// };

// startServer();
