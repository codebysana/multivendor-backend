const app = require("../app");
const connectToDB = require("../db/database");
const cloudinary = require("cloudinary");

let initialized = false;

async function initializeOnce() {
  if (initialized) return;

  // connect to DB (returns a promise now)
  if (process.env.DB_URI) {
    try {
      await connectToDB();
    } catch (err) {
      console.error("DB connection error:", err);
      throw err;
    }
  } else {
    console.warn("DB_URI not set — skipping DB connection (set in Vercel env).");
  }

  // configure cloudinary if keys are present
  if (process.env.CLOUDINARY_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  initialized = true;
}

module.exports = async (req, res) => {
  try {
    await initializeOnce();
    return app(req, res);
  } catch (err) {
    console.error("Serverless handler error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
};
