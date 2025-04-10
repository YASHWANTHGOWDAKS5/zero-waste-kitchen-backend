const mongoose = require("mongoose");

const DishSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ingredients: [String], // Array of ingredients
    youtube_url: { type: String }, // URL for the YouTube recipe
    dateSelected: { type: Date, default: Date.now } // Timestamp for when the dish was selected
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    items: { type: [String], default: [] }, // Array of items (ingredients)
    expiryDates: { type: [String], default: [] }, // Array of expiry dates as strings
    saved_dishes: { type: [DishSchema], default: [] } // Array of selected dishes using DishSchema
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
