const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Sub-schema for individual tiffin components (roti, dal, rice, etc.)
const TiffinItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String, default: "1 serving" }, // "2 pcs", "1 bowl"
    isOptional: { type: Boolean, default: false },
  },
  { _id: false }
);

// Sub-schema for add-on extras (extra rotis, papad, etc.)
const ExtraItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    maxQuantity: { type: Number, default: 10 },
  },
  { _id: false }
);

const tiffinSchema = new Schema(
  {
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

    // Core identity
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    photo: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    availability: { type: Boolean, default: true },

    // Meal type — the primary classifier replacing generic "category"
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      required: true,
    },

    // Kept for backward compatibility with existing documents/frontend filters
    category: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack", "beverage"],
    },

    // The actual tiffin components (roti, sabzi, dal, rice, etc.)
    items: {
      type: [TiffinItemSchema],
      default: [],
    },

    // Optional add-ons customers can request when ordering
    availableExtras: {
      type: [ExtraItemSchema],
      default: [],
    },

    // Denormalized provider location for efficient geospatial queries
    // Updated whenever the provider saves their location
    providerLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);

// Update `updatedAt` on every save
tiffinSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Geospatial index — must exist before running $geoNear queries
tiffinSchema.index({ providerLocation: "2dsphere" });

// Composite index for provider dashboard and availability filtering
tiffinSchema.index({ provider: 1, availability: 1 });

// Text index for full-text search on name and description
tiffinSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Meal", tiffinSchema);
