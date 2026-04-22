const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: "mandli@gmail.com",
    });

    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log("Admin user already exists with correct role!");
        console.log("Admin details:", {
          name: existingAdmin.name,
          email: existingAdmin.email,
          role: existingAdmin.role,
        });
        process.exit(0);
      } else {
        console.log("User exists but with wrong role. Updating to admin...");
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log("User role updated to admin successfully!");
        console.log("Admin details:", {
          name: existingAdmin.name,
          email: existingAdmin.email,
          role: existingAdmin.role,
        });
        process.exit(0);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: "mandli@gmail.com",
      password: hashedPassword,
      role: "admin",
      phone: "9999999999",
      address: "Admin Office, MealMate HQ",
    });

    console.log("Admin user created successfully!");
    console.log("Admin details:", {
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      id: adminUser._id,
    });

    console.log("\nLogin credentials:");
    console.log("Email: mandli@gmail.com");
    console.log("Password: 123456");
  } catch (error) {
    console.error("Error creating admin user:", error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  }
};

// Run the script
createAdminUser();
