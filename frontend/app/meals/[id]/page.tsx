"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import ReviewSection from "@/components/ReviewSection"
import {
  Heart,
  ShoppingCart,
  ArrowLeft,
  User,
  Clock,
  Flame,
  Leaf,
} from "lucide-react"

interface Meal {
  _id: string
  name: string
  description: string
  price: number
  category: string
  mealType?: string
  availability: boolean
  user: string
  photo?: string
  items?: { name: string; quantity: string; isOptional: boolean }[]
  availableExtras?: { name: string; price: number; maxQuantity: number }[]
  provider: {
    _id: string
    name: string
    email: string
    profilePhoto?: string
  }
}

export default function MealDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, token } = useAuth()
  const { toast } = useToast()

  const [meal, setMeal] = useState<Meal | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    if (params.id) fetchMealDetails()
  }, [params.id])

  const fetchMealDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/meals/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setMeal(data.data)
      } else {
        toast({ title: "Error", description: "Meal not found.", variant: "destructive" })
        router.push("/meals")
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch meal details.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const orderMeal = async () => {
    if (!token || !user) {
      toast({
        title: "Authentication required",
        description: "Please login to place an order.",
        variant: "destructive",
      })
      return
    }
    if (user.role !== "customer") {
      toast({
        title: "Access denied",
        description: "Only customers can place orders.",
        variant: "destructive",
      })
      return
    }
    if (!user.address || user.address.trim().length === 0) {
      toast({
        title: "Address required",
        description: "Please update your profile with a delivery address before placing orders.",
        variant: "destructive",
      })
      router.push("/profile")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meal: meal?._id,
          quantity: 1,
          deliveryAddress: user.address,
          deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          specialInstructions: "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Order placed successfully!",
          description: `Your order for ${meal?.name} has been placed.`,
        })
        router.push("/dashboard")
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to place order")
      }
    } catch (error) {
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to place order.",
        variant: "destructive",
      })
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</span>
          </div>
          <p className="text-gray-500 font-medium animate-pulse">Loading meal details…</p>
        </div>
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Meal not found</h2>
          <Button onClick={() => router.push("/meals")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meals
          </Button>
        </div>
      </div>
    )
  }

  const mealTypeIcon: Record<string, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
    snack: "🫙",
    beverage: "☕",
  }
  const typeEmoji = mealTypeIcon[meal.category] || "🍽️"

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-orange-50 hover:text-orange-600"
            id="back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* ── Meal Hero Card ──────────────────────────────────────────── */}
          <Card className="mb-6 overflow-hidden shadow-xl border-0 rounded-3xl">
            {/* Hero image / banner */}
            <div className="relative">
              <div className="w-full h-72 bg-gradient-to-br from-orange-200 to-amber-300 flex items-center justify-center overflow-hidden">
                {meal.photo ? (
                  <img
                    src={meal.photo}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[7rem] select-none drop-shadow-sm">{typeEmoji}</span>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>

              {/* Floating badges */}
              <Badge className="absolute top-4 left-4 bg-orange-500/90 backdrop-blur-sm text-white capitalize shadow-lg px-3 py-1">
                {meal.category}
              </Badge>
              <Badge
                className={`absolute top-4 right-4 backdrop-blur-sm text-white shadow-lg px-3 py-1 ${
                  meal.availability ? "bg-emerald-500/90" : "bg-red-500/90"
                }`}
              >
                {meal.availability ? "Available" : "Unavailable"}
              </Badge>

              {/* Like / Favorite button */}
              <motion.button
                className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center"
                onClick={() => setLiked((v) => !v)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                id="like-meal-btn"
                aria-label="Like meal"
              >
                <Heart
                  className={`w-5 h-5 transition-colors duration-200 ${
                    liked ? "fill-red-500 text-red-500" : "text-gray-500"
                  }`}
                />
              </motion.button>
            </div>

            <CardContent className="p-8">
              {/* Title + Price */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <h1 className="text-3xl font-black text-gray-900 leading-tight">{meal.name}</h1>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black text-orange-500">₹{meal.price}</span>
                  <span className="text-xs text-gray-400">per serving</span>
                </div>
              </div>

              <p className="text-gray-600 text-base leading-relaxed mb-6">{meal.description}</p>

              {/* Tiffin Items */}
              {meal.items && meal.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-500" /> What's included
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {meal.items.map((item, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                          item.isOptional
                            ? "bg-gray-50 border-gray-200 text-gray-500"
                            : "bg-orange-50 border-orange-200 text-orange-700"
                        }`}
                      >
                        {item.name}
                        {item.quantity && item.quantity !== "1 serving" && (
                          <span className="ml-1 text-xs opacity-60">({item.quantity})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Extras */}
              {meal.availableExtras && meal.availableExtras.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> Add-ons available
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {meal.availableExtras.map((extra, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 border border-amber-200 text-amber-700"
                      >
                        {extra.name} <span className="font-bold">+₹{extra.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl mb-6 border border-orange-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shrink-0">
                  {meal.provider.profilePhoto ? (
                    <img
                      src={meal.provider.profilePhoto}
                      alt={meal.provider.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{meal.provider.name}</h3>
                  <p className="text-sm text-gray-500">Home Chef & Provider</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                  <Clock className="w-3.5 h-3.5" />
                  Delivers next day
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={orderMeal}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-200 py-6 text-base rounded-xl"
                    disabled={!meal.availability}
                    id="order-now-btn"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {meal.availability ? "Order Now" : "Currently Unavailable"}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* ── Reviews Section ─────────────────────────────────────────── */}
          <ReviewSection mealId={meal._id} />
        </motion.div>
      </div>
    </div>
  )
}
