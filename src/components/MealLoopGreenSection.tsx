import React from 'react';
import { Leaf, RefreshCw, ShieldCheck, Recycle, CheckCircle2 } from 'lucide-react';
import { CURATED_MEAL_IMAGES, Order, Subscription, UserProfile } from '../types/mealloop';
import { updateOrderContainerStatus } from '../services/firestoreService';
import { useToast } from '../context/ToastContext';
import { MealImage } from './MealImage';

interface MealLoopGreenSectionProps {
  profile: UserProfile | null;
  orders: Order[];
  subscriptions: Subscription[];
  onRequireAuth: () => void;
}

export function MealLoopGreenSection({
  profile,
  orders,
  subscriptions,
  onRequireAuth,
}: MealLoopGreenSectionProps) {
  const { showToast } = useToast();

  const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
  const returnedOrders = orders.filter((o) => o.containerStatus === 'Returned');
  const activeContainersFromOrders = orders.filter(
    (o) => o.status !== 'Cancelled' && (o.containerStatus === 'Issued' || o.containerStatus === 'With Student')
  );
  const activeContainersFromSubs = subscriptions
    .filter((s) => s.status === 'Active')
    .reduce((sum, s) => sum + s.containersInUse, 0);

  const plasticBoxesAvoided =
    deliveredOrders.reduce((sum, o) => sum + o.quantity, 0) +
    subscriptions.reduce((sum, s) => sum + (s.status === 'Active' ? s.mealsPerDay * 7 : 0), 0);

  const handleScheduleReturn = async (orderId: string) => {
    try {
      await updateOrderContainerStatus(orderId, 'Return Scheduled');
      showToast('Container pickup scheduled with your next delivery rider.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to schedule pickup.', 'error');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Split Editorial Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <p className="text-xs font-semibold text-emerald-700 mb-2">
            MealLoop Green · Circular Student Packaging
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
            Zero-plastic student tiffins built for Dehradun hostels
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-4 leading-relaxed">
            Every MealLoop order and subscription uses food-grade 304 stainless steel containers with leak-proof silicone seals. No soggy plastic boxes, no microplastics in hot dal, and zero hostel bin overflow.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div>
              <span className="font-mono tabular-nums text-2xl font-bold text-emerald-800 block">
                {plasticBoxesAvoided}
              </span>
              <span className="text-xs text-slate-500">Plastic boxes avoided</span>
            </div>
            <div>
              <span className="font-mono tabular-nums text-2xl font-bold text-slate-900 block">
                {activeContainersFromOrders.length + activeContainersFromSubs}
              </span>
              <span className="text-xs text-slate-500">Containers with you</span>
            </div>
            <div>
              <span className="font-mono tabular-nums text-2xl font-bold text-orange-600 block">
                {returnedOrders.length}
              </span>
              <span className="text-xs text-slate-500">Completed returns</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 min-h-[280px] bg-slate-100">
          <MealImage
            src={CURATED_MEAL_IMAGES.greenContainers}
            alt="MealLoop Green stackable stainless steel tiffin containers"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 3-Step Circular Loop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <ShieldCheck className="w-6 h-6 text-emerald-700 mb-3" />
          <h2 className="font-display text-lg font-bold text-slate-900">01. Hot-Sanitized Steel</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Partner kitchens sterilize returned steel tiffins at 85°C before packing your breakfast, lunch, or dinner.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <RefreshCw className="w-6 h-6 text-orange-600 mb-3" />
          <h2 className="font-display text-lg font-bold text-slate-900">02. Rinse & Swap at Hostel</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Give your container a quick water rinse after eating and swap it at your hostel/PG desk when the next meal arrives.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <Recycle className="w-6 h-6 text-emerald-700 mb-3" />
          <h2 className="font-display text-lg font-bold text-slate-900">03. Measurable Campus Impact</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Each active monthly subscriber prevents over 40 single-use plastic containers and foil lids from entering Dehradun landfills.
          </p>
        </div>
      </div>

      {/* Live Container Return Tracker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Your Container Return Status
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Track steel containers issued to your orders and schedule pickups in one tap.
            </p>
          </div>
          {!profile && (
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              Sign In to Track Containers
            </button>
          )}
        </div>

        {!profile ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Sign in to view your active MealLoop Green containers and schedule returns.
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No container records yet. Place an order or start a meal plan to receive your first MealLoop Green steel tiffin.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 10).map((ord) => (
              <div
                key={ord.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{ord.id.slice(0, 12)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ord.providerName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Order: {ord.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {ord.mealTitle} (×{ord.quantity} steel container{ord.quantity > 1 ? 's' : ''})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      ord.containerStatus === 'Returned'
                        ? 'text-emerald-700'
                        : ord.containerStatus === 'Return Scheduled'
                          ? 'text-orange-600'
                          : 'text-slate-700'
                    }`}
                  >
                    {ord.containerStatus === 'Returned' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Leaf className="w-4 h-4" />
                    )}
                    {ord.containerStatus}
                  </span>

                  {(ord.containerStatus === 'Issued' || ord.containerStatus === 'With Student') &&
                    ord.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleScheduleReturn(ord.id)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Schedule Return
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
