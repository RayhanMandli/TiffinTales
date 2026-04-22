import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { SocketProvider } from "@/contexts/SocketContext"
import { Toaster } from "@/components/ui/toaster"
import Navigation from "@/components/Navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TifinTales - Homemade Tiffin Delivery",
  description: "Discover authentic home-cooked tiffins from local providers delivered fresh to your doorstep",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <Navigation />
              <main>{children}</main>
              <Toaster />
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
