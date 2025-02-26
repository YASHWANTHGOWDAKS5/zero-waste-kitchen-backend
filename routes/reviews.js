const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Review Schema
const ReviewSchema = new mongoose.Schema({
  name: String,  // New field for user name
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
    const { name, text } = req.body;
    
    if (!name || !text) {
      return res.status(400).json({ error: "Name and review text are required" });
    }

    const newReview = new Review({ name, text });
    await newReview.save();
    res.json(newReview);
  } catch (error) {
    res.status(500).json({ error: "Failed to add review" });
  }
});

module.exports = router;
