"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { useToast } from "@/hooks/use-toast"
import { Search, Heart, ShoppingCart, SlidersHorizontal } from "lucide-react"

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
  }
}

const categories = ["all", "breakfast", "lunch", "dinner", "snacks", "beverage"]

export default function MealsPage() {
  const { token, user } = useAuth()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const [meals, setMeals] = useState<Meal[]>([])
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const [likedMeals, setLikedMeals] = useState<string[]>([])

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    fetchMeals()
  }, [])

  useEffect(() => {
    filterMeals()
  }, [meals, searchQuery, selectedCategory, priceRange])

  const fetchMeals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/meals`)

      if (response.ok) {
        const data = await response.json()
        setMeals(data.data)
        setFilteredMeals(data.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch meals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterMeals = () => {
    const filtered = meals.filter((meal) => {
      const matchesSearch =
        meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.provider.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === "all" || meal.category === selectedCategory

      const matchesPrice = meal.price >= priceRange.min && meal.price <= priceRange.max

      return matchesSearch && matchesCategory && matchesPrice && meal.availability
    })

    setFilteredMeals(filtered)
  }

  const toggleLike = (mealId: string) => {
    setLikedMeals((prev) => (prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId]))
  }

  const handleAddToCart = (meal: Meal) => {
    addToCart({
      _id: meal._id,
      name: meal.name,
      price: meal.price,
      mealType: meal.mealType || meal.category,
      category: meal.category,
      items: meal.items || [],
      availableExtras: meal.availableExtras || [],
      extraItems: [],
      photo: meal.photo,
      provider: meal.provider,
    })
  }

  const orderMeal = async (meal: Meal) => {
    if (!token || !user) {
      toast({
        title: "Authentication required",
        description: "Please login to place an order.",
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
          meal: meal._id,
          quantity: 1,
          extraItems: [],
          totalPrice: meal.price,
          deliveryAddress: user.address,
          deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          specialInstructions: "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Order placed successfully!",
          description: `Your order for ${meal.name} has been placed.`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to place order")
      }
    } catch (error) {
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to place order. Please try again.",
        variant: "destructive",
      })
    }
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Meals</h1>
            <p className="text-gray-600">Discover delicious homemade meals from local chefs</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search meals, cuisines, or chefs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* Price Filter */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, min: Number(e.target.value) }))}
                  className="w-20"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, max: Number(e.target.value) }))}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredMeals.length} of {meals.length} meals
            </p>
          </div>

          {/* Meals Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={`${selectedCategory}-${searchQuery}`}
            >
              {filteredMeals.map((meal, index) => (
                <motion.div
                  key={meal._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="relative"
                >
                  <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white h-full flex flex-col group cursor-pointer">
                    {/* Clickable image + info area → navigates to meal detail */}
                    <Link href={`/meals/${meal._id}`} className="block" id={`meal-card-link-${meal._id}`}>
                      <div className="relative">
                        <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center overflow-hidden">
                          {meal.photo ? (
                            <img
                              src={meal.photo}
                              alt={meal.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-6xl group-hover:scale-110 transition-transform duration-300">🍽️</div>
                          )}
                        </div>
                        <Badge className="absolute top-4 left-4 bg-orange-500 text-white capitalize">
                          {meal.category}
                        </Badge>
                      </div>

                      <CardContent className="p-6 pb-3">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-gray-900 line-clamp-1 flex-1 mr-2 group-hover:text-orange-600 transition-colors duration-200">{meal.name}</h3>
                          <span className="text-2xl font-bold text-orange-600 whitespace-nowrap">₹{meal.price}</span>
                        </div>
                        <p className="text-gray-600 line-clamp-2 text-sm">{meal.description}</p>
                        <p className="text-sm text-gray-500 mt-2">by {meal.provider.name}</p>
                      </CardContent>
                    </Link>

                    {/* Action buttons — outside the link so they don't trigger navigation */}
                    <div className="px-6 pb-5 mt-auto">
                      <div className="flex gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                          <Button
                            onClick={() => handleAddToCart(meal)}
                            variant="outline"
                            className="w-full"
                            size="sm"
                            id={`add-to-cart-${meal._id}`}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                          <Button
                            onClick={() => orderMeal(meal)}
                            className="bg-orange-500 hover:bg-orange-600 text-white w-full"
                            size="sm"
                            id={`order-now-${meal._id}`}
                          >
                            Order Now
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Like button — floating, outside link */}
                    <motion.button
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg z-10"
                      onClick={(e) => { e.preventDefault(); toggleLike(meal._id) }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Like meal"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors duration-200 ${
                          likedMeals.includes(meal._id) ? "text-red-500 fill-red-500" : "text-gray-600"
                        }`}
                      />
                    </motion.button>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* No Results */}
          {filteredMeals.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No meals found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse different categories</p>
              <Button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                  setPriceRange({ min: 0, max: 1000 })
                }}
              >
                Clear Filters
              </Button>
            </motion.div>
          )}


        </motion.div>
      </div>
    </div>
  )
}
