import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, MapPin, Leaf, ArrowRight } from 'lucide-react';
import { CartItem, SavedAddress, UserProfile } from '../types/mealloop';
import { placeOrder } from '../services/firestoreService';
import { useToast } from '../context/ToastContext';
import { MealImage } from './MealImage';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (mealId: string, qty: number) => void;
  onClearCart: () => void;
  profile: UserProfile | null;
  emailVerified: boolean;
  addresses: SavedAddress[];
  onRequireAuth: () => void;
  onOrderComplete: () => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onClearCart,
  profile,
  emailVerified,
  addresses,
  onRequireAuth,
  onOrderComplete,
}: CartDrawerProps) {
  const { showToast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
  const resolvedAddress = selectedAddr
    ? `${selectedAddr.label}: ${selectedAddr.hostelOrPgName}${selectedAddr.roomNumber ? `, Room ${selectedAddr.roomNumber}` : ''}${selectedAddr.landmark ? ` (${selectedAddr.landmark})` : ''} · ${selectedAddr.phone}`
    : customAddress.trim();

  const handleCheckout = async () => {
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (!emailVerified) {
      showToast('Please verify your email address from your Dashboard before placing an order.', 'error');
      return;
    }
    if (items.length === 0) return;
    if (!resolvedAddress || resolvedAddress.length < 4) {
      showToast('Please select or enter a hostel/PG delivery address.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      for (const item of items) {
        await placeOrder({
          userId: profile.uid,
          customerName: profile.displayName,
          meal: item.meal,
          quantity: item.quantity,
          deliveryAddress: resolvedAddress,
          notes,
        });
      }

      onClearCart();
      setNotes('');
      showToast('Order placed! Track live kitchen status in your dashboard.', 'success');
      onClose();
      onOrderComplete();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to place order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Your Meal Cart</h2>
            <p className="text-xs text-slate-500">Delivered in MealLoop Green steel tiffins</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-slate-700">Your cart is empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Browse today&apos;s student meals starting at ₹80.
              </p>
            </div>
          ) : (
            <>
              {/* Itemized List */}
              <div className="space-y-4">
                {items.map(({ meal, quantity }) => (
                  <div
                    key={meal.id}
                    className="flex items-center gap-3 pb-4 border-b border-slate-100"
                  >
                    <MealImage
                      src={meal.imageUrl}
                      alt={meal.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{meal.title}</h3>
                      <p className="text-xs text-slate-500 truncate">{meal.providerName}</p>
                      <p className="font-mono tabular-nums text-sm font-semibold text-slate-900 mt-1">
                        ₹{meal.price * quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(meal.id, quantity - 1)}
                        aria-label="Decrease item quantity"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        {quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="font-mono tabular-nums text-xs font-semibold w-6 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(meal.id, quantity + 1)}
                        aria-label="Increase item quantity"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  Hostel / PG Delivery Address (Dehradun)
                </label>

                {addresses.length > 0 && (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} — {addr.hostelOrPgName} {addr.roomNumber ? `(Rm ${addr.roomNumber})` : ''}
                      </option>
                    ))}
                    <option value="">Enter another address manually</option>
                  </select>
                )}

                {(!selectedAddressId || addresses.length === 0) && (
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="e.g., DBS Boys Hostel Block B, Room 204, Selaqui, Dehradun"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                )}
              </div>

              {/* Delivery Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kitchen / Delivery Notes (Optional)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Less spicy, call on arrival at hostel gate"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* MealLoop Green Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                <Leaf className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>MealLoop Green:</strong> Your meal arrives in a sanitized reusable stainless-steel container. Leave it at your hostel desk for pickup on the next cycle.
                </span>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Delivery to DBS / Dehradun PG</span>
              <span className="font-mono font-semibold text-emerald-700">FREE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Order Total</span>
              <span className="font-mono tabular-nums text-xl font-bold text-slate-900">
                ₹{subtotal.toFixed(0)}
              </span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Placing Order...'
                : profile
                  ? `Place Order — ₹${subtotal.toFixed(0)}`
                  : 'Sign In to Place Order'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
