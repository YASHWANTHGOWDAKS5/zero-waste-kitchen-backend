require("dotenv").config(); // Load environment variables
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Connect to MongoDB Atlas using .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Review Schema
const ReviewSchema = new mongoose.Schema({
  name: String,
  text: String,
  date: { type: Date, default: Date.now },
});

const Review = mongoose.model("Review", ReviewSchema);

// GET all reviews
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST a new review
router.post("/", async (req, res) => {
  try {
    const newReview = new Review({ name: req.body.name, text: req.body.text });
    await newReview.save();
    res.json(newReview);
  } catch (error) {
    res.status(500).json({ error: "Failed to add review" });
  }
});

module.exports = router;
