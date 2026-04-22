const Order = require("../models/Order");
const Meal = require("../models/Meal");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// @desc    Get all orders for current user (role-aware)
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = asyncHandler(async (req, res, next) => {
  const populateFields = [
    { path: "meal", select: "name price description mealType items photo" },
  ];

  if (req.user.role === "customer") {
    const orders = await Order.find({ user: req.user.id })
      .populate(populateFields)
      .populate("provider", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  }

  if (req.user.role === "provider") {
    const orders = await Order.find({ provider: req.user.id })
      .populate(populateFields)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  }

  // Admin: all orders
  const orders = await Order.find()
    .populate(populateFields)
    .populate("user", "name email")
    .populate("provider", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("meal", "name price description mealType items photo")
    .populate("user", "name email phone")
    .populate("provider", "name");

  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  if (
    order.user._id.toString() !== req.user.id &&
    order.provider._id.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this order`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Create new order (with extra items support)
// @route   POST /api/orders
// @access  Private/Customer
exports.createOrder = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;

  const meal = await Meal.findById(req.body.meal);
  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.body.meal}`, 404)
    );
  }

  if (!meal.availability) {
    return next(new ErrorResponse("This tiffin is currently unavailable", 400));
  }

  req.body.provider = meal.provider;
  req.body.status = "pending";

  // Validate and compute extras cost
  const extraItems = Array.isArray(req.body.extraItems) ? req.body.extraItems : [];
  let extrasTotal = 0;

  for (const extra of extraItems) {
    // Validate extra exists on the meal
    const validExtra = meal.availableExtras.find((e) => e.name === extra.name);
    if (!validExtra) {
      return next(
        new ErrorResponse(`Extra item "${extra.name}" is not available for this tiffin`, 400)
      );
    }
    if (extra.quantity > validExtra.maxQuantity) {
      return next(
        new ErrorResponse(
          `Maximum ${validExtra.maxQuantity} of "${extra.name}" allowed`,
          400
        )
      );
    }
    extra.pricePerUnit = validExtra.price;
    extrasTotal += validExtra.price * extra.quantity;
  }

  // Compute and store the definitive total price
  const quantity = parseInt(req.body.quantity) || 1;
  req.body.extraItems = extraItems;
  req.body.totalPrice = meal.price * quantity + extrasTotal;

  const order = await Order.create(req.body);

  // Real-time: notify the provider of the new order
  const io = req.app.get("io");
  if (io) {
    io.to(`provider:${meal.provider}`).emit("order:new", {
      order,
      message: `New order from customer for ${meal.name}`,
    });
  }

  res.status(201).json({
    success: true,
    data: order,
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  let order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  if (
    order.provider.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this order`,
        401
      )
    );
  }

  const validStatuses = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];
  if (!validStatuses.includes(req.body.status)) {
    return next(
      new ErrorResponse(`Invalid status value: ${req.body.status}`, 400)
    );
  }

  order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  )
    .populate("meal", "name price mealType")
    .populate("user", "name email")
    .populate("provider", "name");

  // Real-time: notify the customer that their order status changed
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${order.user._id}`).emit("order:updated", {
      orderId: order._id,
      status: order.status,
      mealName: order.meal.name,
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  if (
    order.user.toString() !== req.user.id &&
    order.provider.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to cancel this order`,
        401
      )
    );
  }

  if (!["pending", "confirmed"].includes(order.status)) {
    return next(
      new ErrorResponse(
        `Order cannot be cancelled in "${order.status}" status`,
        400
      )
    );
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { status: "cancelled" },
    { new: true }
  );

  // Notify the other party
  const io = req.app.get("io");
  if (io) {
    io.to(`provider:${order.provider}`).emit("order:cancelled", {
      orderId: order._id,
    });
    io.to(`user:${order.user}`).emit("order:cancelled", {
      orderId: order._id,
    });
  }

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });
});
