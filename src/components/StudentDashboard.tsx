import React, { useState } from 'react';
import {
  LogOut,
  MapPin,
  Package,
  Calendar,
  User as UserIcon,
  Bell,
  Plus,
  Trash2,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Star,
  RefreshCw,
} from 'lucide-react';
import {
  AppNotification,
  Complaint,
  Order,
  OrderStatus,
  SavedAddress,
  Subscription,
  UserProfile,
} from '../types/mealloop';
import {
  markNotificationRead,
  removeAddress,
  saveAddress,
  submitComplaint,
  submitReview,
  updateOrderContainerStatus,
  updateOrderStatus,
  updateSubscriptionStatus,
  updateUserProfile,
} from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface StudentDashboardProps {
  profile: UserProfile;
  emailVerified: boolean;
  orders: Order[];
  subscriptions: Subscription[];
  addresses: SavedAddress[];
  notifications: AppNotification[];
  complaints: Complaint[];
  onBrowseMenu: () => void;
  onCreatePlan: () => void;
}

const ORDER_STEPS: OrderStatus[] = [
  'Order Placed',
  'Order Accepted',
  'Preparing',
  'Out for Delivery',
  'Delivered',
];

export function StudentDashboard({
  profile,
  emailVerified,
  orders,
  subscriptions,
  addresses,
  notifications,
  complaints,
  onBrowseMenu,
  onCreatePlan,
}: StudentDashboardProps) {
  const { logout, resendVerificationEmail, refreshVerificationStatus, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'orders' | 'subscriptions' | 'addresses' | 'notifications'>('orders');

  // Review state
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Complaint state
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [cmpOrderId, setCmpOrderId] = useState('');
  const [cmpSubject, setCmpSubject] = useState('');
  const [cmpDesc, setCmpDesc] = useState('');

  // Address form
  const [addrLabel, setAddrLabel] = useState('Hostel');
  const [addrHostel, setAddrHostel] = useState('');
  const [addrRoom, setAddrRoom] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrPhone, setAddrPhone] = useState(profile.phone || '');

  // Profile form
  const [editName, setEditName] = useState(profile.displayName);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editHostel, setEditHostel] = useState(profile.hostelOrPg);

  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const unreadNotifs = notifications.filter((n) => !n.read);

  const handleResendVerify = async () => {
    try {
      await resendVerificationEmail();
      showToast('Verification email resent! Check your inbox.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send email.', 'error');
    }
  };

  const handleCheckVerify = async () => {
    const ok = await refreshVerificationStatus();
    if (ok) {
      showToast('Email verified! You can now place orders and manage addresses.', 'success');
    } else {
      showToast('Email is not verified yet. Please click the link in your email.', 'info');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'Cancelled');
      showToast('Order cancelled.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot cancel order.', 'error');
    }
  };

  const handleReturnContainer = async (orderId: string) => {
    try {
      await updateOrderContainerStatus(orderId, 'Return Scheduled');
      showToast('MealLoop Green container pickup scheduled.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to schedule return.', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder) return;
    try {
      await submitReview({
        userId: profile.uid,
        userName: profile.displayName,
        mealId: reviewOrder.mealId,
        providerId: reviewOrder.providerId,
        orderId: reviewOrder.id,
        rating,
        comment,
      });
      showToast('Thank you for rating your meal!', 'success');
      setReviewOrder(null);
      setComment('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit review.', 'error');
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitComplaint({
        userId: profile.uid,
        userName: profile.displayName,
        orderId: cmpOrderId,
        subject: cmpSubject,
        description: cmpDesc,
      });
      showToast('Issue logged. Our team will respond shortly.', 'success');
      setComplaintOpen(false);
      setCmpOrderId('');
      setCmpSubject('');
      setCmpDesc('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit issue.', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrHostel.trim() || !addrPhone.trim()) {
      showToast('Hostel/PG name and phone number are required.', 'error');
      return;
    }
    try {
      await saveAddress(profile.uid, {
        label: addrLabel,
        hostelOrPgName: addrHostel,
        roomNumber: addrRoom,
        landmark: addrLandmark,
        phone: addrPhone,
        isDefault: addresses.length === 0,
      });
      setAddrHostel('');
      setAddrRoom('');
      setAddrLandmark('');
      showToast('Delivery address saved!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save address.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile(profile.uid, {
        displayName: editName,
        phone: editPhone,
        hostelOrPg: editHostel,
        emailVerified,
      });
      await refreshProfile();
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Email Verification Gate Banner */}
      {!emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Verify your email address</h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Security rules require a verified email before placing meal orders, activating subscriptions, or saving addresses. Check {profile.email} for your verification link.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResendVerify}
              className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              Resend Link
            </button>
            <button
              type="button"
              onClick={handleCheckVerify}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              I&apos;ve Verified
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-emerald-700 mb-1">
            Student Dashboard · {profile.hostelOrPg || 'DBS Global University'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {profile.displayName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {profile.email} {emailVerified ? '· Verified Account' : '· Pending Verification'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBrowseMenu}
            className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            Order Single Meal
          </button>
          <button
            type="button"
            onClick={onCreatePlan}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 cursor-pointer"
          >
            New Meal Plan
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:text-red-700 hover:border-red-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs text-slate-500">Total Orders</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
            {orders.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs text-slate-500">Active Meal Plans</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-1">
            {activeSubs.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs text-slate-500">Saved Addresses</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
            {addresses.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs text-slate-500">Unread Alerts</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-orange-600 mt-1">
            {unreadNotifs.length}
          </p>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { id: 'orders' as const, label: 'Orders & Live Status', icon: Package },
          { id: 'subscriptions' as const, label: 'Subscriptions', icon: Calendar },
          { id: 'addresses' as const, label: 'Addresses & Profile', icon: MapPin },
          { id: 'notifications' as const, label: `Alerts & Help (${unreadNotifs.length})`, icon: Bell },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                tab === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ORDERS */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-800">No meal orders yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Explore today&apos;s fresh student meals from DBS Dehradun kitchens.
              </p>
              <button
                type="button"
                onClick={onBrowseMenu}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700"
              >
                Browse Today&apos;s Menu
              </button>
            </div>
          ) : (
            orders.map((ord) => {
              const stepIdx = ORDER_STEPS.indexOf(ord.status);
              return (
                <div
                  key={ord.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono">{ord.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ord.providerName}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                        {ord.mealTitle} × {ord.quantity}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{ord.deliveryAddress}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-mono tabular-nums text-xl font-bold text-slate-900 block">
                        ₹{ord.totalAmount}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          ord.status === 'Cancelled'
                            ? 'text-red-700'
                            : ord.status === 'Delivered'
                              ? 'text-emerald-700'
                              : 'text-orange-600'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  {/* 5-step Live Tracker */}
                  {ord.status !== 'Cancelled' && (
                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {ORDER_STEPS.map((step, idx) => {
                        const completed = idx <= stepIdx;
                        return (
                          <div key={step} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-colors ${
                                completed ? 'bg-emerald-700' : 'bg-slate-200'
                              }`}
                            />
                            <p
                              className={`text-[11px] leading-tight ${
                                completed ? 'font-semibold text-slate-900' : 'text-slate-400'
                              }`}
                            >
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Container: {ord.containerStatus}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.status === 'Order Placed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                      {ord.status === 'Delivered' &&
                        (ord.containerStatus === 'Issued' ||
                          ord.containerStatus === 'With Student') && (
                          <button
                            type="button"
                            onClick={() => handleReturnContainer(ord.id)}
                            className="px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                          >
                            Return Steel Container
                          </button>
                        )}
                      {ord.status === 'Delivered' && (
                        <button
                          type="button"
                          onClick={() => setReviewOrder(ord)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Rate Meal
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCmpOrderId(ord.id);
                          setComplaintOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                      >
                        Report Issue
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SUBSCRIPTIONS */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-800">No meal subscriptions yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Start a Daily, Weekly, or Monthly student plan to save up to 12%.
              </p>
              <button
                type="button"
                onClick={onCreatePlan}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
              >
                Explore Meal Plans
              </button>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{sub.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sub.providerName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Starts {sub.startDate}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {sub.planType} Plan — {sub.mealSlots.join(' + ')} ({sub.mealPreference})
                  </h3>
                  <p className="text-xs text-slate-600">
                    {sub.totalMeals} total meals · ₹{sub.pricePerMeal}/meal · {sub.deliveryAddress}
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">
                    Status: {sub.status} · {sub.containersInUse} steel containers in cycle
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="font-mono tabular-nums text-lg font-bold text-slate-900 mr-2">
                    ₹{sub.totalAmount}
                  </span>
                  {sub.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => updateSubscriptionStatus(sub.id, 'Paused')}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold cursor-pointer"
                    >
                      Pause Plan
                    </button>
                  )}
                  {sub.status === 'Paused' && (
                    <button
                      type="button"
                      onClick={() => updateSubscriptionStatus(sub.id, 'Active')}
                      className="px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                    >
                      Resume Plan
                    </button>
                  )}
                  {(sub.status === 'Active' || sub.status === 'Paused') && (
                    <button
                      type="button"
                      onClick={() => updateSubscriptionStatus(sub.id, 'Cancelled')}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: ADDRESSES & PROFILE */}
      {tab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Addresses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-lg font-bold text-slate-900">Saved Hostel & PG Addresses</h2>

            <div className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-xs text-slate-500">No saved addresses yet.</p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">{addr.label}</p>
                      <p className="text-sm font-medium text-slate-900">{addr.hostelOrPgName}</p>
                      <p className="text-xs text-slate-500">
                        {addr.roomNumber ? `Room ${addr.roomNumber} · ` : ''}
                        {addr.landmark ? `${addr.landmark} · ` : ''}
                        {addr.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAddress(addr.id)}
                      aria-label="Delete address"
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddAddress} className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">Add New Delivery Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder="Label (Hostel / PG)"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <input
                type="text"
                required
                maxLength={140}
                value={addrHostel}
                onChange={(e) => setAddrHostel(e.target.value)}
                placeholder="Hostel / PG Name (e.g., DBS Boys Hostel Block B)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  maxLength={40}
                  value={addrRoom}
                  onChange={(e) => setAddrRoom(e.target.value)}
                  placeholder="Room / Floor"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  maxLength={160}
                  value={addrLandmark}
                  onChange={(e) => setAddrLandmark(e.target.value)}
                  placeholder="Landmark (Selaqui / Miwala)"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Save Address
              </button>
            </form>
          </div>

          {/* Profile Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-emerald-700" />
              <h2 className="font-display text-lg font-bold text-slate-900">Student Profile</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Hostel / PG / Campus Cluster
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={editHostel}
                  onChange={(e) => setEditHostel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Update Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS & COMPLAINTS */}
      {tab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border ${
                      n.read ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">Support & Complaints</h2>
              <button
                type="button"
                onClick={() => setComplaintOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 cursor-pointer"
              >
                New Ticket
              </button>
            </div>
            {complaints.length === 0 ? (
              <p className="text-xs text-slate-500">No complaints submitted.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{c.subject}</span>
                      <span
                        className={`font-semibold ${
                          c.status === 'Resolved' ? 'text-emerald-700' : 'text-orange-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{c.description}</p>
                    {c.adminResponse && (
                      <p className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg mt-2">
                        Admin Reply: {c.adminResponse}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleReviewSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">
              Rate {reviewOrder.mealTitle}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Rating (1 to 5 Stars)
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Stars
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Feedback
              </label>
              <textarea
                required
                rows={3}
                maxLength={400}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was taste, hygiene, portion size, and tiffin delivery?"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleComplaintSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">Report a Meal Issue</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Order ID (Optional)
              </label>
              <input
                type="text"
                maxLength={128}
                value={cmpOrderId}
                onChange={(e) => setCmpOrderId(e.target.value)}
                placeholder="ord_..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={cmpSubject}
                onChange={(e) => setCmpSubject(e.target.value)}
                placeholder="Late delivery / Missing item / Hygiene concern"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                required
                rows={3}
                minLength={5}
                maxLength={600}
                value={cmpDesc}
                onChange={(e) => setCmpDesc(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComplaintOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700"
              >
                Submit Complaint
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
