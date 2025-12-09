const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const router = express.Router();
const Message = require("../models/messageModel");
const cloudinary = require("cloudinary");

// create new message
router.post(
  "/create-new-message",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sender, text, conversationId, images } = req.body;
      let imageData;

      if (images) {
        const uploaded = await cloudinary.uploader.upload(images, {
          folder: "messages",
        });

        imageData = {
          public_id: uploaded.public_id,
          url: uploaded.secure_url,
        };
      }

      const message = new Message({
        conversationId,
        text: text || undefined,
        sender,
        images: imageData || undefined,
      });
      await message.save();

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      return next(new ErrorHandler(error.response.message, 500));
    }
  })
);

// get all messages with conversation id
router.get(
  "/get-all-messages/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await Message.find({
        conversationId: req.params.id,
      }).sort({ createdAt: 1 });
      res.status(201).json({
        success: true,
        messages,
      });
    } catch (error) {
      return next(new ErrorHandler(error.response.message, 500));
    }
  })
);

module.exports = router;
