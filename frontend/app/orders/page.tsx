"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    Clock,
    MapPin,
    Package,
    CheckCircle,
    XCircle,
    Truck,
    ChefHat,
    Calendar,
    DollarSign,
    Eye,
    RefreshCw,
    User,
    Phone,
    Mail,
    AlertCircle,
    TrendingUp,
    Filter,
} from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";

interface MealItem {
    name: string;
    quantity: string;
    isOptional: boolean;
}

interface ExtraItem {
    name: string;
    pricePerUnit: number;
    quantity: number;
}

// Backend returns user as object on chef side, string on customer side
// Backend returns provider as object on customer side, string on chef side
interface Order {
    _id: string;
    meal: {
        _id: string;
        name: string;
        description?: string;
        photo?: string;
        price: number;
        mealType?: string;
        category?: string;
        items?: MealItem[];
    };
    // Chef response: user is populated object; Customer response: user is string ID
    user:
        | { _id: string; name: string; email?: string; phone?: string }
        | string;
    // Customer response: provider is populated object; Chef response: provider is string ID
    provider: { _id: string; name: string } | string;
    status: string;
    quantity: number;
    totalPrice: number;
    extraItems: ExtraItem[];
    deliveryAddress: string;
    deliveryDate: string;
    specialInstructions?: string;
    createdAt: string;
}

// Helper: safely get user name/id from polymorphic user field
const getUserName = (user: Order["user"]) =>
    typeof user === "object" && user !== null ? user.name : "Unknown";
const getUserId = (user: Order["user"]) =>
    typeof user === "object" && user !== null ? user._id : (user as string);
const getUserEmail = (user: Order["user"]) =>
    typeof user === "object" && user !== null ? (user.email ?? null) : null;
const getUserPhone = (user: Order["user"]) =>
    typeof user === "object" && user !== null ? (user.phone ?? null) : null;

// Helper: safely get provider name/id from polymorphic provider field
const getProviderName = (provider: Order["provider"]) =>
    typeof provider === "object" && provider !== null
        ? provider.name
        : "Unknown";
const getProviderId = (provider: Order["provider"]) =>
    typeof provider === "object" && provider !== null
        ? provider._id
        : (provider as string);

const statusConfig = {
    pending: {
        icon: Clock,
        color: "bg-yellow-500",
        text: "Pending",
        description: "Waiting for confirmation",
    },
    confirmed: {
        icon: CheckCircle,
        color: "bg-blue-500",
        text: "Confirmed",
        description: "Order confirmed by chef",
    },
    preparing: {
        icon: ChefHat,
        color: "bg-purple-500",
        text: "Preparing",
        description: "Your meal is being prepared",
    },
    ready: {
        icon: Package,
        color: "bg-orange-500",
        text: "Ready",
        description: "Ready for pickup/delivery",
    },
    delivered: {
        icon: Truck,
        color: "bg-green-500",
        text: "Delivered",
        description: "Order completed",
    },
    cancelled: {
        icon: XCircle,
        color: "bg-red-500",
        text: "Cancelled",
        description: "Order cancelled",
    },
};

