"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import type { TiffinItem, TiffinExtra } from "./SocketContext"

// An extra item selected by the user when ordering
export interface SelectedExtra {
  name: string
  pricePerUnit: number
  quantity: number
}

export interface CartItem {
  _id: string
  name: string
  price: number          // base tiffin price per unit
  mealType: string
  category: string
  items: TiffinItem[]    // tiffin components (for display)
  availableExtras: TiffinExtra[]
  extraItems: SelectedExtra[]  // what the user selected
  photo?: string
  provider: { _id: string; name: string }
  quantity: number       // how many full tiffins
  totalPrice: number     // computed: price*quantity + extras total
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (meal: Omit<CartItem, "quantity" | "totalPrice">) => void
  removeFromCart: (mealId: string) => void
  updateQuantity: (mealId: string, quantity: number) => void
  updateExtras: (mealId: string, extras: SelectedExtra[]) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  isInCart: (mealId: string) => boolean
  getCartItem: (mealId: string) => CartItem | undefined
  // Called when a menu:updated socket event fires for an in-cart meal
  handleMenuUpdate: (updatedMeal: { _id: string; availability: boolean; price: number; name: string }) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}

function computeItemTotal(item: Pick<CartItem, "price" | "quantity" | "extraItems">) {
  const extrasTotal = item.extraItems.reduce(
    (sum, e) => sum + e.pricePerUnit * e.quantity,
    0
  )
  return item.price * item.quantity + extrasTotal
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const { toast } = useToast()

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("tifintales-cart")
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed)) setCartItems(parsed)
      } catch {
        localStorage.removeItem("tifintales-cart")
      }
    }
    setIsLoaded(true)
  }, [])

  // Persist cart on every change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("tifintales-cart", JSON.stringify(cartItems))
    }
  }, [cartItems, isLoaded])

  const addToCart = (meal: Omit<CartItem, "quantity" | "totalPrice">) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === meal._id)
      if (existing) {
        toast({ title: "Quantity updated", description: `${meal.name} quantity increased.` })
        return prev.map((i) =>
          i._id === meal._id
            ? { ...i, quantity: i.quantity + 1, totalPrice: computeItemTotal({ ...i, quantity: i.quantity + 1 }) }
            : i
        )
      }
      toast({ title: "Added to cart", description: `${meal.name} has been added to your cart.` })
      const computedTotal = computeItemTotal({ price: meal.price, quantity: 1, extraItems: meal.extraItems || [] })
      const newItem: CartItem = { ...meal, quantity: 1, totalPrice: computedTotal }
      return [...prev, newItem]
    })
  }

  const removeFromCart = (mealId: string) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i._id === mealId)
      if (item) toast({ title: "Removed", description: `${item.name} removed from cart.` })
      return prev.filter((i) => i._id !== mealId)
    })
  }

  const updateQuantity = (mealId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(mealId); return }
    setCartItems((prev) =>
      prev.map((i) =>
        i._id === mealId
          ? { ...i, quantity, totalPrice: computeItemTotal({ ...i, quantity }) }
          : i
      )
    )
  }

  const updateExtras = (mealId: string, extras: SelectedExtra[]) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i._id === mealId
          ? { ...i, extraItems: extras, totalPrice: computeItemTotal({ ...i, extraItems: extras }) }
          : i
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
    toast({ title: "Cart cleared", description: "All items removed." })
  }

  const getTotalItems = () => cartItems.reduce((t, i) => t + i.quantity, 0)

  const getTotalPrice = () => cartItems.reduce((t, i) => t + i.totalPrice, 0)

  const isInCart = (mealId: string) => cartItems.some((i) => i._id === mealId)

  const getCartItem = (mealId: string) => cartItems.find((i) => i._id === mealId)

  // Called by SocketContext listener when a vendor updates a menu in real-time
  const handleMenuUpdate = (updatedMeal: { _id: string; availability: boolean; price: number; name: string }) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item._id !== updatedMeal._id) return item
        if (!updatedMeal.availability) {
          // Mark as unavailable so the cart page can warn the user
          toast({
            title: "⚠️ Menu update",
            description: `${updatedMeal.name} is no longer available. Please review your cart.`,
            variant: "destructive",
          })
        } else if (updatedMeal.price !== item.price) {
          toast({
            title: "Price changed",
            description: `${updatedMeal.name} price updated to ₹${updatedMeal.price}.`,
          })
        }
        return {
          ...item,
          price: updatedMeal.price,
          availability: updatedMeal.availability,
          totalPrice: computeItemTotal({ ...item, price: updatedMeal.price }),
        } as CartItem
      })
    )
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateExtras,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isInCart,
        getCartItem,
        handleMenuUpdate,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
