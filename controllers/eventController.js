const express = require("express");
const Event = require("../models/eventModel");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const Shop = require("../models/shopModel");
const {
  isSellerAuthenticated,
  isAdmin,
  isAuthenticated,
} = require("../middleware/auth");
const { upload } = require("../multer");
const fs = require("fs");
const router = express.Router();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary");

// create event
router.post(
  "/create-event",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.seller;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Invalid Shop Id!", 400));
      }

      let images = [];
      if (typeof req.body.images === "string") {
        images.push(req.body.images);
      } else {
        images = req.body.images;
      }

      const imagesLinks = [];

      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.uploader.upload(images[i], {
          folder: "products",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }

      const eventData = {
        ...req.body,
        shopId: shop._id,
        shop: shop,
        images: imagesLinks,
      };

      const event = await Event.create(eventData);
      res.status(201).json({
        success: true,
        event,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all events
router.get("/get-all-events", async (req, res, next) => {
  try {
    const events = await Event.find();
    res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
});

// get all events of a shop
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find({ shopId: req.params.id });
      res.status(200).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete event of a shop
router.delete(
  "/delete-shop-event/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const eventId = req.params.id;
      // Validate ID
      if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
        return next(new ErrorHandler("Invalid or missing event ID", 404));
      }

      const eventData = await Event.findById(eventId);

      for (const img of event.images) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          console.warn(" Failed to delete image:", img.public_id);
        }
      }

      const event = await Event.findByIdAndDelete(eventId);

      if (!event) {
        return next(new ErrorHandler("Event not found with this id", 500));
      }

      res.status(200).json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all events -- admin
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find().sort({
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
