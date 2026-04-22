"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/contexts/SocketContext"
import { Plus, ChefHat, DollarSign, Package, Star, Edit, Trash2, Eye, RefreshCw, Wifi, WifiOff, MapPin } from "lucide-react"

interface Meal {
  _id: string
  name: string
  description: string
  price: number
  category: string
  availability: boolean
  createdAt: string
}

interface Order {
  _id: string
  meal: {
    _id: string
    name: string
    price: number
  }
  user: {
    _id: string
    name: string
    email: string
  }
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"
  quantity: number
  deliveryAddress: string
  deliveryDate: string
  createdAt: string
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

export default function ChefDashboard() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const { connected, onOrderNew } = useSocket()
  const [meals, setMeals] = useState<Meal[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set())
  const [updatingLocation, setUpdatingLocation] = useState(false)
  const [stats, setStats] = useState({
    totalMeals: 0,
    totalOrders: 0,
    totalEarnings: 0,
    averageRating: 4.8,
  })

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  const fetchMeals = useCallback(async () => {
    try {
      // Use server-side filter — avoids the string vs ObjectId comparison bug
      const response = await fetch(`${API_BASE_URL}/meals/provider/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMeals(data.data)
        setStats((prev) => ({ ...prev, totalMeals: data.data.length }))
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch tiffins.", variant: "destructive" })
    }
  }, [API_BASE_URL, token, toast])

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(data.data)
        const totalEarnings = data.data
          .filter((o: Order) => o.status === "delivered")
          .reduce((sum: number, o: Order) => sum + o.meal.price * o.quantity, 0)
        setStats((prev) => ({ ...prev, totalOrders: data.data.length, totalEarnings }))
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch orders.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [API_BASE_URL, token, toast])

  useEffect(() => {
    if (user && token) {
      fetchMeals()
      fetchOrders()
    }
  }, [user, token, fetchMeals, fetchOrders])

  // Real-time: when a new order arrives, refresh the orders list
  useEffect(() => {
    const off = onOrderNew(() => fetchOrders())
    return off
  }, [onOrderNew, fetchOrders])

  const updateProviderLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" })
      return
    }
    setUpdatingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE_URL}/users/location`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          })
          if (res.ok) {
            toast({ title: "Location Updated", description: "Your service area has been updated successfully!" })
          } else {
            throw new Error("Failed to update location")
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to update location on the server.", variant: "destructive" })
        } finally {
          setUpdatingLocation(false)
        }
      },
      () => {
        toast({ title: "Permission Denied", description: "Please allow location access to update your service area.", variant: "destructive" })
        setUpdatingLocation(false)
      }
    )
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    // Add to updating set for loading state
    setUpdatingOrders(prev => new Set(prev).add(orderId))

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        // Update the order in the local state immediately
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, status: status as any }
              : order
          )
        )

        toast({
          title: "Order updated",
          description: `Order ${status === "confirmed" ? "accepted" : status === "cancelled" ? "declined" : "updated"}`,
        })

        // Refresh orders to get any additional updates
        fetchOrders()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update order")
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update order status.",
        variant: "destructive",
      })
    } finally {
      // Remove from updating set
      setUpdatingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Chef Dashboard</h1>
                <p className="text-gray-600">Manage your tiffin menus and orders</p>
                <span className={`inline-flex items-center gap-1 text-xs mt-1 font-medium ${connected ? "text-green-600" : "text-gray-400"}`}>
                  {connected ? <><Wifi className="w-3 h-3" /> Live order alerts active</> : <><WifiOff className="w-3 h-3" /> Connecting...</>}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={updateProviderLocation} disabled={updatingLocation} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                  <MapPin className={`w-4 h-4 mr-2 ${updatingLocation ? "animate-pulse" : ""}`} />
                  {updatingLocation ? "Updating..." : "Set Location"}
                </Button>
                <Button variant="outline" onClick={() => { fetchMeals(); fetchOrders() }} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Meals</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalMeals}</p>
                    </div>
                    <ChefHat className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Meals */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Meals</CardTitle>
                      <CardDescription>Manage your meal listings</CardDescription>
                    </div>
                    <Link href="/chef/meals">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Meal
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {meals.length === 0 ? (
                    <div className="text-center py-8">
                      <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No meals yet</h3>
                      <p className="text-gray-600 mb-4">Start by adding your first meal!</p>
                      <Link href="/chef/meals">
                        <Button>Add Your First Meal</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {meals.slice(0, 3).map((meal, index) => (
                        <motion.div
                          key={meal._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{meal.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-1">{meal.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary">{meal.category}</Badge>
                              <span className="text-sm font-medium text-green-600">₹{meal.price}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Orders */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Orders</CardTitle>
                      <CardDescription>Manage incoming orders</CardDescription>
                    </div>
                    <Link href="/orders">
                      <Button variant="outline" size="sm">
                        View All Orders
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                      <p className="text-gray-600">Orders will appear here when customers place them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice(0, 3).map((order, index) => (
                        <motion.div
                          key={order._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: updatingOrders.has(order._id) ? 0.98 : 1
                          }}
                          transition={{
                            delay: 0.1 * index,
                            scale: { duration: 0.2 }
                          }}
                          className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                            updatingOrders.has(order._id)
                              ? "border-orange-300 bg-orange-50 ring-2 ring-orange-200"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{order.meal.name}</h4>
                            <Badge className={statusColors[order.status]}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Customer: {order.user.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Qty: {order.quantity} • ₹{order.meal.price * order.quantity}
                            </span>
                            {order.status === "pending" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order._id, "confirmed")}
                                  disabled={updatingOrders.has(order._id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {updatingOrders.has(order._id) ? "Accepting..." : "Accept"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateOrderStatus(order._id, "cancelled")}
                                  disabled={updatingOrders.has(order._id)}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  {updatingOrders.has(order._id) ? "Declining..." : "Decline"}
                                </Button>
                              </div>
                            )}
                            {order.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order._id, "preparing")}
                                disabled={updatingOrders.has(order._id)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {updatingOrders.has(order._id) ? "Starting..." : "Start Preparing"}
                              </Button>
                            )}
                            {order.status === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order._id, "ready")}
                                disabled={updatingOrders.has(order._id)}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                {updatingOrders.has(order._id) ? "Marking..." : "Mark Ready"}
                              </Button>
                            )}
                            {order.status === "ready" && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order._id, "delivered")}
                                disabled={updatingOrders.has(order._id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {updatingOrders.has(order._id) ? "Delivering..." : "Mark Delivered"}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
