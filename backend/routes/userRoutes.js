const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
const { uploadUserPhoto } = require("../middleware/fileUpload");
const { roles } = require("../config/config");

// Admin only routes
router.get("/", protect, authorize(roles.ADMIN), userController.getAllUsers);
router.delete(
  "/:id",
  protect,
  authorize(roles.ADMIN),
  userController.deleteUser
);

// Location update — must be before /:id to avoid param conflict
router.put("/location", protect, userController.updateLocation);

// Protected routes
router.get("/:id", protect, userController.getUserById);
router.put("/:id", protect, userController.updateUser);

// Profile photo upload route
router.put(
  "/:id/profile-photo",
  protect,
  uploadUserPhoto,
  userController.updateProfilePhoto
);

module.exports = router;
