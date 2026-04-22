"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChefHat,
  DollarSign,
  Package,
  X,
  GripVertical,
} from "lucide-react"
import type { TiffinMenu, TiffinItem, TiffinExtra } from "@/contexts/SocketContext"

const MEAL_TYPES = ["lunch", "dinner", "breakfast", "snack"]

interface FormItem extends TiffinItem {
  id: string
}

interface FormExtra extends TiffinExtra {
  id: string
}

interface TiffinForm {
  name: string
  description: string
  price: string
  mealType: string
  availability: boolean
  items: FormItem[]
  availableExtras: FormExtra[]
}

const emptyForm = (): TiffinForm => ({
  name: "",
  description: "",
  price: "",
  mealType: "",
  availability: true,
  items: [],
  availableExtras: [],
})

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function ChefMealsPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const [meals, setMeals] = useState<TiffinMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<TiffinMenu | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<TiffinForm>(emptyForm())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  const fetchMeals = useCallback(async () => {
    try {
      // Use the /provider/me endpoint — server-side provider filter (no ObjectId string bug)
      const res = await fetch(`${API_BASE_URL}/meals/provider/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMeals(data.data)
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch tiffins.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [API_BASE_URL, token, toast])

  useEffect(() => {
    if (user && token && user.role === "provider") fetchMeals()
  }, [user, token, fetchMeals])

  const resetForm = () => {
    setFormData(emptyForm())
    setSelectedFile(null)
    setEditingMeal(null)
  }

  const openCreate = () => { resetForm(); setIsDialogOpen(true) }

  const openEdit = (meal: TiffinMenu) => {
    setFormData({
      name: meal.name,
      description: meal.description || "",
      price: meal.price.toString(),
      mealType: meal.mealType || meal.category || "",
      availability: meal.availability,
      items: (meal.items || []).map((it) => ({ ...it, id: uid() })),
      availableExtras: (meal.availableExtras || []).map((ex) => ({ ...ex, id: uid() })),
    })
    setEditingMeal(meal)
    setIsDialogOpen(true)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const addItem = () => {
    setFormData((f) => ({
      ...f,
      items: [...f.items, { id: uid(), name: "", quantity: "1 serving", isOptional: false }],
    }))
  }

  const updateItem = (id: string, patch: Partial<FormItem>) => {
    setFormData((f) => ({
      ...f,
      items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))
  }

  const removeItem = (id: string) => {
    setFormData((f) => ({ ...f, items: f.items.filter((it) => it.id !== id) }))
  }

  const addExtra = () => {
    setFormData((f) => ({
      ...f,
      availableExtras: [...f.availableExtras, { id: uid(), name: "", price: 0, maxQuantity: 10 }],
    }))
  }

  const updateExtra = (id: string, patch: Partial<FormExtra>) => {
    setFormData((f) => ({
      ...f,
      availableExtras: f.availableExtras.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    }))
  }

  const removeExtra = (id: string) => {
    setFormData((f) => ({ ...f, availableExtras: f.availableExtras.filter((ex) => ex.id !== id) }))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.mealType) {
      toast({ title: "Meal type required", description: "Please select Lunch, Dinner, etc.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const url = editingMeal
        ? `${API_BASE_URL}/meals/${editingMeal._id}`
        : `${API_BASE_URL}/meals`

      const fd = new FormData()
      fd.append("name", formData.name)
      fd.append("description", formData.description)
      fd.append("price", formData.price)
      fd.append("mealType", formData.mealType)
      fd.append("category", formData.mealType) // backward compat
      fd.append("availability", formData.availability.toString())
      // Send items and extras as JSON strings (parsed server-side)
      fd.append("items", JSON.stringify(formData.items.map(({ id, ...rest }) => rest)))
      fd.append("availableExtras", JSON.stringify(formData.availableExtras.map(({ id, ...rest }) => rest)))
      if (selectedFile) fd.append("mealPhoto", selectedFile)

      const res = await fetch(url, {
        method: editingMeal ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (res.ok) {
        toast({
          title: editingMeal ? "Tiffin updated!" : "Tiffin created!",
          description: `${formData.name} has been ${editingMeal ? "updated" : "published"} successfully.`,
        })
        setIsDialogOpen(false)
        resetForm()
        fetchMeals()
      } else {
        const err = await res.json()
        throw new Error(err.error || "Save failed")
      }
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAvailability = async (meal: TiffinMenu) => {
    try {
      const res = await fetch(`${API_BASE_URL}/meals/${meal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: !meal.availability }),
      })
      if (res.ok) {
        toast({
          title: "Availability updated",
          description: `${meal.name} is now ${!meal.availability ? "available" : "unavailable"}.`,
        })
        fetchMeals()
      }
    } catch {
      toast({ title: "Failed", description: "Could not update availability.", variant: "destructive" })
    }
  }

  const deleteMeal = async (meal: TiffinMenu) => {
    if (!confirm(`Delete "${meal.name}"?`)) return
    try {
      const res = await fetch(`${API_BASE_URL}/meals/${meal._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast({ title: "Deleted", description: `${meal.name} has been removed.` })
        fetchMeals()
      }
    } catch {
      toast({ title: "Failed", description: "Could not delete tiffin.", variant: "destructive" })
    }
  }

  if (user?.role !== "provider") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only providers can access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">My Tiffin Menus</h1>
              <p className="text-gray-500">Create and manage your full tiffin offerings</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" /> Create Tiffin Menu
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingMeal ? "Edit Tiffin Menu" : "Create New Tiffin Menu"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Tiffin Name *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Full South Indian Lunch" required />
                    </div>
                    <div>
                      <Label htmlFor="mealType">Meal Type *</Label>
                      <Select value={formData.mealType} onValueChange={(v) => setFormData((f) => ({ ...f, mealType: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {MEAL_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price (₹) *</Label>
                      <Input id="price" type="number" min="0" step="1" value={formData.price} onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))} placeholder="120" required />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what makes your tiffin special..." rows={2} />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="photo">Tiffin Photo</Label>
                      <Input id="photo" type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                    </div>
                  </div>

                  {/* Tiffin Items Builder */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Tiffin Items</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addItem} className="text-orange-600 border-orange-300">
                        <Plus className="w-3 h-3 mr-1" /> Add Item
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">List every component in this tiffin (roti, dal, sabzi, rice, etc.)</p>
                    <AnimatePresence>
                      {formData.items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2 mb-2 items-start"
                        >
                          <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 shrink-0" />
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            placeholder="Item name (e.g. Roti)"
                            className="flex-1"
                          />
                          <Input
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                            placeholder="Qty (e.g. 3 pcs)"
                            className="w-32"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-500 mt-2.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) => updateItem(item.id, { isOptional: e.target.checked })}
                              className="rounded"
                            />
                            Optional
                          </label>
                          <button type="button" onClick={() => removeItem(item.id)} className="mt-2 text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {formData.items.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No items added yet. Click "Add Item" to start building your tiffin.</p>
                    )}
                  </div>

                  {/* Extras Builder */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Available Extras (Optional)</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addExtra} className="text-blue-600 border-blue-300">
                        <Plus className="w-3 h-3 mr-1" /> Add Extra
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Things customers can add to their order (e.g. +2 Rotis, Papad, Sweet)</p>
                    <AnimatePresence>
                      {formData.availableExtras.map((ex) => (
                        <motion.div
                          key={ex.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2 mb-2 items-center"
                        >
                          <Input
                            value={ex.name}
                            onChange={(e) => updateExtra(ex.id, { name: e.target.value })}
                            placeholder="Extra name (e.g. Roti)"
                            className="flex-1"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                            <Input
                              type="number"
                              min="0"
                              value={ex.price}
                              onChange={(e) => updateExtra(ex.id, { price: parseFloat(e.target.value) || 0 })}
                              placeholder="Price"
                              className="pl-7"
                            />
                          </div>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={ex.maxQuantity}
                            onChange={(e) => updateExtra(ex.id, { maxQuantity: parseInt(e.target.value) || 1 })}
                            placeholder="Max"
                            className="w-16"
                            title="Max quantity per order"
                          />
                          <button type="button" onClick={() => removeExtra(ex.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {formData.availableExtras.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No extras defined. Customers can only order the base tiffin.</p>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="availability"
                      checked={formData.availability}
                      onChange={(e) => setFormData((f) => ({ ...f, availability: e.target.checked }))}
                      className="rounded w-4 h-4"
                    />
                    <Label htmlFor="availability">Available for orders right now</Label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" disabled={submitting} className="flex-1 bg-orange-500 hover:bg-orange-600">
                      {submitting ? "Saving..." : (editingMeal ? "Update Menu" : "Publish Menu")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Total Menus</p><p className="text-2xl font-bold">{meals.length}</p></div>
                <ChefHat className="w-8 h-8 text-orange-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold">{meals.filter((m) => m.availability).length}</p></div>
                <Package className="w-8 h-8 text-green-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div><p className="text-sm text-gray-500">Avg. Price</p><p className="text-2xl font-bold">₹{meals.length > 0 ? Math.round(meals.reduce((s, m) => s + m.price, 0) / meals.length) : 0}</p></div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </CardContent>
            </Card>
          </div>

          {/* Meals grid */}
          {meals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tiffin menus yet</h3>
                <p className="text-gray-500 mb-4">Create your first tiffin menu to start receiving orders!</p>
                <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Menu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.map((meal, idx) => (
                <motion.div key={meal._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}>
                  <Card className="overflow-hidden h-full flex flex-col">
                    <div className="relative">
                      <div className="w-full h-44 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center overflow-hidden">
                        {meal.photo ? (
                          <img src={meal.photo} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-5xl">🍱</div>
                        )}
                      </div>
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <Badge className="bg-orange-500 text-white capitalize">{meal.mealType || meal.category}</Badge>
                        <Badge className={`${meal.availability ? "bg-green-500" : "bg-gray-400"} text-white`}>
                          {meal.availability ? "Live" : "Hidden"}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 line-clamp-1 flex-1 mr-2">{meal.name}</h3>
                        <span className="font-bold text-orange-600">₹{meal.price}</span>
                      </div>
                      {meal.items && meal.items.length > 0 && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                          {meal.items.map((i) => i.name).join(" · ")}
                        </p>
                      )}
                      {meal.availableExtras && meal.availableExtras.length > 0 && (
                        <p className="text-xs text-blue-600 mb-3">{meal.availableExtras.length} extras available</p>
                      )}
                      <div className="flex gap-2 mt-auto">
                        <Button variant="outline" size="sm" onClick={() => toggleAvailability(meal)} className="flex-1">
                          {meal.availability ? <><EyeOff className="w-4 h-4 mr-1" /> Hide</> : <><Eye className="w-4 h-4 mr-1" /> Show</>}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(meal)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteMeal(meal)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
