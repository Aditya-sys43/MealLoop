import React, { useState } from 'react';
import { X, Star, Plus, Minus, Leaf, Flame, ShieldCheck } from 'lucide-react';
import { Meal, Review } from '../types/mealloop';
import { MealImage } from './MealImage';

interface MealDetailModalProps {
  meal: Meal | null;
  reviews: Review[];
  onClose: () => void;
  onAddToCart: (meal: Meal, quantity: number) => void;
}

export function MealDetailModal({ meal, reviews, onClose, onAddToCart }: MealDetailModalProps) {
  const [qty, setQty] = useState(1);

  if (!meal) return null;

  const mealReviews = reviews.filter((r) => r.mealId === meal.id);
  const avgRating =
    mealReviews.length > 0
      ? (mealReviews.reduce((acc, r) => acc + r.rating, 0) / mealReviews.length).toFixed(1)
      : meal.ratingAvg.toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close meal details"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 text-slate-700 hover:bg-white shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-[4/3] md:aspect-auto md:h-full bg-slate-100">
            <MealImage
              src={meal.imageUrl}
              alt={meal.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span>{meal.category}</span>
                <span aria-hidden="true">·</span>
                <span>{meal.dietaryTag}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{meal.calories} kcal</span>
              </div>

              <h2 className="font-display text-2xl font-bold text-slate-900 leading-tight">
                {meal.title}
              </h2>
              <p className="text-sm font-medium text-emerald-800 mt-1">{meal.providerName}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                  <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                  {avgRating}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Hygiene Checked
                </span>
                <span className="inline-flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                  Steel Tiffin
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mt-4">{meal.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                  Prepared fresh before dispatch
                </span>
                <span>Zero plastic packaging</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-slate-500 block">Price per meal</span>
                  <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
                    ₹{meal.price}
                  </span>
                </div>

                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono tabular-nums text-sm font-semibold w-7 text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={!meal.isAvailable}
                onClick={() => {
                  onAddToCart(meal, qty);
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
              >
                {meal.isAvailable
                  ? `Add to Cart — ₹${(meal.price * qty).toFixed(0)}`
                  : 'Currently Unavailable'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Student Reviews Section */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Student Feedback ({mealReviews.length})
          </h3>
          {mealReviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              No written reviews yet for this dish. Order and rate it from your Student Dashboard.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {mealReviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{rev.userName}</span>
                    <span className="font-mono text-orange-600 font-semibold">{rev.rating}/5 ★</span>
                  </div>
                  <p className="text-xs text-slate-600">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
