const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    const stripePayment = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "USD",
      metadata: {
        company: "OmniMart",
      },
    });
    res.status(200).json({
      success: true,
      client_secret: stripePayment.client_secret,
    });
  })
);

// stripe api key
router.get(
  "/stripe-api-key",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({ stripeApiKey: process.env.STRIPE_API_KEY });
  })
);

module.exports = router;
