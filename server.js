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
    quantities: [String],
    expiry_dates: [String]
}, { collection: "user_ingredients" }));

// In your /api/getItems endpoint:
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
            expiryDates: user.expiryDates || [],
            quantities: user.quantities || [],
            units: user.units || []
        });
    } catch (error) {
        console.error("❌ Error fetching items:", error);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/api/auth/check-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // Check if email exists in the database
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`Email ${email} is already registered.`);
      return res.status(200).json({ exists: true, msg: "User already exists" });
    }

    console.log(`Email ${email} is not registered.`);
    return res.status(200).json({ exists: false, msg: "Email is available" });
  } catch (err) {
    console.error("Error checking email existence:", err.message);
    return res.status(500).json({ msg: "Internal server error" });
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

        // Fetch items expiring in the next 4 days
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

app.get("/api/ingredients", async (req, res) => {
    try {
        const dishes = await Dish.find({});
        const uniqueIngredients = new Set();

        dishes.forEach(dish => {
            if (dish.ingredients && Array.isArray(dish.ingredients)) {
                dish.ingredients.forEach(ingredient => uniqueIngredients.add(ingredient));
            }
        });

        res.json(Array.from(uniqueIngredients));
    } catch (error) {
        console.error("❌ Error fetching ingredients:", error);
        res.status(500).json({ message: "Internal Server Error" });
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

    // Check if expiryDates exists and is an array
    if (!Array.isArray(user.expiryDates)) {
      return res.status(400).json({ message: "Invalid expiry dates data" });
    }

    // Fetch expired items
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

// In your /api/add_items endpoint:
app.post("/api/add_items", async (req, res) => {
    const { username, items, expiry_dates, quantities, units } = req.body;
  
    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Add items & expiryDates to the user's document
        user.items = [...(user.items || []), ...items];
        user.expiryDates = [...(user.expiryDates || []), ...expiry_dates];
        user.quantities = [...(user.quantities || []), ...quantities];
        user.units = [...(user.units || []), ...units];

        await user.save();

        res.json({ message: "Items added successfully", user });
    } catch (err) {
        console.error("Error adding items:", err);
        res.status(500).json({ error: "Server error" });
    }
});


// 🟢 Update Item Expiry Date
app.put("/api/update_item", async (req, res) => {
    const { username, item, expiry_date, quantity, unit } = req.body;

    if (!username || !item || !expiry_date) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const itemIndex = user.items.indexOf(item);

        if (itemIndex === -1) {
            return res.status(404).json({ error: "Item not found." });
        }

        user.expiryDates[itemIndex] = expiry_date;
        if (quantity !== undefined) user.quantities[itemIndex] = quantity;
        if (unit !== undefined) user.units[itemIndex] = unit;

        await user.save();
        res.json({ message: "Item updated successfully.", user });
    } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({ error: "Server error." });
    }
});
app.delete("/api/delete_item", async (req, res) => {
  const { username, item } = req.query; // Get values from query parameters
  console.log("🔹 Received DELETE request:", { username, item });

  if (!username || !item) {
    console.log("❌ Missing username or item.");
    return res.status(400).json({ error: "Missing username or item." });
  }

  try {
    const user = await User.findOne({ name: username }).exec();
    if (!user || !user.items.includes(item)) {
      console.log("❌ User or item not found.");
      return res.status(404).json({ error: "User or item not found." });
    }

    const itemIndex = user.items.indexOf(item);
    user.items.splice(itemIndex, 1);
    user.expiryDates.splice(itemIndex, 1);

    await user.save();
    console.log("✅ Item deleted successfully.");
    res.json({ message: "Item deleted successfully." });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: "Server error." });
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
                .slice(0, 3); // Limit to 6 dishes per item

            matchedDishes.forEach((dish) => {
                suggestedDishes.push({
                    name: dish.name,
                    ingredients: dish.ingredients,
                    suggested_due_to: [item],  // 🔥 FIX: Store as an array, not a string
                    youtube_url: `https://www.youtube.com/results?search_query=${dish.name.replace(" ", "+")}+recipe`
                });
            });
        });

        return suggestedDishes;
    } catch (error) {
        console.error("NO Suggestions for your items try adding more", error);
        return [];
    }
};


// 🟢 Fetch Dish Suggestions for Logged-in User
app.get("/api/suggest_dishes/:username", async (req, res) => {
    try {
        // Fetch user data from MongoDB
        const user = await User.findOne({ name: req.params.username });

        if (!user || !user.items || user.items.length === 0) {
            return res.status(404).json({ message: "No ingredients found for this user" });
        }

        // ✅ Pair items with their expiry dates
        const itemsWithExpiry = user.items.map((item, index) => ({
            name: item,
            expiryDate: new Date(user.expiryDates[index]) // Convert expiry date to Date object
        }));

        // ✅ Filter items expiring within 20 days
        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(today.getDate() + 20);

        const validItems = itemsWithExpiry
            .filter(item => item.expiryDate <= thresholdDate)
            .map(item => item.name); // Extract only item names

        if (validItems.length === 0) {
            return res.status(404).json({ message: "No ingredients expiring within 20 days." });
        }

        // ✅ Fetch dish suggestions
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

// ✅ Fetch Authenticated User
app.get("/api/auth/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, "your-secret-key");
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ user });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
    }
});


app.post("/api/saveSelectedDish", async (req, res) => {
    const { username, dish } = req.body;

    if (!username || !dish) {
        console.log("❌ Missing username or dish in request payload.");
        return res.status(400).json({ message: "Username and dish are required." });
    }

    try {
        console.log(`🔹Saving dish for user: ${username}`);

        // Find the user and add the dish to the saved_dishes array
        const user = await User.findOneAndUpdate(
            { name: username }, // Find user by name
            { $push: { saved_dishes: dish } }, // Add the dish to saved_dishes
            { new: true } // Return the updated document
        );

        if (!user) {
            console.log("❌ User not found.");
            return res.status(404).json({ message: "User not found." });
        }

        console.log("✅ Dish saved successfully:", dish);
        res.json({ message: "Dish saved successfully.", saved_dishes: user.saved_dishes });
    } catch (error) {
        console.error("❌ Error saving dish:", error);

        // Return a detailed error response for debugging
        res.status(500).json({
            message: "Internal server error.",
            error: error.message || "Unknown error occurred."
        });
    }
});

// ✅ Endpoint to fetch saved dishes
app.get("/api/getUsageData/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ name: username });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ saved_dishes: user.saved_dishes });
    } catch (error) {
        console.error("Error fetching saved dishes:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// 🟢 Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
console.log("Checking getDishSuggestions function:", getDishSuggestions);
