require("dotenv").config(); // ✅ Load .env variables
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const User = require("./models/User"); // ✅ Fix for user schema
const Dish = require("./models/Dish"); // ✅ Fix for Dish schema

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

// ✅ Auth Routes
app.use("/api/auth", authRoutes);

// ✅ Ingredient Schema & Model
const UserIngredients = mongoose.model("UserIngredients", new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    ingredients: [String],
    expiry_dates: [String]
}, { collection: "user_ingredients" }));

// 🟢 Fetch Ingredients & Expiry Dates
app.get("/api/getItems/:username", async (req, res) => {
    const { username } = req.params;

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

// 🟢 Add Ingredients & Expiry Dates
app.post("/api/add_items", async (req, res) => {
    const { username, items, expiry_dates } = req.body;
  
    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Add items & expiryDates to the user's document
        user.items = [...(user.items || []), ...items];
        user.expiryDates = [...(user.expiryDates || []), ...expiry_dates];

        await user.save();

        res.json({ message: "Items added successfully", user });
    } catch (err) {
        console.error("Error adding items:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 🟢 Delete an Ingredient (Fixed Syncing Expiry Dates)
app.delete("/api/delete_item", async (req, res) => {
    const { username, item } = req.body;
    if (!username || !item) {
        return res.status(400).json({ message: "Username and item are required" });
    }
    try {
        const userData = await UserIngredients.findOne({ user_id: username });
        if (!userData) {
            return res.status(404).json({ message: "User data not found" });
        }
        const indexToRemove = userData.ingredients.indexOf(item);
        if (indexToRemove !== -1) {
            userData.ingredients.splice(indexToRemove, 1);
            userData.expiry_dates.splice(indexToRemove, 1);
        }
        await userData.save();
        res.json({ message: "✅ Item deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting item:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ AI-Based Dish Suggestion Logic
const getDishSuggestions = async (userItems) => {
    try {
        const allDishes = await Dish.find({});
        let suggestedDishes = [];

        userItems.forEach((item) => {
            let matchedDishes = allDishes
                .filter(dish => dish.ingredients.includes(item)) // Find dishes containing the item
                .slice(0, 4); // Limit to 4 dishes per item

            matchedDishes.forEach((dish) => {
                suggestedDishes.push({
                    name: dish.name,
                    ingredients: dish.ingredients,
                    suggested_due_to: [item],
                    youtube_url: `https://www.youtube.com/results?search_query=${dish.name.replace(" ", "+")}+recipe`
                });
            });
        });

        return Array.from(new Set(suggestedDishes)); // 🔥 FIX: Remove duplicate dishes
    } catch (error) {
        console.error("❌ Error in getDishSuggestions:", error);
        return [];
    }
};

// 🟢 Fetch Dish Suggestions for Logged-in User
app.get("/api/suggest_dishes/:username", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.username });

        if (!user || !user.items || user.items.length === 0) {
            return res.status(404).json({ message: "No ingredients found for this user" });
        }

        // 🔥 Pass ONLY the logged-in user's items to the function
        const suggestedDishes = await getDishSuggestions(user.items);

        if (suggestedDishes.length === 0) {
            return res.status(404).json({ message: "No dish suggestions available" });
        }

        res.json({ dishes: suggestedDishes });
    } catch (error) {
        console.error("❌ Error suggesting dishes:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ Fetch Authenticated User
app.get("/api/auth/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ user });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// 🟢 Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
