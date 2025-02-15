const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
// ✅ Add food items to the logged-in user's stored list
router.post("/add_items", authenticate, async (req, res) => {
  try {
    const { items, expiry_dates } = req.body;

    if (!items || !expiry_dates || items.length !== expiry_dates.length) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add new items to the user's stored food list
    items.forEach((item, index) => {
      user.items.push(item);
      user.expiryDates.push(expiry_dates[index]);
    });

    await user.save();
    
    res.json({ success: true, message: "Items added successfully" });

  } catch (error) {
    console.error("Error adding items:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get stored food items for the logged-in user
router.get("/get_items", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("items expiryDates");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "User items retrieved successfully",
      items: user.items || [],
      expiry_dates: user.expiryDates || [],
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Generate dish suggestions based on stored food items
router.get("/suggest_dishes", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔥 Replace this with AI Model Logic Later
    const suggestions = user.items.map((item) => `${item} Dish`);

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