export default function OrdersPage() {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(
        new Set(),
    );
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("pending"); // Will be set properly in useEffect

    const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    useEffect(() => {
        if (user && token) {
            fetchOrders();
        }
    }, [user, token]);

    // Set initial tab based on user role
    useEffect(() => {
        if (user?.role === "provider") {
            setActiveTab("pending");
        } else {
            setActiveTab("active");
        }
    }, [user?.role]);

    // Remove auto-refresh - not needed for this implementation

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data.data);
                console.log(data.data);
            } else {
                throw new Error("Failed to fetch orders");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch orders. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdatingOrders((prev) => new Set(prev).add(orderId));

        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                // Update the order in local state immediately
                setOrders((prevOrders) =>
                    prevOrders.map((order) =>
                        order._id === orderId
                            ? { ...order, status: newStatus }
                            : order,
                    ),
                );

                toast({
                    title: "Order updated",
                    description: `Order status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.text || newStatus}.`,
                });

                // Auto-switch tabs for better UX
                if (user?.role === "provider") {
                    if (
                        newStatus === "confirmed" ||
                        newStatus === "preparing" ||
                        newStatus === "ready"
                    ) {
                        setActiveTab("active");
                    } else if (
                        newStatus === "delivered" ||
                        newStatus === "cancelled"
                    ) {
                        setActiveTab("completed");
                    }
                }

                // Don't call fetchOrders() to avoid page refresh and tab reset
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to update order");
            }
        } catch (error) {
            toast({
                title: "Update failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to update order status.",
                variant: "destructive",
            });
        } finally {
            setUpdatingOrders((prev) => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    };

    const cancelOrder = async (orderId: string) => {
        setUpdatingOrders((prev) => new Set(prev).add(orderId));

        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // Update the order status in local state
                setOrders((prevOrders) =>
                    prevOrders.map((order) =>
                        order._id === orderId
                            ? { ...order, status: "cancelled" }
                            : order,
                    ),
                );

                toast({
                    title: "Order cancelled",
                    description: "Your order has been cancelled successfully.",
                });

                // Auto-switch to history tab for customers
                if (user?.role === "customer") {
                    setActiveTab("history");
                }

                // Don't call fetchOrders() to avoid page refresh
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to cancel order");
            }
        } catch (error) {
            toast({
                title: "Cancellation failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to cancel order.",
                variant: "destructive",
            });
        } finally {
            setUpdatingOrders((prev) => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (filter === "all") return true;
        return order.status === filter;
    });

    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
    };

    const getStatusActions = (order: Order) => {
        const actions = [];
        const isUpdating = updatingOrders.has(order._id);

        if (
            user?.role === "provider" &&
            getProviderId(order.provider) === user._id
        ) {
            // Provider actions
            if (order.status === "pending") {
                actions.push(
                    <Button
                        key="confirm"
                        size="sm"
                        onClick={() =>
                            updateOrderStatus(order._id, "confirmed")
                        }
                        className="bg-blue-500 hover:bg-blue-600"
                        disabled={isUpdating}
                    >
                        {isUpdating ? "Updating..." : "Confirm"}
                    </Button>,
                );
            }
            if (order.status === "confirmed") {
                actions.push(
                    <Button
                        key="preparing"
                        size="sm"
                        onClick={() =>
                            updateOrderStatus(order._id, "preparing")
                        }
                        className="bg-purple-500 hover:bg-purple-600"
                        disabled={isUpdating}
                    >
                        {isUpdating ? "Updating..." : "Start Preparing"}
                    </Button>,
                );
            }
            if (order.status === "preparing") {
                actions.push(
                    <Button
                        key="ready"
                        size="sm"
                        onClick={() => updateOrderStatus(order._id, "ready")}
                        className="bg-orange-500 hover:bg-orange-600"
                        disabled={isUpdating}
                    >
                        {isUpdating ? "Updating..." : "Mark Ready"}
                    </Button>,
                );
            }
            if (order.status === "ready") {
                actions.push(
                    <Button
                        key="delivered"
                        size="sm"
                        onClick={() =>
                            updateOrderStatus(order._id, "delivered")
                        }
                        className="bg-green-500 hover:bg-green-600"
                        disabled={isUpdating}
                    >
                        {isUpdating ? "Updating..." : "Mark Delivered"}
                    </Button>,
                );
            }
        }

        // Customer actions
        if (user?.role === "customer" && getUserId(order.user) === user._id) {
            if (["pending", "confirmed"].includes(order.status)) {
                actions.push(
                    <Button
                        key="cancel"
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelOrder(order._id)}
                        disabled={isUpdating}
                    >
                        {isUpdating ? "Cancelling..." : "Cancel Order"}
                    </Button>,
                );
            }
        }

        return actions;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    // Chef Orders Interface
    function ChefOrdersInterface() {
        const pendingOrders = orders.filter(
            (order) => order.status === "pending",
        );
        const activeOrders = orders.filter((order) =>
            ["confirmed", "preparing", "ready"].includes(order.status),
        );
        const completedOrders = orders.filter((order) =>
            ["delivered", "cancelled"].includes(order.status),
        );

        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Chef Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                        <ChefHat className="w-8 h-8 text-orange-500" />
                                        Order Management
                                    </h1>
                                    <p className="text-gray-600">
                                        Manage incoming orders and track your
                                        business
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={fetchOrders}
                                    disabled={loading}
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                                    />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {/* Chef Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Pending Orders
                                            </p>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {pendingOrders.length}
                                            </p>
                                        </div>
                                        <AlertCircle className="w-8 h-8 text-yellow-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Active Orders
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {activeOrders.length}
                                            </p>
                                        </div>
                                        <Package className="w-8 h-8 text-blue-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Completed Today
                                            </p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {
                                                    completedOrders.filter(
                                                        (order) =>
                                                            new Date(
                                                                order.createdAt,
                                                            ).toDateString() ===
                                                            new Date().toDateString(),
                                                    ).length
                                                }
                                            </p>
                                        </div>
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Today's Revenue
                                            </p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                ₹
                                                {completedOrders
                                                    .filter(
                                                        (order) =>
                                                            new Date(
                                                                order.createdAt,
                                                            ).toDateString() ===
                                                                new Date().toDateString() &&
                                                            order.status ===
                                                                "delivered",
                                                    )
                                                    .reduce(
                                                        (sum, order) =>
                                                            sum +
                                                            (order.totalPrice ??
                                                                order.meal
                                                                    .price *
                                                                    order.quantity),
                                                        0,
                                                    )}
                                            </p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-purple-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Chef Order Tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="space-y-6"
                        >
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger
                                    value="pending"
                                    className="flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    Pending ({pendingOrders.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="active"
                                    className="flex items-center gap-2"
                                >
                                    <Package className="w-4 h-4" />
                                    Active ({activeOrders.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="completed"
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Completed ({completedOrders.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending">
                                <ChefPendingOrders
                                    orders={pendingOrders}
                                    onViewDetails={handleViewDetails}
                                />
                            </TabsContent>

                            <TabsContent value="active">
                                <ChefActiveOrders
                                    orders={activeOrders}
                                    onViewDetails={handleViewDetails}
                                />
                            </TabsContent>

                            <TabsContent value="completed">
                                <ChefCompletedOrders
                                    orders={completedOrders}
                                    onViewDetails={handleViewDetails}
                                />
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Customer Orders Interface
    function CustomerOrdersInterface() {
        const activeOrders = orders.filter(
            (order) => !["delivered", "cancelled"].includes(order.status),
        );
        const pastOrders = orders.filter((order) =>
            ["delivered", "cancelled"].includes(order.status),
        );

        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Customer Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                        <User className="w-8 h-8 text-blue-500" />
                                        My Orders
                                    </h1>
                                    <p className="text-gray-600">
                                        Track your meal orders and order history
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={fetchOrders}
                                    disabled={loading}
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                                    />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {/* Customer Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Active Orders
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {activeOrders.length}
                                            </p>
                                        </div>
                                        <Package className="w-8 h-8 text-blue-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Total Orders
                                            </p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {orders.length}
                                            </p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Total Spent
                                            </p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                ₹
                                                {orders
                                                    .filter(
                                                        (order) =>
                                                            order.status ===
                                                            "delivered",
                                                    )
                                                    .reduce(
                                                        (sum, order) =>
                                                            sum +
                                                            (order.totalPrice ??
                                                                order.meal
                                                                    .price *
                                                                    order.quantity),
                                                        0,
                                                    )}
                                            </p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-purple-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Customer Order Tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="space-y-6"
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger
                                    value="active"
                                    className="flex items-center gap-2"
                                >
                                    <Package className="w-4 h-4" />
                                    Active Orders ({activeOrders.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="flex items-center gap-2"
                                >
                                    <Clock className="w-4 h-4" />
                                    Order History ({pastOrders.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="active">
                                <CustomerActiveOrders
                                    orders={activeOrders}
                                    onViewDetails={handleViewDetails}
                                />
                            </TabsContent>

                            <TabsContent value="history">
                                <CustomerOrderHistory
                                    orders={pastOrders}
                                    onViewDetails={handleViewDetails}
                                />
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Chef Pending Orders Component
    function ChefPendingOrders({
        orders,
        onViewDetails,
    }: {
        orders: Order[];
        onViewDetails: (order: Order) => void;
    }) {
        if (orders.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-16">
                        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No pending orders
                        </h3>
                        <p className="text-gray-600">
                            New orders will appear here for your approval
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {orders.map((order, index) => (
                    <motion.div
                        key={order._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-l-4 border-l-yellow-500">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {order.meal.name}
                                        </CardTitle>
                                        <p className="text-sm text-gray-600">
                                            Order #{order._id.slice(-8)}
                                        </p>
                                    </div>
                                    <Badge className="bg-yellow-500 text-white">
                                        New Order
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Customer
                                            </p>
                                            <p className="font-medium">
                                                {getUserName(order.user)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Quantity
                                            </p>
                                            <p className="font-medium">
                                                {order.quantity}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Amount
                                            </p>
                                            <p className="font-medium">
                                                ₹{order.totalPrice}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <p className="text-sm text-gray-600">
                                            Delivery Address
                                        </p>
                                    </div>
                                    <p className="text-sm bg-gray-50 p-2 rounded">
                                        {order.deliveryAddress}
                                    </p>
                                </div>

                                {order.specialInstructions && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 mb-1">
                                            Special Instructions:
                                        </p>
                                        <p className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                                            {order.specialInstructions}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() =>
                                            updateOrderStatus(
                                                order._id,
                                                "confirmed",
                                            )
                                        }
                                        disabled={updatingOrders.has(order._id)}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {updatingOrders.has(order._id)
                                            ? "Accepting..."
                                            : "Accept Order"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            updateOrderStatus(
                                                order._id,
                                                "cancelled",
                                            )
                                        }
                                        disabled={updatingOrders.has(order._id)}
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                        {updatingOrders.has(order._id)
                                            ? "Declining..."
                                            : "Decline"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => onViewDetails(order)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        );
    }

    // Chef Active Orders Component
    function ChefActiveOrders({
        orders,
        onViewDetails,
    }: {
        orders: Order[];
        onViewDetails: (order: Order) => void;
    }) {
        if (orders.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-16">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No active orders
                        </h3>
                        <p className="text-gray-600">
                            Accepted orders will appear here
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {orders.map((order, index) => {
                    const statusInfo =
                        statusConfig[order.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo?.icon || Package;

                    return (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className={`border-l-4 ${
                                    order.status === "confirmed"
                                        ? "border-l-blue-500"
                                        : order.status === "preparing"
                                          ? "border-l-purple-500"
                                          : "border-l-orange-500"
                                }`}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-2 rounded-full ${statusInfo?.color}`}
                                            >
                                                <StatusIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {order.meal.name}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    Order #{order._id.slice(-8)}{" "}
                                                    • {getUserName(order.user)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            className={`${statusInfo?.color} text-white`}
                                        >
                                            {statusInfo?.text}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Quantity
                                                </p>
                                                <p className="font-medium">
                                                    {order.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Amount
                                                </p>
                                                <p className="font-medium">
                                                    ₹{order.totalPrice}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Delivery Date
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        order.deliveryDate,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Order Time
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        order.createdAt,
                                                    ).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === "confirmed" && (
                                            <Button
                                                onClick={() =>
                                                    updateOrderStatus(
                                                        order._id,
                                                        "preparing",
                                                    )
                                                }
                                                disabled={updatingOrders.has(
                                                    order._id,
                                                )}
                                                className="bg-purple-600 hover:bg-purple-700"
                                            >
                                                {updatingOrders.has(order._id)
                                                    ? "Starting..."
                                                    : "Start Preparing"}
                                            </Button>
                                        )}
                                        {order.status === "preparing" && (
                                            <Button
                                                onClick={() =>
                                                    updateOrderStatus(
                                                        order._id,
                                                        "ready",
                                                    )
                                                }
                                                disabled={updatingOrders.has(
                                                    order._id,
                                                )}
                                                className="bg-orange-600 hover:bg-orange-700"
                                            >
                                                {updatingOrders.has(order._id)
                                                    ? "Marking..."
                                                    : "Mark Ready"}
                                            </Button>
                                        )}
                                        {order.status === "ready" && (
                                            <Button
                                                onClick={() =>
                                                    updateOrderStatus(
                                                        order._id,
                                                        "delivered",
                                                    )
                                                }
                                                disabled={updatingOrders.has(
                                                    order._id,
                                                )}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {updatingOrders.has(order._id)
                                                    ? "Delivering..."
                                                    : "Mark Delivered"}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => onViewDetails(order)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    // Chef Completed Orders Component
    function ChefCompletedOrders({
        orders,
        onViewDetails,
    }: {
        orders: Order[];
        onViewDetails: (order: Order) => void;
    }) {
        if (orders.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-16">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No completed orders
                        </h3>
                        <p className="text-gray-600">
                            Completed orders will appear here
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {orders.map((order, index) => {
                    const statusInfo =
                        statusConfig[order.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo?.icon || CheckCircle;

                    return (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className={`border-l-4 ${
                                    order.status === "delivered"
                                        ? "border-l-green-500"
                                        : "border-l-red-500"
                                }`}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-2 rounded-full ${statusInfo?.color}`}
                                            >
                                                <StatusIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {order.meal.name}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    Order #{order._id.slice(-8)}{" "}
                                                    • {getUserName(order.user)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            className={`${statusInfo?.color} text-white`}
                                        >
                                            {statusInfo?.text}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Quantity
                                                </p>
                                                <p className="font-medium">
                                                    {order.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Earnings
                                                </p>
                                                <p className="font-medium text-green-600">
                                                    {order.status ===
                                                    "delivered"
                                                        ? `₹${order.totalPrice ?? order.meal.price * order.quantity}`
                                                        : "₹0"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Completed Date
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        order.createdAt,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => onViewDetails(order)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    // Customer Active Orders Component
    function CustomerActiveOrders({
        orders,
        onViewDetails,
    }: {
        orders: Order[];
        onViewDetails: (order: Order) => void;
    }) {
        if (orders.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-16">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No active orders
                        </h3>
                        <p className="text-gray-600">
                            Your active orders will appear here
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-6">
                {orders.map((order, index) => {
                    const statusInfo =
                        statusConfig[order.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo?.icon || Clock;

                    return (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-2 rounded-full ${statusInfo?.color}`}
                                            >
                                                <StatusIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {order.meal.name}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    Order #{order._id.slice(-8)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            className={`${statusInfo?.color} text-white`}
                                        >
                                            {statusInfo?.text}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="flex items-center gap-2">
                                            <ChefHat className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Chef
                                                </p>
                                                <p className="font-medium">
                                                    {getProviderName(
                                                        order.provider,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Quantity
                                                </p>
                                                <p className="font-medium">
                                                    {order.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Total
                                                </p>
                                                <p className="font-medium">
                                                    ₹{order.totalPrice}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Progress */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-semibold text-gray-700">
                                                Order Progress
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${statusInfo?.color}`}
                                                ></div>
                                                <span className="text-sm font-medium text-gray-600">
                                                    {statusInfo?.description}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Container */}
                                        <div className="relative bg-gray-50 rounded-lg p-4">
                                            {/* Progress Bar Background */}
                                            <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-200 rounded-full transform -translate-y-1/2"></div>

                                            {/* Active Progress Bar */}
                                            <motion.div
                                                className="absolute top-1/2 left-8 h-1 bg-gradient-to-r from-green-400 to-green-500 rounded-full transform -translate-y-1/2"
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${Math.max(0, (["pending", "confirmed", "preparing", "ready", "delivered"].indexOf(order.status) / 4) * 100)}%`,
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    ease: "easeOut",
                                                    delay: 0.3,
                                                }}
                                                style={{
                                                    maxWidth:
                                                        "calc(100% - 4rem)",
                                                }}
                                            >
                                                {/* Animated Shimmer Effect */}
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 rounded-full"
                                                    animate={{
                                                        x: ["-100%", "100%"],
                                                    }}
                                                    transition={{
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "linear",
                                                    }}
                                                />
                                            </motion.div>

                                            {/* Progress Steps */}
                                            <div className="relative flex justify-between items-center">
                                                {[
                                                    "pending",
                                                    "confirmed",
                                                    "preparing",
                                                    "ready",
                                                    "delivered",
                                                ].map((status, idx) => {
                                                    const statusOrder = [
                                                        "pending",
                                                        "confirmed",
                                                        "preparing",
                                                        "ready",
                                                        "delivered",
                                                    ];
                                                    const currentStatusIndex =
                                                        statusOrder.indexOf(
                                                            order.status,
                                                        );
                                                    const isCompleted =
                                                        currentStatusIndex >
                                                        idx;
                                                    const isCurrent =
                                                        currentStatusIndex ===
                                                        idx;
                                                    const stepIcons = [
                                                        "⏳",
                                                        "✅",
                                                        "👨‍🍳",
                                                        "📦",
                                                        "🚚",
                                                    ];

                                                    return (
                                                        <motion.div
                                                            key={status}
                                                            className="flex flex-col items-center relative z-10"
                                                            initial={{
                                                                scale: 0.8,
                                                                opacity: 0,
                                                            }}
                                                            animate={{
                                                                scale: 1,
                                                                opacity: 1,
                                                            }}
                                                            transition={{
                                                                delay:
                                                                    idx * 0.1,
                                                                duration: 0.3,
                                                            }}
                                                        >
                                                            {/* Step Circle */}
                                                            <motion.div
                                                                className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                                                    isCompleted
                                                                        ? "bg-green-500 border-green-500 shadow-lg shadow-green-200"
                                                                        : isCurrent
                                                                          ? "bg-orange-500 border-orange-500 shadow-lg shadow-orange-200"
                                                                          : "bg-white border-gray-300 shadow-sm"
                                                                }`}
                                                                animate={
                                                                    isCurrent
                                                                        ? {
                                                                              scale: [
                                                                                  1,
                                                                                  1.1,
                                                                                  1,
                                                                              ],
                                                                              boxShadow:
                                                                                  [
                                                                                      "0 4px 6px -1px rgba(251, 146, 60, 0.3)",
                                                                                      "0 10px 15px -3px rgba(251, 146, 60, 0.4)",
                                                                                      "0 4px 6px -1px rgba(251, 146, 60, 0.3)",
                                                                                  ],
                                                                          }
                                                                        : {}
                                                                }
                                                                transition={
                                                                    isCurrent
                                                                        ? {
                                                                              duration: 2,
                                                                              repeat: Infinity,
                                                                              ease: "easeInOut",
                                                                          }
                                                                        : {}
                                                                }
                                                            >
                                                                {/* Icon or Checkmark */}
                                                                {isCompleted ? (
                                                                    <motion.div
                                                                        initial={{
                                                                            scale: 0,
                                                                        }}
                                                                        animate={{
                                                                            scale: 1,
                                                                        }}
                                                                        transition={{
                                                                            delay: 0.2,
                                                                            type: "spring",
                                                                            stiffness: 200,
                                                                        }}
                                                                        className="text-white text-sm"
                                                                    >
                                                                        ✓
                                                                    </motion.div>
                                                                ) : (
                                                                    <span
                                                                        className={`text-sm ${isCurrent ? "text-white" : "text-gray-400"}`}
                                                                    >
                                                                        {
                                                                            stepIcons[
                                                                                idx
                                                                            ]
                                                                        }
                                                                    </span>
                                                                )}

                                                                {/* Pulse Effect for Current Step */}
                                                                {isCurrent && (
                                                                    <motion.div
                                                                        className="absolute inset-0 rounded-full bg-orange-400"
                                                                        animate={{
                                                                            scale: [
                                                                                1,
                                                                                1.5,
                                                                                1,
                                                                            ],
                                                                            opacity:
                                                                                [
                                                                                    0.7,
                                                                                    0,
                                                                                    0.7,
                                                                                ],
                                                                        }}
                                                                        transition={{
                                                                            duration: 2,
                                                                            repeat: Infinity,
                                                                            ease: "easeInOut",
                                                                        }}
                                                                    />
                                                                )}
                                                            </motion.div>

                                                            {/* Step Label */}
                                                            <motion.span
                                                                className={`text-xs mt-2 text-center transition-all duration-300 ${
                                                                    isCompleted ||
                                                                    isCurrent
                                                                        ? "text-gray-700 font-semibold"
                                                                        : "text-gray-400 font-medium"
                                                                }`}
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                }}
                                                                transition={{
                                                                    delay:
                                                                        idx *
                                                                            0.1 +
                                                                        0.2,
                                                                }}
                                                            >
                                                                {
                                                                    [
                                                                        "Pending",
                                                                        "Confirmed",
                                                                        "Preparing",
                                                                        "Ready",
                                                                        "Delivered",
                                                                    ][idx]
                                                                }
                                                            </motion.span>

                                                            {/* Time Estimate (for current step) */}
                                                            {isCurrent && (
                                                                <motion.div
                                                                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2"
                                                                    initial={{
                                                                        opacity: 0,
                                                                        scale: 0.8,
                                                                    }}
                                                                    animate={{
                                                                        opacity: 1,
                                                                        scale: 1,
                                                                    }}
                                                                    transition={{
                                                                        delay: 0.5,
                                                                    }}
                                                                >
                                                                    <div className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                                                        {status ===
                                                                            "pending" &&
                                                                            "Awaiting confirmation"}
                                                                        {status ===
                                                                            "confirmed" &&
                                                                            "Starting soon"}
                                                                        {status ===
                                                                            "preparing" &&
                                                                            "Cooking now"}
                                                                        {status ===
                                                                            "ready" &&
                                                                            "Ready for pickup"}
                                                                        {status ===
                                                                            "delivered" &&
                                                                            "Completed"}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Progress Percentage */}
                                        <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                            <span>Order placed</span>
                                            <span className="font-medium">
                                                {Math.round(
                                                    (([
                                                        "pending",
                                                        "confirmed",
                                                        "preparing",
                                                        "ready",
                                                        "delivered",
                                                    ].indexOf(order.status) +
                                                        1) /
                                                        5) *
                                                        100,
                                                )}
                                                % Complete
                                            </span>
                                            <span>Delivered</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {["pending", "confirmed"].includes(
                                            order.status,
                                        ) && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    cancelOrder(order._id)
                                                }
                                                disabled={updatingOrders.has(
                                                    order._id,
                                                )}
                                            >
                                                {updatingOrders.has(order._id)
                                                    ? "Cancelling..."
                                                    : "Cancel Order"}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewDetails(order)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    // Customer Order History Component
    function CustomerOrderHistory({
        orders,
        onViewDetails,
    }: {
        orders: Order[];
        onViewDetails: (order: Order) => void;
    }) {
        if (orders.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-16">
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No order history
                        </h3>
                        <p className="text-gray-600">
                            Your completed orders will appear here
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {orders.map((order, index) => {
                    const statusInfo =
                        statusConfig[order.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo?.icon || Clock;

                    return (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="opacity-90 hover:opacity-100 transition-opacity">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-2 rounded-full ${statusInfo?.color}`}
                                            >
                                                <StatusIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {order.meal.name}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    Order #{order._id.slice(-8)}{" "}
                                                    •{" "}
                                                    {new Date(
                                                        order.createdAt,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            className={`${statusInfo?.color} text-white`}
                                        >
                                            {statusInfo?.text}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <ChefHat className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Chef
                                                </p>
                                                <p className="font-medium">
                                                    {getProviderName(
                                                        order.provider,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Quantity
                                                </p>
                                                <p className="font-medium">
                                                    {order.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Total Paid
                                                </p>
                                                <p className="font-medium">
                                                    ₹{order.totalPrice}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    Delivery Date
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        order.deliveryDate,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewDetails(order)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    // Main render - choose interface based on user role
    return (
        <>
            {user?.role === "provider" ? (
                <ChefOrdersInterface />
            ) : (
                <CustomerOrdersInterface />
            )}

            {/* Order Details Modal */}
            <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[9999]">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Order Header */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {selectedOrder.meal.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Order #{selectedOrder._id.slice(-8)}
                                    </p>
                                </div>
                                <Badge
                                    className={`${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || "bg-gray-500"} text-white`}
                                >
                                    {statusConfig[
                                        selectedOrder.status as keyof typeof statusConfig
                                    ]?.text || selectedOrder.status}
                                </Badge>
                            </div>

                            {/* Order Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            {user?.role === "provider"
                                                ? "Customer"
                                                : "Chef"}
                                        </label>
                                        <p className="text-sm font-medium">
                                            {user?.role === "provider"
                                                ? getUserName(
                                                      selectedOrder.user,
                                                  )
                                                : getProviderName(
                                                      selectedOrder.provider,
                                                  )}
                                        </p>
                                        {/* Show contact info for chef viewing customer details */}
                                        {user?.role === "provider" && (
                                            <div className="flex flex-col gap-1 mt-1">
                                                {getUserEmail(
                                                    selectedOrder.user,
                                                ) && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {getUserEmail(
                                                            selectedOrder.user,
                                                        )}
                                                    </p>
                                                )}
                                                {getUserPhone(
                                                    selectedOrder.user,
                                                ) && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {getUserPhone(
                                                            selectedOrder.user,
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Quantity
                                        </label>
                                        <p className="text-sm">
                                            {selectedOrder.quantity} meal
                                            {selectedOrder.quantity > 1
                                                ? "s"
                                                : ""}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Base Price
                                        </label>
                                        <p className="text-sm">
                                            ₹{selectedOrder.meal.price} ×{" "}
                                            {selectedOrder.quantity} = ₹
                                            {selectedOrder.meal.price *
                                                selectedOrder.quantity}
                                        </p>
                                    </div>

                                    {selectedOrder.extraItems &&
                                        selectedOrder.extraItems.length > 0 && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">
                                                    Extra Items
                                                </label>
                                                <div className="mt-1 space-y-1">
                                                    {selectedOrder.extraItems.map(
                                                        (item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between text-xs bg-orange-50 border border-orange-100 rounded px-2 py-1"
                                                            >
                                                                <span className="font-medium text-gray-700">
                                                                    {item.name}{" "}
                                                                    ×{" "}
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </span>
                                                                <span className="text-orange-700 font-semibold">
                                                                    +₹
                                                                    {item.pricePerUnit *
                                                                        item.quantity}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Total Amount
                                        </label>
                                        <p className="text-sm font-bold text-green-700 text-base">
                                            ₹{selectedOrder.totalPrice}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Delivery Date
                                        </label>
                                        <p className="text-sm">
                                            {new Date(
                                                selectedOrder.deliveryDate,
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Order Date
                                        </label>
                                        <p className="text-sm">
                                            {new Date(
                                                selectedOrder.createdAt,
                                            ).toLocaleString()}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-600">
                                            Status
                                        </label>
                                        <p className="text-sm">
                                            {
                                                statusConfig[
                                                    selectedOrder.status as keyof typeof statusConfig
                                                ]?.description
                                            }
                                        </p>
                                    </div>

                                    {/* Meal Items Included */}
                                    {selectedOrder.meal.items &&
                                        selectedOrder.meal.items.length > 0 && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">
                                                    Meal Includes
                                                </label>
                                                <ul className="mt-1 space-y-1">
                                                    {selectedOrder.meal.items.map(
                                                        (item, idx) => (
                                                            <li
                                                                key={idx}
                                                                className="flex items-center gap-2 text-xs text-gray-600"
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block shrink-0" />
                                                                <span className="font-medium">
                                                                    {item.name}
                                                                </span>
                                                                <span className="text-gray-400">
                                                                    (
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                    )
                                                                </span>
                                                                {item.isOptional && (
                                                                    <span className="text-gray-400 italic">
                                                                        optional
                                                                    </span>
                                                                )}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Delivery Address */}
                            <div>
                                <label className="text-sm font-medium text-gray-600">
                                    Delivery Address
                                </label>
                                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
                                    {selectedOrder.deliveryAddress}
                                </p>
                            </div>

                            {/* Special Instructions */}
                            {selectedOrder.specialInstructions && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">
                                        Special Instructions
                                    </label>
                                    <p className="text-sm mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        {selectedOrder.specialInstructions}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4 border-t">
                                {getStatusActions(selectedOrder)}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowOrderDetails(false)}
                                    className="ml-auto"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
