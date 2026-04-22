const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Static files
app.use(express.static("public"));

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/meals", require("./routes/mealRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "TifinTales API", version: "2.0.0" });
});

// Global error handler
app.use(errorHandler);

// ── Socket.io Setup ───────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
  // Ping timeout / interval for detecting stale connections
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Attach io instance to app so controllers can access it via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client subscribes to updates for a specific meal
  // Used on the home page / meal detail page to receive live menu updates
  socket.on("join:meal", (mealId) => {
    if (mealId) socket.join(`meal:${mealId}`);
  });

  socket.on("leave:meal", (mealId) => {
    if (mealId) socket.leave(`meal:${mealId}`);
  });

  // Provider subscribes to their own room to receive new order notifications
  socket.on("join:provider", (providerId) => {
    if (providerId) socket.join(`provider:${providerId}`);
  });

  // Customer subscribes to their user room for order status updates
  socket.on("join:user", (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
  });
});

// ── Start Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Socket.io ready for real-time connections`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});
