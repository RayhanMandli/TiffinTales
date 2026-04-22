"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useCart } from "@/contexts/CartContext"
import { useSocket, type TiffinMenu } from "@/contexts/SocketContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  ChefHat,
  Users,
  TrendingUp,
  Heart,
  ShoppingCart,
  ArrowRight,
  Play,
  MapPin,
  Navigation,
  Plus,
  Minus,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 10 } },
}

const floatingVariants = {
  animate: { y: [-10, 10, -10], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
}

const stats = [
  { icon: ChefHat, label: "Home Chefs", value: "500+", color: "text-orange-500" },
  { icon: Users, label: "Happy Customers", value: "10K+", color: "text-blue-500" },
  { icon: TrendingUp, label: "Orders Delivered", value: "50K+", color: "text-green-500" },
]

const MEAL_TYPES = ["all", "lunch", "dinner", "breakfast", "snack"]

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

// ── Tiffin Card ───────────────────────────────────────────────────────────────
function TiffinCard({
  meal,
  isLiked,
  onLike,
  onAddToCart,
}: {
  meal: TiffinMenu
  isLiked: boolean
  onLike: (id: string) => void
  onAddToCart: (meal: TiffinMenu) => void
}) {
  const [showItems, setShowItems] = useState(false)

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white h-full flex flex-col">
        {/* Image */}
        <div className="relative">
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center overflow-hidden">
            {meal.photo ? (
              <img src={meal.photo} alt={meal.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-6xl">🍱</div>
            )}
          </div>
          <motion.button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg"
            onClick={() => onLike(meal._id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Heart className={`w-5 h-5 transition-colors duration-200 ${isLiked ? "text-red-500 fill-red-500" : "text-gray-600"}`} />
          </motion.button>

          <div className="absolute top-4 left-4 flex flex-col gap-1">
            <Badge className="bg-orange-500 text-white capitalize">{meal.mealType || meal.category}</Badge>
            {meal.distance !== undefined && (
              <Badge className="bg-blue-600 text-white flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" />
                {formatDistance(meal.distance)}
              </Badge>
            )}
            {!meal.availability && (
              <Badge className="bg-gray-500 text-white">Unavailable</Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 flex-1 mr-2">{meal.name}</h3>
            <span className="text-xl font-bold text-orange-600 whitespace-nowrap">₹{meal.price}</span>
          </div>

          {meal.description && (
            <p className="text-gray-500 text-sm mb-3 line-clamp-2">{meal.description}</p>
          )}

          {/* Tiffin items collapsible list */}
          {meal.items && meal.items.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowItems(!showItems)}
                className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                🍽️ {meal.items.length} items in this tiffin
                {showItems ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <AnimatePresence>
                {showItems && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-2 space-y-1">
                      {meal.items.map((item, i) => (
                        <li key={i} className="flex items-center justify-between text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-orange-400 rounded-full inline-block" />
                            {item.name}
                            {item.isOptional && <span className="text-gray-400">(opt)</span>}
                          </span>
                          <span className="text-gray-400">{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Extras preview */}
          {meal.availableExtras && meal.availableExtras.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {meal.availableExtras.slice(0, 3).map((extra, i) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                  +{extra.name} ₹{extra.price}
                </span>
              ))}
              {meal.availableExtras.length > 3 && (
                <span className="text-xs text-gray-400">+{meal.availableExtras.length - 3} more</span>
              )}
            </div>
          )}

          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">by {meal.provider.name}</span>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => onAddToCart(meal)}
                disabled={!meal.availability}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 w-full disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {meal.availability ? "Add to Cart" : "Unavailable"}
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Extras Selection Modal ────────────────────────────────────────────────────
function ExtrasModal({
  meal,
  open,
  onClose,
  onConfirm,
}: {
  meal: TiffinMenu | null
  open: boolean
  onClose: () => void
  onConfirm: (extras: { name: string; pricePerUnit: number; quantity: number }[]) => void
}) {
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})

  useEffect(() => {
    if (open) setSelectedExtras({})
  }, [open, meal?._id])

  if (!meal) return null

  const setQty = (name: string, qty: number, max: number) => {
    setSelectedExtras((prev) => ({ ...prev, [name]: Math.max(0, Math.min(qty, max)) }))
  }

  const extrasTotal = meal.availableExtras.reduce((sum, e) => {
    return sum + e.price * (selectedExtras[e.name] || 0)
  }, 0)

  const handleConfirm = () => {
    const chosen = meal.availableExtras
      .filter((e) => (selectedExtras[e.name] || 0) > 0)
      .map((e) => ({ name: e.name, pricePerUnit: e.price, quantity: selectedExtras[e.name] }))
    onConfirm(chosen)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🍱 {meal.name}</DialogTitle>
        </DialogHeader>

        {/* Full items list */}
        {meal.items.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Includes:</p>
            <ul className="grid grid-cols-2 gap-1">
              {meal.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                  {item.name} <span className="text-gray-400 text-xs">({item.quantity})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Extras */}
        {meal.availableExtras.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Add extras:</p>
            <div className="space-y-3">
              {meal.availableExtras.map((extra) => (
                <div key={extra.name} className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{extra.name}</p>
                    <p className="text-orange-600 text-sm font-semibold">+₹{extra.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(extra.name, (selectedExtras[extra.name] || 0) - 1, extra.maxQuantity)}
                      className="w-7 h-7 rounded-full bg-white border border-orange-300 flex items-center justify-center hover:bg-orange-100 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-orange-600" />
                    </button>
                    <span className="w-6 text-center font-semibold text-gray-800">
                      {selectedExtras[extra.name] || 0}
                    </span>
                    <button
                      onClick={() => setQty(extra.name, (selectedExtras[extra.name] || 0) + 1, extra.maxQuantity)}
                      className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between font-semibold text-gray-900 mb-4">
            <span>Total</span>
            <span className="text-orange-600">₹{meal.price + extrasTotal}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Skip Extras</Button>
            <Button onClick={handleConfirm} className="flex-1 bg-orange-500 hover:bg-orange-600">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { addToCart, updateExtras, isInCart, handleMenuUpdate } = useCart()
  const { connected, subscribeToMeal, unsubscribeFromMeal, onMenuUpdate, onMealDeleted } = useSocket()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [likedMeals, setLikedMeals] = useState<string[]>([])
  const [meals, setMeals] = useState<TiffinMenu[]>([])
  const [loading, setLoading] = useState(true)

  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle")
  const [isNearby, setIsNearby] = useState(false)

  // Extras modal
  const [extrasModal, setExtrasModal] = useState<TiffinMenu | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  // ── Fetch meals ─────────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true)
    try {
      let url = `${API_BASE_URL}/meals?availability=true`
      if (lat !== undefined && lng !== undefined) {
        url = `${API_BASE_URL}/meals/nearby?lat=${lat}&lng=${lng}&radius=5000`
        if (selectedType !== "all") url += `&mealType=${selectedType}`
        setIsNearby(true)
      } else {
        if (selectedType !== "all") url += `&mealType=${selectedType}`
        setIsNearby(false)
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const list: TiffinMenu[] = data.data || []
        setMeals(list.slice(0, 12))
      }
    } catch {
      // Network failure — keep existing meals
    } finally {
      setLoading(false)
    }
  }, [API_BASE_URL, selectedType])

  // Initial load
  useEffect(() => {
    if (userLocation) {
      fetchMeals(userLocation.lat, userLocation.lng)
    } else {
      fetchMeals()
    }
  }, [fetchMeals, userLocation])

  // ── Location permission ─────────────────────────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("denied")
      return
    }
    setLocationStatus("requesting")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLocation({ lat, lng })
        setLocationStatus("granted")
      },
      () => setLocationStatus("denied"),
      { timeout: 10000 }
    )
  }

  // ── Real-time socket subscriptions ──────────────────────────────────────────
  useEffect(() => {
    if (meals.length === 0) return

    // Subscribe to socket rooms for all visible meals
    meals.forEach((m) => subscribeToMeal(m._id))

    // Live menu update handler
    const offUpdate = onMenuUpdate(({ meal: updatedMeal }) => {
      setMeals((prev) =>
        prev.map((m) => (m._id === updatedMeal._id ? { ...m, ...updatedMeal } : m))
      )
      handleMenuUpdate({
        _id: updatedMeal._id,
        availability: updatedMeal.availability,
        price: updatedMeal.price,
        name: updatedMeal.name,
      })
    })

    // Meal deleted handler
    const offDelete = onMealDeleted(({ mealId }) => {
      setMeals((prev) => prev.filter((m) => m._id !== mealId))
    })

    return () => {
      meals.forEach((m) => unsubscribeFromMeal(m._id))
      offUpdate()
      offDelete()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals.map((m) => m._id).join(",")])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const toggleLike = (id: string) => {
    setLikedMeals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleAddToCart = (meal: TiffinMenu) => {
    if (meal.availableExtras && meal.availableExtras.length > 0) {
      setExtrasModal(meal)
    } else {
      addToCart({ ...meal, extraItems: [] })
    }
  }

  const handleExtrasConfirm = (extras: { name: string; pricePerUnit: number; quantity: number }[]) => {
    if (!extrasModal) return
    addToCart({ ...extrasModal, extraItems: [] })
    if (extras.length > 0) {
      // updateExtras after add (it's now in cart)
      setTimeout(() => updateExtras(extrasModal._id, extras), 50)
    }
    setExtrasModal(null)
  }

  const filteredMeals = meals.filter((m) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q) ||
      m.provider.name.toLowerCase().includes(q) ||
      m.items.some((i) => i.name.toLowerCase().includes(q))
    const matchType = selectedType === "all" || m.mealType === selectedType || m.category === selectedType
    return matchSearch && matchType
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Hero */}
      <motion.section
        className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <motion.div className="max-w-4xl mx-auto text-center" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="mb-6">
              <Badge className="bg-white/20 text-white border-white/30 mb-4">🍱 Authentic Homemade Tiffins</Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
                Fresh Tiffins,
                <br />
                <span className="text-yellow-300">Straight to You</span>
              </h1>
            </motion.div>
            <motion.p variants={itemVariants} className="text-xl md:text-2xl mb-8 text-orange-100 max-w-2xl mx-auto">
              Order full tiffin plates — roti, sabzi, dal, rice and more — from home cooks near you
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 transform hover:scale-105 transition-all shadow-lg">
                <Play className="w-5 h-5 mr-2" /> Order Now
              </Button>
              <Button size="lg" variant="outline" className="border-white text-orange-600 hover:bg-orange-50 hover:text-orange-600 transform hover:scale-105 transition-all">
                Become a Chef <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
          {/* Floating decorations */}
          <div className="absolute top-20 left-10 hidden lg:block">
            <motion.div variants={floatingVariants} animate="animate">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <ChefHat className="w-8 h-8" />
              </div>
            </motion.div>
          </div>
          <div className="absolute bottom-20 right-10 hidden lg:block">
            <motion.div variants={floatingVariants} animate="animate" transition={{ delay: 1 }}>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Heart className="w-10 h-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section className="py-16 bg-white" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} className="text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.2 }} viewport={{ once: true }} whileHover={{ scale: 1.05 }}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4 ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</h3>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Location Banner */}
      <section className="py-6 bg-orange-50 border-y border-orange-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {connected ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Wifi className="w-3 h-3" /> Live updates active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                    <WifiOff className="w-3 h-3" /> Connecting...
                  </span>
                )}
              </div>
              {isNearby && userLocation && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <MapPin className="w-3 h-3 mr-1" /> Showing nearby tiffins
                </Badge>
              )}
            </div>

            {locationStatus === "idle" && (
              <Button size="sm" onClick={requestLocation} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Navigation className="w-4 h-4 mr-2" /> Find Tiffins Near Me
              </Button>
            )}
            {locationStatus === "requesting" && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                Detecting location...
              </span>
            )}
            {locationStatus === "denied" && (
              <span className="text-sm text-gray-500">Location access denied — showing all tiffins</span>
            )}
            {locationStatus === "granted" && (
              <span className="text-sm text-green-600 flex items-center gap-1 font-medium">
                <MapPin className="w-4 h-4" /> Location detected ✓
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <motion.section className="py-12 bg-gray-50" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <div className="container mx-auto px-4">
          <motion.div className="max-w-4xl mx-auto" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-900">
              {isNearby ? "🍱 Tiffins Near You" : "Browse All Tiffins"}
            </motion.h2>
            <motion.div variants={itemVariants} className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, item (roti, dal), or chef..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg rounded-full border-2 border-gray-200 focus:border-orange-500 transition-colors"
              />
            </motion.div>
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center">
              {MEAL_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  onClick={() => setSelectedType(type)}
                  className={`capitalize rounded-full transition-all duration-200 ${
                    selectedType === type ? "bg-orange-500 hover:bg-orange-600 scale-105" : "hover:bg-orange-50 hover:border-orange-300"
                  }`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Tiffins Grid */}
      <motion.section className="py-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <div className="container mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={selectedType + searchQuery + (isNearby ? "nearby" : "global")}
            >
              {loading ? (
                <div className="col-span-full flex justify-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500" />
                </div>
              ) : (
                filteredMeals.map((meal) => (
                  <TiffinCard
                    key={meal._id}
                    meal={meal}
                    isLiked={likedMeals.includes(meal._id)}
                    onLike={toggleLike}
                    onAddToCart={handleAddToCart}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>

          {!loading && filteredMeals.length === 0 && (
            <motion.div className="text-center py-16" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No tiffins found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or meal type filter</p>
              {isNearby && (
                <Button onClick={() => fetchMeals()} variant="outline" className="mt-2">
                  Show all tiffins instead
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section className="py-20 bg-gradient-to-r from-orange-500 to-red-500 text-white" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <div className="container mx-auto px-4 text-center">
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold mb-6">Ready to Share Your Cooking?</motion.h2>
            <motion.p variants={itemVariants} className="text-xl mb-8 text-orange-100 max-w-2xl mx-auto">
              Join our community of home cooks and earn by sharing authentic tiffins
            </motion.p>
            <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 text-lg rounded-full shadow-lg">
                Become a Chef Partner <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Extras Modal */}
      <ExtrasModal
        meal={extrasModal}
        open={!!extrasModal}
        onClose={() => setExtrasModal(null)}
        onConfirm={handleExtrasConfirm}
      />
    </div>
  )
}
