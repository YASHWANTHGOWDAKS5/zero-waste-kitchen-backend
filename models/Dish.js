const mongoose = require("mongoose");

const DishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ingredients: [{ type: String, required: true }] // ✅ Ensuring it’s always required
}, { collection: "dishes" });

module.exports = mongoose.model("Dish", DishSchema);
