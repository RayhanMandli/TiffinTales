const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["customer", "provider", "admin"],
    default: "customer",
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    match: [/^\d{10}$/, "Please provide a valid 10-digit phone number"],
  },
  address: {
    type: String,
    required: [true, "Delivery address is required"],
    trim: true,
  },
  profilePhoto: {
    type: String,
    default:
      "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
  },
  // GeoJSON Point — used for providers to enable nearby-tiffin queries
  // Coordinates are [longitude, latitude] (GeoJSON spec)
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: [0, 0],
    },
  },
});

// 2dsphere index enables $geoNear and $near queries on provider locations
UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", UserSchema);
