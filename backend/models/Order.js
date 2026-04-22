const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrderSchema = new Schema(
  {
    meal: {
      type: mongoose.Schema.ObjectId,
      ref: "Meal",
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"],
      default: "pending",
    },
    quantity: {
      type: Number,
      required: [true, "Please add a quantity"],
      min: [1, "Quantity must be at least 1"],
    },
    // Extra add-ons the customer selected (e.g., +2 rotis, +papad)
    extraItems: {
      type: [
        {
          name: { type: String, required: true },
          pricePerUnit: { type: Number, required: true, min: 0 },
          quantity: { type: Number, required: true, min: 1 },
          _id: false,
        },
      ],
      default: [],
    },
    // Computed total: (meal.price × quantity) + sum(extras)
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAddress: {
      type: String,
      required: [true, "Please add a delivery address"],
    },
    deliveryDate: {
      type: Date,
      required: [true, "Please add a delivery date"],
    },
    specialInstructions: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Index for fast provider and user lookups
OrderSchema.index({ provider: 1, status: 1 });
OrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
