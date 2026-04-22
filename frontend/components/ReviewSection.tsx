"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  Star,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  ImagePlus,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReviewUser {
  _id: string
  name: string
}

interface Review {
  _id: string
  rating: number
  text: string
  user: ReviewUser
  meal: string
  photos: string[]
  createdAt: string
}

interface ReviewSectionProps {
  mealId: string
}

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const [hovered, setHovered] = useState(0)

  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }[size]

  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star
        return (
          <motion.button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            whileHover={!readonly ? { scale: 1.2 } : {}}
            whileTap={!readonly ? { scale: 0.9 } : {}}
            className={readonly ? "cursor-default" : "cursor-pointer"}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`${sizeClass} transition-colors duration-150 ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-gray-300"
              }`}
            />
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Rating Summary Bar ───────────────────────────────────────────────────────

function RatingSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 mb-8">
      {/* Average */}
      <div className="flex flex-col items-center justify-center min-w-[100px]">
        <span className="text-5xl font-black text-orange-500">{avg.toFixed(1)}</span>
        <StarRating value={Math.round(avg)} readonly size="sm" />
        <span className="text-xs text-gray-500 mt-1">
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Breakdown bars */}
      <div className="flex-1 space-y-2">
        {counts.map(({ star, count }) => {
          const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 w-6">{star}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Single Review Card ───────────────────────────────────────────────────────

function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: {
  review: Review
  currentUserId?: string
  onEdit: (review: Review) => void
  onDelete: (reviewId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isOwner = currentUserId === review.user._id
  const date = new Date(review.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const initials = review.user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isLongText = review.text.length > 180
  const displayText = isLongText && !expanded ? review.text.slice(0, 180) + "…" : review.text

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-orange-100">
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{review.user.name}</p>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StarRating value={review.rating} readonly size="sm" />
          {isOwner && (
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                onClick={() => onEdit(review)}
                id={`edit-review-${review._id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    id={`delete-review-${review._id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your review will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => onDelete(review._id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <p className="text-gray-700 text-sm leading-relaxed">{displayText}</p>
      {isLongText && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}

      {/* Photos */}
      {review.photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {review.photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`Review photo ${i + 1}`}
                className="w-20 h-20 object-cover rounded-xl border border-gray-100 hover:scale-105 transition-transform duration-200 cursor-pointer"
              />
            </a>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Review Form ──────────────────────────────────────────────────────────────

function ReviewForm({
  mealId,
  token,
  editReview,
  onSuccess,
  onCancel,
}: {
  mealId: string
  token: string
  editReview?: Review | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rating, setRating] = useState(editReview?.rating ?? 0)
  const [text, setText] = useState(editReview?.text ?? "")
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(editReview?.photos ?? [])
  const [submitting, setSubmitting] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  const isEdit = !!editReview

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => f.type.startsWith("image/") && f.size < 5 * 1024 * 1024)
    if (valid.length < files.length) {
      toast({
        title: "Some files skipped",
        description: "Only images under 5 MB are allowed.",
        variant: "destructive",
      })
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, 5))
    const newPreviews = valid.map((f) => URL.createObjectURL(f))
    setPreviews((prev) => [...prev.filter((p) => !p.startsWith("blob:")), ...newPreviews].slice(0, 5))
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" })
      return
    }
    if (!text.trim()) {
      toast({ title: "Please write your review", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("rating", String(rating))
      formData.append("text", text.trim())
      photos.forEach((file) => formData.append("photos", file))

      const url = isEdit
        ? `${API_BASE_URL}/reviews/${editReview._id}`
        : `${API_BASE_URL}/meals/${mealId}/reviews`
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong")

      toast({
        title: isEdit ? "Review updated!" : "Review submitted!",
        description: isEdit
          ? "Your review has been updated successfully."
          : "Thank you for your feedback.",
      })
      onSuccess()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit review",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 mb-8"
    >
      <h3 className="font-semibold text-gray-900 mb-4 text-base">
        {isEdit ? "Edit Your Review" : "Write a Review"}
      </h3>

      {/* Star selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating *</label>
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <p className="text-xs text-orange-500 mt-1 font-medium">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      {/* Text area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="review-text">
          Your Review *
        </label>
        <Textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your experience with this meal…"
          rows={4}
          className="resize-none focus:ring-orange-400 focus:border-orange-400"
          maxLength={1000}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{text.length}/1000</p>
      </div>

      {/* Photo upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos (optional, max 5)
        </label>
        <div className="flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative w-20 h-20">
              <img
                src={src}
                alt={`preview ${i + 1}`}
                className="w-full h-full object-cover rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {previews.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center gap-1 hover:border-orange-500 hover:bg-orange-50 transition-colors text-orange-400 hover:text-orange-600"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          id="review-photo-input"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6"
          id="submit-review-btn"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEdit ? "Updating…" : "Submitting…"}
            </>
          ) : isEdit ? (
            "Update Review"
          ) : (
            "Submit Review"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </motion.form>
  )
}

// ─── Main ReviewSection ───────────────────────────────────────────────────────

export default function ReviewSection({ mealId }: ReviewSectionProps) {
  const { user, token } = useAuth()
  const { toast } = useToast()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editReview, setEditReview] = useState<Review | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meals/${mealId}/reviews`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.data)
      }
    } catch {
      toast({
        title: "Could not load reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [mealId])

  const handleDelete = async (reviewId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }
      toast({ title: "Review deleted" })
      setReviews((prev) => prev.filter((r) => r._id !== reviewId))
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete review",
        variant: "destructive",
      })
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditReview(null)
    fetchReviews()
  }

  const handleEdit = (review: Review) => {
    setEditReview(review)
    setShowForm(true)
    // Scroll to form
    setTimeout(() => {
      document.getElementById("review-form-anchor")?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditReview(null)
  }

  // Can this user add a review?
  const isCustomer = user?.role === "customer"
  const hasAlreadyReviewed = reviews.some((r) => r.user._id === user?._id)
  const canAddReview = isCustomer && !hasAlreadyReviewed && !showForm

  return (
    <section className="mt-10" id="reviews">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <p className="text-sm text-gray-500">
              {reviews.length === 0
                ? "No reviews yet — be the first!"
                : `${reviews.length} review${reviews.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {canAddReview && token && (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
              id="write-review-btn"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          </motion.div>
        )}

        {!token && (
          <p className="text-sm text-gray-400 italic">Log in to leave a review</p>
        )}

        {isCustomer && hasAlreadyReviewed && !showForm && (
          <p className="text-sm text-orange-500 font-medium">✓ You've reviewed this meal</p>
        )}
      </div>

      {/* Rating summary */}
      <RatingSummary reviews={reviews} />

      {/* Form anchor */}
      <div id="review-form-anchor" />

      {/* Review form */}
      <AnimatePresence>
        {showForm && token && (
          <ReviewForm
            mealId={mealId}
            token={token}
            editReview={editReview}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            <p className="text-gray-400 text-sm">Loading reviews…</p>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200"
        >
          <div className="text-5xl mb-4">⭐</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No reviews yet</h3>
          <p className="text-gray-400 text-sm">
            {isCustomer
              ? "Order this meal and share your experience!"
              : "Be the first to try this meal and leave a review."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                currentUserId={user?._id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
