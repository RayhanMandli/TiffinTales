const Meal = require("../models/Meal");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// Simple in-memory cache for nearby queries (per rounded coordinate bucket)
// Keyed by "lat,lng,radius,mealType" → { data, expiresAt }
const nearbyCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getNearbyKey(lat, lng, radius, mealType) {
  const rLat = parseFloat(lat).toFixed(3);
  const rLng = parseFloat(lng).toFixed(3);
  return `${rLat},${rLng},${radius},${mealType || "all"}`;
}

// Emit a menu:updated socket event to all clients watching this meal/provider room
function emitMenuUpdate(req, meal) {
  const io = req.app.get("io");
  if (!io) return;
  io.to(`meal:${meal._id}`).emit("menu:updated", meal);
  io.to(`provider:${meal.provider}`).emit("menu:updated", meal);

  // Invalidate nearby cache entries that might contain this meal
  for (const key of nearbyCache.keys()) {
    nearbyCache.delete(key);
  }
}

// @desc    Get all meals (public browsing)
// @route   GET /api/meals
// @access  Public
exports.getAllMeals = asyncHandler(async (req, res, next) => {
  const { mealType, availability, search } = req.query;

  const filter = {};
  if (mealType) filter.mealType = mealType;
  if (availability !== undefined) filter.availability = availability === "true";
  if (search) filter.$text = { $search: search };

  const meals = await Meal.find(filter)
    .populate("provider", "name email profilePhoto")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: meals.length,
    data: meals,
  });
});

// @desc    Get tiffins near a location (distance-based, closest first)
// @route   GET /api/meals/nearby?lat=&lng=&radius=&mealType=
// @access  Public
exports.getNearbyMeals = asyncHandler(async (req, res, next) => {
  const { lat, lng, mealType } = req.query;
  let { radius } = req.query;

  if (!lat || !lng) {
    return next(new ErrorResponse("Please provide lat and lng query parameters", 400));
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  radius = parseInt(radius) || 5000; // default 5km in meters

  // Check 30-second cache first
  const cacheKey = getNearbyKey(lat, lng, radius, mealType);
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(200).json({
      success: true,
      fromCache: true,
      count: cached.data.length,
      data: cached.data,
    });
  }

  const matchFilter = { availability: true };
  if (mealType) matchFilter.mealType = mealType;

  let meals = await runGeoNear(longitude, latitude, radius, matchFilter);

  // If no results within initial radius, auto-expand to 15km once
  if (meals.length === 0 && radius < 15000) {
    meals = await runGeoNear(longitude, latitude, 15000, matchFilter);
  }

  // Store in cache
  nearbyCache.set(cacheKey, { data: meals, expiresAt: Date.now() + CACHE_TTL_MS });

  res.status(200).json({
    success: true,
    count: meals.length,
    expanded: meals.length > 0 && radius < 15000,
    message: meals.length === 0
      ? "No tiffin providers found nearby. Try a wider area."
      : undefined,
    data: meals,
  });
});

async function runGeoNear(longitude, latitude, maxDistance, matchFilter) {
  return Meal.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        maxDistance,
        spherical: true,
        query: matchFilter,
      },
    },
    { $sort: { distance: 1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: "users",
        localField: "provider",
        foreignField: "_id",
        as: "providerInfo",
      },
    },
    { $unwind: "$providerInfo" },
    {
      $addFields: {
        "provider": {
          _id: "$providerInfo._id",
          name: "$providerInfo.name",
          email: "$providerInfo.email",
          profilePhoto: "$providerInfo.profilePhoto",
        },
      },
    },
    { $project: { providerInfo: 0 } },
  ]);
}

// @desc    Get meals for the authenticated provider (fix for the filter bug)
// @route   GET /api/meals/provider
// @access  Private/Provider
exports.getProviderMeals = asyncHandler(async (req, res, next) => {
  const meals = await Meal.find({ provider: req.user.id })
    .populate("provider", "name email profilePhoto")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: meals.length,
    data: meals,
  });
});

// @desc    Get single meal
// @route   GET /api/meals/:id
// @access  Public
exports.getMealById = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id).populate(
    "provider",
    "name email profilePhoto"
  );
  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    success: true,
    data: meal,
  });
});

// @desc    Create new tiffin menu
// @route   POST /api/meals
// @access  Private/Provider
exports.createMeal = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;
  req.body.provider = req.user.id;

  // Map mealType → category for backward compat
  if (req.body.mealType && !req.body.category) {
    req.body.category = req.body.mealType;
  }

  // Parse JSON fields sent as strings in multipart form
  if (typeof req.body.items === "string") {
    try { req.body.items = JSON.parse(req.body.items); } catch (_) { req.body.items = []; }
  }
  if (typeof req.body.availableExtras === "string") {
    try { req.body.availableExtras = JSON.parse(req.body.availableExtras); } catch (_) { req.body.availableExtras = []; }
  }

  // Denormalize provider location for geospatial queries
  const provider = await User.findById(req.user.id).select("location");
  if (provider?.location?.coordinates) {
    req.body.providerLocation = provider.location;
  }

  const meal = await Meal.create(req.body);
  await meal.populate("provider", "name email profilePhoto");

  // Notify connected clients
  emitMenuUpdate(req, meal);

  res.status(201).json({
    success: true,
    data: meal,
  });
});

// @desc    Update tiffin menu
// @route   PUT /api/meals/:id
// @access  Private/Provider
exports.updateMeal = asyncHandler(async (req, res, next) => {
  let meal = await Meal.findById(req.params.id);
  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  if (meal.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this meal`,
        401
      )
    );
  }

  // Parse JSON string fields from multipart forms
  if (typeof req.body.items === "string") {
    try { req.body.items = JSON.parse(req.body.items); } catch (_) { req.body.items = undefined; }
  }
  if (typeof req.body.availableExtras === "string") {
    try { req.body.availableExtras = JSON.parse(req.body.availableExtras); } catch (_) { req.body.availableExtras = undefined; }
  }

  // Keep category in sync with mealType
  if (req.body.mealType) {
    req.body.category = req.body.mealType;
  }

  req.body.updatedAt = Date.now();

  meal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("provider", "name email profilePhoto");

  // Push real-time update to all watching clients
  emitMenuUpdate(req, meal);

  res.status(200).json({
    success: true,
    data: meal,
  });
});

// @desc    Delete meal
// @route   DELETE /api/meals/:id
// @access  Private/Provider
exports.deleteMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  if (meal.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this meal`,
        401
      )
    );
  }

  await Meal.findByIdAndDelete(req.params.id);

  // Notify clients that this meal was removed
  const io = req.app.get("io");
  if (io) {
    io.to(`meal:${req.params.id}`).emit("meal:deleted", { mealId: req.params.id });
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Upload meal photo
// @route   PUT /api/meals/:id/photo
// @access  Private/Provider
exports.uploadMealPhoto = asyncHandler(async (req, res, next) => {
  if (!req.body.photo) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  const meal = await Meal.findById(req.params.id);
  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  if (meal.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this meal`,
        401
      )
    );
  }

  const updatedMeal = await Meal.findByIdAndUpdate(
    req.params.id,
    { photo: req.body.photo, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).populate("provider", "name email profilePhoto");

  emitMenuUpdate(req, updatedMeal);

  res.status(200).json({
    success: true,
    data: updatedMeal,
  });
});
