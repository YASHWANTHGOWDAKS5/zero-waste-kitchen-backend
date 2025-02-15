const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    items: { type: [String], default: [] }, // Ensure 'items' is an array of strings
    expiryDates: { type: [String], default: [] }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
