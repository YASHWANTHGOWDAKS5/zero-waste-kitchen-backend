require("dotenv").config(); // ✅ Load .env variables
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const User = require("./models/User"); // ✅ Fix for user schema
const Dish = require("./models/Dish"); // ✅ Fix for Dish schema
const reviewRoutes = require("./routes/reviews");

const app = express();
const PORT = 5000;

// ✅ MongoDB Connection using .env variable
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Middleware
app.use(express.json());
app.use(cors());
app.use("/api/reviews", reviewRoutes);
// ✅ Auth Routes
app.use("/api/auth", authRoutes);

// ✅ Ingredient Schema & Model
const UserIngredients = mongoose.model("UserIngredients", new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    ingredients: [String],
    expiry_dates: [String]
}, { collection: "user_ingredients" }));

// ✅ Fetch Items for User
app.get("/api/getItems/:username", async (req, res) => {
    const username = decodeURIComponent(req.params.username);

    if (!username.trim()) {
        return res.status(400).json({ error: "Username is required" });
    }

    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            items: user.items || [],
            expiryDates: user.expiryDates || []
        });
    } catch (error) {
        console.error("❌ Error fetching items:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Fetch Items Expiring in 4 Days API
app.get("/api/getExpiringSoon/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fourDaysLater = new Date(today);
        fourDaysLater.setDate(today.getDate() + 4);

        if (!Array.isArray(user.expiryDates)) {
            return res.status(400).json({ message: "Invalid expiry dates data" });
        }

        const expiringSoonItems = user.items
            .map((item, index) => ({
                name: item,
                expiry: user.expiryDates[index] || "N/A",
            }))
            .filter((item) => {
                const expiryDate = new Date(item.expiry);
                return (
                    !isNaN(expiryDate) &&
                    expiryDate > today &&
                    expiryDate <= fourDaysLater
                );
            });

        res.json({ expiringSoonItems });
    } catch (error) {
        console.error("❌ Error fetching expiring soon items:", error);
        res.status(500).json({ message: "Error fetching expiring soon items" });
    }
});

// ✅ Fetch Expired Items API
app.get("/api/getExpiredItems/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!Array.isArray(user.expiryDates)) {
            return res.status(400).json({ message: "Invalid expiry dates data" });
        }

        const expiredItems = user.items
            .map((item, index) => ({
                name: item,
                expiry: user.expiryDates[index] || "N/A",
            }))
            .filter((item) => {
                const expiryDate = new Date(item.expiry);
                return !isNaN(expiryDate) && expiryDate < today;
            });

        res.json({ expiredItems });
    } catch (error) {
        console.error("❌ Error fetching expired items:", error);
        res.status(500).json({ message: "Error fetching expired items" });
    }
});

// ✅ Add Ingredients & Expiry Dates
app.post("/api/add_items", async (req, res) => {
    const { username, items, expiry_dates } = req.body;

    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.items = [...(user.items || []), ...items];
        user.expiryDates = [...(user.expiryDates || []), ...expiry_dates];

        await user.save();

        res.json({ message: "Items added successfully", user });
    } catch (err) {
        console.error("Error adding items:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Save Selected Dish in User Database
app.post("/api/saveSelectedDish", async (req, res) => {
    const { username, dish } = req.body;

    if (!username || !dish) {
        return res.status(400).json({ message: "Username and dish are required." });
    }

    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Add the selected dish to the user's items and expiryDates
        user.items = [...(user.items || []), dish.name];
        user.expiryDates = [...(user.expiryDates || []), dish.expiryDate || "N/A"];

        await user.save();

        res.status(200).json({ message: "Dish added successfully!", user });
    } catch (error) {
        console.error("❌ Error saving selected dish:", error);
        res.status(500).json({ message: "Internal server error while saving selected dish." });
    }
});

// ✅ Fetch Dish Suggestions for User
app.get("/api/suggest_dishes/:username", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.username });

        if (!user || !user.items || user.items.length === 0) {
            return res.status(404).json({ message: "No ingredients found for this user" });
        }

        const itemsWithExpiry = user.items.map((item, index) => ({
            name: item,
            expiryDate: new Date(user.expiryDates[index])
        }));

        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(today.getDate() + 20);

        const validItems = itemsWithExpiry
            .filter(item => item.expiryDate <= thresholdDate)
            .map(item => item.name);

        if (validItems.length === 0) {
            return res.status(404).json({ message: "No ingredients expiring within 20 days." });
        }

        const suggestedDishes = await getDishSuggestions(validItems);

        if (!suggestedDishes || suggestedDishes.length === 0) {
            return res.status(404).json({ message: "No dish suggestions available for expiring items." });
        }

        res.json({ dishes: suggestedDishes });
    } catch (error) {
        console.error("❌ Error suggesting dishes:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 🟢 Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
