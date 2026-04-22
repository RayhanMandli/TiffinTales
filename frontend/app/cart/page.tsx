"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart()
  const { user, token } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  const placeOrdersFromCart = async () => {
    if (!token || !user) {
      toast({ title: "Authentication required", description: "Please login to place orders.", variant: "destructive" })
      router.push("/auth/login")
      return
    }
    if (user.role !== "customer") {
      toast({ title: "Access denied", description: "Only customers can place orders.", variant: "destructive" })
      return
    }
    if (!user.address?.trim()) {
      toast({ title: "Address required", description: "Please update your profile with a delivery address.", variant: "destructive" })
      router.push("/profile")
      return
    }
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Add some tiffins first.", variant: "destructive" })
      return
    }

    // Check for unavailable items
    const unavailable = (cartItems as any[]).filter((i) => i.availability === false)
    if (unavailable.length > 0) {
      toast({
        title: "Items unavailable",
        description: `${unavailable.map((i: any) => i.name).join(", ")} ${unavailable.length === 1 ? "is" : "are"} no longer available. Please remove before ordering.`,
        variant: "destructive",
      })
      return
    }

    setIsPlacingOrder(true)
    try {
      const orderPromises = cartItems.map((item) =>
        fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            meal: item._id,
            quantity: item.quantity,
            extraItems: item.extraItems,
            totalPrice: item.totalPrice,
            deliveryAddress: user.address,
            deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            specialInstructions: "",
          }),
        })
      )

      const responses = await Promise.all(orderPromises)
      const failed = responses.filter((r) => !r.ok)

      if (failed.length === 0) {
        toast({ title: "Orders placed! 🎉", description: `${cartItems.length} order(s) sent to your chefs.` })
        clearCart()
        router.push("/orders")
      } else {
        const errBody = await failed[0].json()
        throw new Error(errBody.error || `${failed.length} order(s) failed`)
      }
    } catch (err) {
      toast({
        title: "Order failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Discover fresh homemade tiffins and add them to your cart!</p>
            <Button onClick={() => router.push("/")} className="bg-orange-500 hover:bg-orange-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Browse Tiffins
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Your Cart</h1>
              <p className="text-gray-500">{cartItems.length} tiffin(s) in your cart</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Cart Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnimatePresence>
                    {cartItems.map((item) => {
                      const isUnavailable = (item as any).availability === false
                      return (
                        <motion.div
                          key={item._id}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`p-4 border-b border-gray-100 last:border-0 ${isUnavailable ? "bg-red-50 border-red-200" : ""}`}
                        >
                          {isUnavailable && (
                            <div className="flex items-center gap-2 text-red-600 text-sm mb-2 font-medium">
                              <AlertTriangle className="w-4 h-4" />
                              This tiffin is no longer available — please remove it before ordering.
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            {/* Image */}
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                              {item.photo ? (
                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-2xl">🍱</div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                  <p className="text-sm text-gray-500">by {item.provider.name}</p>
                                  <Badge className="bg-orange-100 text-orange-700 text-xs mt-1 capitalize">{item.mealType || item.category}</Badge>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="font-bold text-gray-900">₹{item.totalPrice}</p>
                                  <p className="text-xs text-gray-400">₹{item.price} × {item.quantity}</p>
                                </div>
                              </div>

                              {/* Extras summary */}
                              {item.extraItems && item.extraItems.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.extraItems.map((ex, i) => (
                                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                      +{ex.quantity}× {ex.name} (₹{ex.pricePerUnit * ex.quantity})
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Quantity + remove */}
                              <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => updateQuantity(item._id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item._id, parseInt(e.target.value) || 1)}
                                    className="w-14 text-center h-8"
                                    min="1"
                                  />
                                  <Button variant="outline" size="sm" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeFromCart(item._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate mr-2">{item.name} ×{item.quantity}</span>
                      <span className="font-medium shrink-0">₹{item.totalPrice}</span>
                    </div>
                  ))}

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Subtotal</span><span>₹{getTotalPrice()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mb-3">
                      <span>Delivery Fee</span><span className="text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span><span className="text-orange-600">₹{getTotalPrice()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button onClick={placeOrdersFromCart} disabled={isPlacingOrder} className="w-full bg-orange-500 hover:bg-orange-600">
                      {isPlacingOrder ? "Placing Orders..." : "Place Orders"}
                    </Button>
                    <Button variant="outline" onClick={clearCart} className="w-full">Clear Cart</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
