const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const {
  isAuthenticated,
  isSellerAuthenticated,
  isAdmin,
} = require("../middleware/auth");
const ErrorHandler = require("../utils/errorHandler");
const Shop = require("../models/shopModel");
const cloudinary = require("cloudinary");
const sendShopToken = require("../utils/shopToken");

//create shop
router.post("/create-shop", async (req, res, next) => {
  try {
    const { shopName, email, password, avatar, address, phoneNumber, zipCode } =
      req.body;

    if (!shopName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      return next(new ErrorHandler("Seller already exists", 400));
    }

    const cloudinaryImage = await cloudinary.uploader.upload(avatar, {
      folder: "shopAvatars",
    });

    const seller = {
      shopName,
      email,
      password,
      avatar: {
        public_id: cloudinaryImage.public_id,
        url: cloudinaryImage.secure_url,
      },
      address,
      phoneNumber,
      zipCode,
    };

    const activationToken = createActivationToken(seller);
    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;
    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your shop",
        message: `Hello ${seller.shopName}, please click on the link to activate your shop: ${activationUrl}`,
      });

      return res.status(201).json({
        success: true,
        message: `Please check your email: ${seller.email} to activate your shop`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, { expiresIn: "1d" });
};

// activate shop
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activationToken } = req.body;

      if (!activationToken) {
        return res
          .status(400)
          .json({ success: false, message: "No activation token provided" });
      }

      const newSeller = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid Token", 400));
      }

      // const { shopName, email, password, avatar, zipCode, address, phoneNumber } =
      //   newSeller;

      let isSellerExists = await Shop.findOne({ email: newSeller.email });

      if (isSellerExists) {
        return next(new ErrorHandler("Seller already exists", 400));
      }
      const savedSeller = await Shop.create(newSeller);
      await savedSeller.save();

      console.log("✅ User saved:", savedSeller);
      sendShopToken(savedSeller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log("req.body:", req.body);
      if (!email || !password) {
        return next(new ErrorHandler("Please provide all the fields", 400));
      }
      const shop = await Shop.findOne({ email }).select("+password");

      if (!shop) {
        return next(new ErrorHandler("Shop doesn't exists", 400));
      }
      const isPasswordValid = await shop.comparePassword(password);
      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct password", 400)
        );
      }
      sendShopToken(shop, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/get-seller",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// logout shop

router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(200).json({
        success: true,
        message: "Logout Successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(200).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller)
        return res
          .status(404)
          .json({ success: false, message: "Seller not found" });

      if (seller.avatar?.public_id) {
        await cloudinary.uploader.destroy(seller.avatar.public_id);
      }

      const cloudinaryImage = await cloudinary.uploader.upload(
        req.body.avatar,
        {
          folder: "avatars",
          width: 150,
        }
      );

      seller.avatar = {
        public_id: cloudinaryImage.public_id,
        url: cloudinaryImage.secure_url,
      };

      await seller.save();
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { shopName, description, address, phoneNumber, zipCode } = req.body;
      const seller = await Shop.findById(req.seller._id);
      if (!seller) {
        return next(new ErrorHandler("Seller not found", 400));
      }

      seller.name = shopName;
      seller.description = description;
      seller.address = address;
      seller.zipCode = zipCode;
      seller.phoneNumber = phoneNumber;

      await seller.save();

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all sellers -- for admins
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete sellers -- admin
router.delete(
  "/admin-delete-seller/:id",
  isAuthenticated,
  isAdmin("admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);
      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      if (seller.avatar?.public_id) {
        await cloudinary.uploader.destroy(seller.avatar.public_id);
      }

      await Shop.findByIdAndDelete(req.seller.id);
      res.status(201).json({
        success: true,
        message: "Seller deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods -- sellers
router.put(
  "/update-payment-methods",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;
      const seller = await Shop.findByIdAndUpdate(
        req.seller._id,
        {
          withdrawMethod,
        },
        { new: true }
      );
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw methods -- only seller
router.delete(
  "/delete-withdraw-method/:id",
  isSellerAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);
      if (!seller) {
        return next(new ErrorHandler("seller not found with this id", 400));
      }
      seller.withdrawMethod = null;
      await seller.save();
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
