import React, { useMemo, useState } from 'react';
import { Search, Plus, Star, ArrowRight, Sparkles } from 'lucide-react';
import {
  CURATED_MEAL_IMAGES,
  FoodProvider,
  Meal,
  MealCategory,
  PricingConfig,
  Review,
} from '../types/mealloop';
import { MealImage } from './MealImage';

interface MenuShowcaseProps {
  meals: Meal[];
  providers: FoodProvider[];
  reviews: Review[];
  pricing: PricingConfig;
  loading: boolean;
  onSelectMeal: (meal: Meal) => void;
  onAddToCart: (meal: Meal) => void;
  onNavigatePlans: () => void;
  onNavigateGreen: () => void;
}

export function MenuShowcase({
  meals,
  providers,
  reviews,
  pricing,
  loading,
  onSelectMeal,
  onAddToCart,
  onNavigatePlans,
  onNavigateGreen,
}: MenuShowcaseProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | MealCategory>('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState<'all' | '80' | '100'>('all');
  const [specialOnly, setSpecialOnly] = useState(false);

  const filteredMeals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return meals.filter((m) => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (maxPriceFilter === '80' && m.price > 80) return false;
      if (maxPriceFilter === '100' && m.price > 100) return false;
      if (specialOnly && !m.isTodaysSpecial) return false;
      if (term) {
        const hay = `${m.title} ${m.description} ${m.providerName} ${m.dietaryTag}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [meals, search, categoryFilter, maxPriceFilter, specialOnly]);

  const approvedCount = providers.filter((p) => p.status === 'approved').length;

  return (
    <div className="space-y-12 pb-16">
      {/* Split-Screen Editorial Storefront Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <p className="text-xs font-semibold text-emerald-700 mb-3">
              DBS Global University · Dehradun Hostel & PG Delivery
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance">
              Hygienic student tiffins delivered at ₹{pricing.defaultSellingPrice}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-4 leading-relaxed max-w-xl">
              Skip overpriced delivery apps and repetitive mess food. Subscribe to vetted local kitchens around Selaqui and Premnagar with zero-plastic MealLoop Green steel containers.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#todays-menu"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Explore Today&apos;s Menu
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onNavigatePlans}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Build Meal Plan
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[260px] lg:min-h-[420px] bg-slate-100">
            <MealImage
              src={CURATED_MEAL_IMAGES.hero}
              alt="MealLoop hygienic student bento meal in reusable steel container"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Full-Width 4-Column Venture Value Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <span className="font-mono tabular-nums text-lg font-bold text-slate-900 block">
              ₹{pricing.defaultSellingPrice} / meal
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Built for student budgets
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <span className="font-display text-lg font-bold text-slate-900 block">
              Daily · Weekly · Monthly
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Pause or switch slots anytime
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <span className="font-display text-lg font-bold text-emerald-800 block">
              {approvedCount > 0 ? `${approvedCount} Verified Kitchens` : 'Vetted Local Messes'}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Hygiene-checked Dehradun partners
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateGreen}
            className="text-left bg-white border border-slate-200 hover:border-emerald-700 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer"
          >
            <span className="font-display text-lg font-bold text-emerald-800 block">
              MealLoop Green
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Reusable 304 steel containers →
            </span>
          </button>
        </div>
      </section>

      {/* Today's Menu & Meal Discovery */}
      <section id="todays-menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1">
              Breakfast · Lunch · Dinner
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Today&apos;s Menu & Available Meals
            </h2>
          </div>

          {/* Search & Price Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meals or kitchens..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <select
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value as 'all' | '80' | '100')}
              aria-label="Filter by price"
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">All Prices</option>
              <option value="80">Under ₹80</option>
              <option value="100">Under ₹100</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSpecialOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              specialOnly
                ? 'border-orange-600 bg-orange-50 text-orange-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Today&apos;s Specials
          </button>
        </div>

        {/* Meal Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <h3 className="font-display text-lg font-bold text-slate-900">
              {meals.length === 0
                ? 'No meals published in the database yet'
                : 'No meals match your current filter'}
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              {meals.length === 0
                ? 'Sign in as the Platform Admin (aditya.0251mba359@dgu.ac.in) to seed the DBS Global University starter catalog, or register as a Food Provider to publish fresh meals.'
                : 'Try clearing your search query or switching meal category tabs.'}
            </p>
            {meals.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('All');
                  setMaxPriceFilter('all');
                  setSpecialOnly(false);
                }}
                className="mt-4 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeals.map((meal) => {
              const mealRevs = reviews.filter((r) => r.mealId === meal.id);
              const avg =
                mealRevs.length > 0
                  ? (mealRevs.reduce((acc, r) => acc + r.rating, 0) / mealRevs.length).toFixed(1)
                  : meal.ratingAvg.toFixed(1);

              return (
                <article
                  key={meal.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectMeal(meal)}
                      className="block w-full aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer"
                    >
                      <MealImage
                        src={meal.imageUrl}
                        alt={meal.title}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="p-5">
                      {/* Zero-pill clean unboxed metadata */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="truncate">
                          {meal.category} · {meal.dietaryTag} · {meal.providerName}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 shrink-0 ml-2">
                          <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                          {avg}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectMeal(meal)}
                        className="text-left block w-full cursor-pointer"
                      >
                        <h3 className="font-display text-lg font-bold text-slate-900 leading-snug hover:text-emerald-800 transition-colors">
                          {meal.title}
                        </h3>
                      </button>

                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {meal.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono tabular-nums text-xl font-bold text-slate-900">
                        ₹{meal.price}
                      </span>
                      {meal.isTodaysSpecial && (
                        <span className="text-[11px] font-medium text-orange-600 ml-2">
                          Today&apos;s Special
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!meal.isAvailable}
                      onClick={() => onAddToCart(meal)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {meal.isAvailable ? 'Add to Cart' : 'Sold Out'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
