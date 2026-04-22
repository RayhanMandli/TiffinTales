"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { useToast } from "@/hooks/use-toast"

interface MenuUpdatePayload {
  meal: TiffinMenu
  updatedBy: string
}

interface OrderUpdatePayload {
  orderId: string
  status: string
  mealName: string
}

interface OrderNewPayload {
  order: object
  message: string
}

export interface TiffinItem {
  name: string
  quantity: string
  isOptional: boolean
}

export interface TiffinExtra {
  name: string
  price: number
  maxQuantity: number
}

export interface TiffinMenu {
  _id: string
  name: string
  description: string
  price: number
  mealType: string
  category: string
  availability: boolean
  photo?: string
  items: TiffinItem[]
  availableExtras: TiffinExtra[]
  providerLocation?: { type: string; coordinates: [number, number] }
  distance?: number
  provider: { _id: string; name: string; email?: string; profilePhoto?: string }
  createdAt: string
  updatedAt: string
}

interface SocketContextType {
  connected: boolean
  subscribeToMeal: (mealId: string) => void
  unsubscribeFromMeal: (mealId: string) => void
  onMenuUpdate: (handler: (payload: MenuUpdatePayload) => void) => () => void
  onMealDeleted: (handler: (payload: { mealId: string }) => void) => () => void
  onOrderUpdate: (handler: (payload: OrderUpdatePayload) => void) => () => void
  onOrderNew: (handler: (payload: OrderNewPayload) => void) => () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000"

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
      console.log("[Socket] Connected:", socket.id)

      // Auto-join the user's personal room for order status updates
      if (user?._id) {
        socket.emit("join:user", user._id)
      }
      // Providers auto-join their provider room
      if (user?.role === "provider" && user?._id) {
        socket.emit("join:provider", user._id)
      }
    })

    socket.on("disconnect", (reason) => {
      setConnected(false)
      console.log("[Socket] Disconnected:", reason)
    })

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message)
    })

    // Global order status listener — show toast to customers
    socket.on("order:updated", (payload: OrderUpdatePayload) => {
      const statusLabels: Record<string, string> = {
        confirmed: "✅ Confirmed",
        preparing: "👨‍🍳 Being Prepared",
        ready: "📦 Ready for Delivery",
        delivered: "🎉 Delivered",
        cancelled: "❌ Cancelled",
      }
      toast({
        title: `Order ${statusLabels[payload.status] || payload.status}`,
        description: `Your ${payload.mealName} order has been updated.`,
      })
    })

    // Global new order listener — notify providers
    socket.on("order:new", (payload: OrderNewPayload) => {
      if (user?.role === "provider") {
        toast({
          title: "🛎️ New Order!",
          description: payload.message,
        })
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SOCKET_URL, user?._id])

  // Re-join rooms when user changes (login/logout)
  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected || !user?._id) return

    socket.emit("join:user", user._id)
    if (user.role === "provider") {
      socket.emit("join:provider", user._id)
    }
  }, [user?._id, user?.role])

  const subscribeToMeal = (mealId: string) => {
    socketRef.current?.emit("join:meal", mealId)
  }

  const unsubscribeFromMeal = (mealId: string) => {
    socketRef.current?.emit("leave:meal", mealId)
  }

  // Event subscription helpers — return cleanup functions
  const onMenuUpdate = (handler: (payload: MenuUpdatePayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on("menu:updated", handler)
    return () => socket.off("menu:updated", handler)
  }

  const onMealDeleted = (handler: (payload: { mealId: string }) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on("meal:deleted", handler)
    return () => socket.off("meal:deleted", handler)
  }

  const onOrderUpdate = (handler: (payload: OrderUpdatePayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on("order:updated", handler)
    return () => socket.off("order:updated", handler)
  }

  const onOrderNew = (handler: (payload: OrderNewPayload) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on("order:new", handler)
    return () => socket.off("order:new", handler)
  }

  return (
    <SocketContext.Provider
      value={{ connected, subscribeToMeal, unsubscribeFromMeal, onMenuUpdate, onMealDeleted, onOrderUpdate, onOrderNew }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) throw new Error("useSocket must be used within a SocketProvider")
  return context
}
