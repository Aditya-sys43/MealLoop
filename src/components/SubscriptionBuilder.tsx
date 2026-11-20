import React, { useEffect, useState } from 'react';
import { Calendar, Check, Leaf, MapPin, ArrowRight } from 'lucide-react';
import {
  DietaryTag,
  FoodProvider,
  MealCategory,
  PlanType,
  PricingConfig,
  SavedAddress,
  UserProfile,
} from '../types/mealloop';
import { createSubscription } from '../services/firestoreService';
import { useToast } from '../context/ToastContext';

interface SubscriptionBuilderProps {
  pricing: PricingConfig;
  providers: FoodProvider[];
  profile: UserProfile | null;
  emailVerified: boolean;
  addresses: SavedAddress[];
  onRequireAuth: () => void;
  onSubscribed: () => void;
}

const PLAN_OPTIONS: {
  type: PlanType;
  label: string;
  audience: string;
  defaultDays: number;
  description: string;
}[] = [
  {
    type: 'Daily',
    label: 'Daily Meal Plan',
    audience: 'For trial & exam days',
    defaultDays: 1,
    description: 'Flexible single-day tiffins with zero lock-in.',
  },
  {
    type: 'Weekly',
    label: 'Weekly Meal Plan',
    audience: 'For busy class weeks',
    defaultDays: 7,
    description: '7-day recurring delivery with weekly plan savings.',
  },
  {
    type: 'Monthly',
    label: 'Monthly Meal Plan',
    audience: 'Best for hostel & PG residents',
    defaultDays: 20,
    description: '20-day or 30-day predictable budget plan with maximum savings.',
  },
];

const MEAL_SLOTS: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner'];
const DIETARY_PREFS: DietaryTag[] = ['Veg', 'Homestyle', 'High Protein', 'Jain Veg'];

