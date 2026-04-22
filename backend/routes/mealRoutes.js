const express = require("express");
const router = express.Router();
const mealController = require("../controllers/mealController");
const { protect, authorize } = require("../middleware/auth");
const { uploadMealPhoto } = require("../middleware/fileUpload");
const { roles } = require("../config/config");
const reviewRouter = require("./reviewRoutes");

// Re-route nested review routes
router.use("/:mealId/reviews", reviewRouter);

// ── Public routes ──────────────────────────────────────────────────────────────

// Nearby tiffins — MUST be declared before /:id so "nearby" isn't treated as an ID
router.get("/nearby", mealController.getNearbyMeals);

router.get("/", mealController.getAllMeals);
router.get("/:id", mealController.getMealById);

// ── Protected routes (provider required) ───────────────────────────────────────

// Provider's own meals (server-side filter — fixes the client-side ObjectId bug)
router.get(
  "/provider/me",
  protect,
  authorize(roles.PROVIDER),
  mealController.getProviderMeals
);

router.post(
  "/",
  protect,
  authorize(roles.PROVIDER),
  uploadMealPhoto,
  mealController.createMeal
);

router.put(
  "/:id",
  protect,
  authorize(roles.PROVIDER, roles.ADMIN),
  uploadMealPhoto,
  mealController.updateMeal
);

router.delete(
  "/:id",
  protect,
  authorize(roles.PROVIDER, roles.ADMIN),
  mealController.deleteMeal
);

// Dedicated photo upload route
router.put(
  "/:id/photo",
  protect,
  authorize(roles.PROVIDER, roles.ADMIN),
  uploadMealPhoto,
  mealController.uploadMealPhoto
);

module.exports = router;