export function SubscriptionBuilder({
  pricing,
  providers,
  profile,
  emailVerified,
  addresses,
  onRequireAuth,
  onSubscribed,
}: SubscriptionBuilderProps) {
  const { showToast } = useToast();
  const approvedProviders = providers.filter((p) => p.status === 'approved');

  const [planType, setPlanType] = useState<PlanType>('Weekly');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [mealSlots, setMealSlots] = useState<MealCategory[]>(['Lunch', 'Dinner']);
  const [mealPreference, setMealPreference] = useState<DietaryTag>('Veg');
  const [providerId, setProviderId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (approvedProviders.length > 0 && !providerId) {
      setProviderId(approvedProviders[0].id);
    }
  }, [approvedProviders, providerId]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  const handlePlanChange = (nextPlan: PlanType) => {
    setPlanType(nextPlan);
    const found = PLAN_OPTIONS.find((p) => p.type === nextPlan);
    if (found) setDurationDays(found.defaultDays);
  };

  const toggleSlot = (slot: MealCategory) => {
    setMealSlots((prev) => {
      if (prev.includes(slot)) {
        if (prev.length === 1) return prev; // require at least 1 slot
        return prev.filter((s) => s !== slot);
      }
      return [...prev, slot];
    });
  };

  const discountPct =
    planType === 'Daily'
      ? pricing.dailyPlanDiscountPct
      : planType === 'Weekly'
        ? pricing.weeklyPlanDiscountPct
        : pricing.monthlyPlanDiscountPct;

  const effectivePerMeal = Number(
    (pricing.defaultSellingPrice * (1 - discountPct / 100)).toFixed(2)
  );
  const mealsPerDay = mealSlots.length;
  const totalMeals = mealsPerDay * durationDays;
  const totalAmount = Number((totalMeals * effectivePerMeal).toFixed(0));

  const selectedProvider = approvedProviders.find((p) => p.id === providerId);
  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
  const resolvedAddress = selectedAddr
    ? `${selectedAddr.label}: ${selectedAddr.hostelOrPgName}${selectedAddr.roomNumber ? `, Room ${selectedAddr.roomNumber}` : ''} · ${selectedAddr.phone}`
    : customAddress.trim();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (!emailVerified) {
      showToast('Verify your email from your Dashboard before activating a subscription.', 'error');
      return;
    }
    if (!selectedProvider) {
      showToast('Please select an approved kitchen partner.', 'error');
      return;
    }
    if (!resolvedAddress || resolvedAddress.length < 4) {
      showToast('Please provide a valid Dehradun hostel or PG delivery address.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await createSubscription({
        userId: profile.uid,
        customerName: profile.displayName,
        provider: selectedProvider,
        planType,
        mealPreference,
        mealSlots,
        durationDays,
        pricePerMeal: effectivePerMeal,
        deliveryAddress: resolvedAddress,
        startDate,
      });

      showToast(`${planType} meal subscription activated!`, 'success');
      onSubscribed();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create subscription.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold text-emerald-700 mb-1.5">
          Flexible Student Meal Subscriptions
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
          Predictable hostel meals starting at ₹{pricing.defaultSellingPrice} per meal
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
          Configure daily, weekly, or monthly tiffin plans around your DBS Global University class schedule. Pause anytime and receive meals in sanitized steel containers.
        </p>
      </div>

      {/* 3 Plan Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLAN_OPTIONS.map((plan) => {
          const pct =
            plan.type === 'Daily'
              ? pricing.dailyPlanDiscountPct
              : plan.type === 'Weekly'
                ? pricing.weeklyPlanDiscountPct
                : pricing.monthlyPlanDiscountPct;
          const unit = Number((pricing.defaultSellingPrice * (1 - pct / 100)).toFixed(0));
          const active = planType === plan.type;

          return (
            <button
              key={plan.type}
              type="button"
              onClick={() => handlePlanChange(plan.type)}
              className={`text-left p-6 rounded-2xl border transition-all cursor-pointer ${
                active
                  ? 'border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-500">{plan.audience}</span>
                {pct > 0 && (
                  <span className="text-xs font-semibold text-orange-600 font-mono">
                    Save {pct}%
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900">{plan.label}</h2>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">
                  ₹{unit}
                </span>
                <span className="text-xs text-slate-500">/ meal</span>
              </div>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{plan.description}</p>
            </button>
          );
        })}
      </div>

      {/* Interactive Configurator + Pricing Summary */}
      <form
        onSubmit={handleSubscribe}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Configure Your {planType} Plan
          </h3>

          {/* Kitchen Partner */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Local Kitchen Partner
            </label>
            {approvedProviders.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                No approved food providers are published yet. An admin can seed or approve Dehradun kitchens from the Admin Console.
              </p>
            ) : (
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {approvedProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type} · {p.location} · ★ {p.hygieneScore.toFixed(1)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Meal Slots */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Daily Meal Slots ({mealsPerDay} meal{mealsPerDay > 1 ? 's' : ''}/day)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {MEAL_SLOTS.map((slot) => {
                const selected = mealSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                      selected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4 text-emerald-700" />}
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meal Preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Meal Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DIETARY_PREFS.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setMealPreference(pref)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    mealPreference === pref
                      ? 'border-orange-600 bg-orange-50 text-orange-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subscription Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Standard monthly student plans use 20 or 30 active meal days.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Subscription Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              Hostel / PG Delivery Address
            </label>
            {addresses.length > 0 && (
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white mb-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} — {addr.hostelOrPgName} {addr.roomNumber ? `(Rm ${addr.roomNumber})` : ''}
                  </option>
                ))}
                <option value="">Use a custom Dehradun address</option>
              </select>
            )}
            {(!selectedAddressId || addresses.length === 0) && (
              <input
                type="text"
                maxLength={300}
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="DBS Global University Hostel / Premnagar PG, Dehradun"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            )}
          </div>
        </div>

        {/* Sticky Summary Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 lg:sticky lg:top-24 space-y-5">
          <h3 className="font-display text-lg font-bold text-slate-900">Subscription Summary</h3>

          <div className="space-y-3 text-sm border-b border-slate-100 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-600">Plan Tier</span>
              <span className="font-semibold text-slate-900">{planType} Plan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Preference & Slots</span>
              <span className="font-medium text-slate-900">
                {mealPreference} · {mealSlots.join(', ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Meals</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {mealsPerDay}/day × {durationDays} days = {totalMeals} meals
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Rate per Meal</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-800">
                ₹{effectivePerMeal} {discountPct > 0 ? `(${discountPct}% off ₹${pricing.defaultSellingPrice})` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hostel / PG Delivery</span>
              <span className="font-mono font-semibold text-emerald-700">₹0</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900">Total Subscription Price</span>
            <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
            <Leaf className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              Includes {mealsPerDay} reusable MealLoop Green steel tiffin{mealsPerDay > 1 ? 's' : ''} in active rotation—saving ~{totalMeals} single-use plastic containers.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || approvedProviders.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? 'Activating Plan...'
              : profile
                ? `Start ${planType} Plan — ₹${totalAmount.toLocaleString('en-IN')}`
                : 'Sign In to Subscribe'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
