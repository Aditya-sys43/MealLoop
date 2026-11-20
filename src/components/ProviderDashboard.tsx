import React, { useState } from 'react';
import {
  LogOut,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  ChefHat,
  Package,
  Star,
  BarChart3,
  Trash2,
  Power,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  CURATED_MEAL_IMAGES,
  DietaryTag,
  FoodProvider,
  Meal,
  MealCategory,
  Order,
  OrderStatus,
  PricingConfig,
  ProviderType,
  Review,
  Subscription,
  UserProfile,
} from '../types/mealloop';
import {
  createMeal,
  deleteMeal,
  registerFoodProvider,
  updateMeal,
  updateOrderContainerStatus,
  updateOrderStatus,
  updateProviderDetails,
  updateSubscriptionContainers,
  uploadMealImage,
} from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MealImage } from './MealImage';

interface ProviderDashboardProps {
  profile: UserProfile;
  emailVerified: boolean;
  providers: FoodProvider[];
  meals: Meal[];
  orders: Order[];
  subscriptions: Subscription[];
  reviews: Review[];
  pricing: PricingConfig;
}

export function ProviderDashboard({
  profile,
  emailVerified,
  providers,
  meals,
  orders,
  subscriptions,
  reviews,
  pricing,
}: ProviderDashboardProps) {
  const { logout, resendVerificationEmail, refreshVerificationStatus } = useAuth();
  const { showToast } = useToast();

  const myProvider = providers.find((p) => p.ownerId === profile.uid) || null;
  const myMeals = meals.filter((m) => m.providerOwnerId === profile.uid);
  const myOrders = orders.filter((o) => o.providerOwnerId === profile.uid);
  const mySubs = subscriptions.filter((s) => s.providerOwnerId === profile.uid);
  const myReviews = myProvider ? reviews.filter((r) => r.providerId === myProvider.id) : [];

  const [tab, setTab] = useState<'orders' | 'meals' | 'feedback' | 'reports'>('orders');

  // Kitchen Registration state
  const [kName, setKName] = useState('');
  const [kType, setKType] = useState<ProviderType>('Tiffin Service');
  const [kLocation, setKLocation] = useState('');
  const [kDesc, setKDesc] = useState('');
  const [registering, setRegistering] = useState(false);

  // Add Meal form state
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCat, setMCat] = useState<MealCategory>('Lunch');
  const [mTag, setMTag] = useState<DietaryTag>('Veg');
  const [mPrice, setMPrice] = useState<number>(pricing.defaultSellingPrice);
  const [mCost, setMCost] = useState<number>(pricing.estimatedVariableCost);
  const [mCalories, setMCalories] = useState<number>(620);
  const [mSpecial, setMSpecial] = useState(false);
  const [mImageUrl, setMImageUrl] = useState<string>(CURATED_MEAL_IMAGES.lunch);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [creatingMeal, setCreatingMeal] = useState(false);

  const handleRegisterKitchen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerified) {
      showToast('Please verify your email before registering a kitchen.', 'error');
      return;
    }
    setRegistering(true);
    try {
      await registerFoodProvider({
        ownerId: profile.uid,
        name: kName,
        type: kType,
        location: kLocation,
        description: kDesc,
      });
      showToast('Kitchen registered! Pending Admin approval to appear publicly.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kitchen registration failed.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myProvider) return;
    setStorageWarning(null);
    setUploadPct(0);

    const res = await uploadMealImage(myProvider.id, file, (pct) => setUploadPct(pct));
    setUploadPct(null);
    if (res.usedStorage && res.url) {
      setMImageUrl(res.url);
      showToast('Meal image uploaded to Firebase Storage!', 'success');
    } else if (res.warning) {
      setStorageWarning(res.warning);
    }
  };

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProvider) return;
    setCreatingMeal(true);
    try {
      await createMeal({
        provider: myProvider,
        title: mTitle,
        description: mDesc,
        category: mCat,
        dietaryTag: mTag,
        price: mPrice,
        variableCost: mCost,
        imageUrl: mImageUrl,
        calories: mCalories,
        isTodaysSpecial: mSpecial,
      });
      setMTitle('');
      setMDesc('');
      showToast('Meal published to your kitchen menu!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create meal.', 'error');
    } finally {
      setCreatingMeal(false);
    }
  };

  const totalRevenue = myOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const subRevenue = mySubs
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingOrders = myOrders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    'Order Placed': 'Order Accepted',
    'Order Accepted': 'Preparing',
    Preparing: 'Out for Delivery',
    'Out for Delivery': 'Delivered',
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {!emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Verify your email to manage your kitchen</h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Email verification is enforced by Firestore security rules before registering a kitchen or publishing meals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resendVerificationEmail().then(() => showToast('Verification email sent.', 'success'))}
              className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-amber-900"
            >
              Resend Link
            </button>
            <button
              type="button"
              onClick={() =>
                refreshVerificationStatus().then((ok) =>
                  showToast(ok ? 'Email verified!' : 'Still pending verification.', ok ? 'success' : 'info')
                )
              }
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">Food Provider Portal</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {myProvider ? myProvider.name : `Welcome, ${profile.displayName}`}
          </h1>
          {myProvider ? (
            <p className="text-xs text-slate-600 mt-1">
              {myProvider.type} · {myProvider.location} · Approval:{' '}
              <span
                className={`font-semibold ${
                  myProvider.status === 'approved'
                    ? 'text-emerald-700'
                    : myProvider.status === 'rejected'
                      ? 'text-red-700'
                      : 'text-orange-600'
                }`}
              >
                {myProvider.status.toUpperCase()}
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-600 mt-1">
              Complete your kitchen onboarding below to start serving DBS Global University students.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {myProvider && (
            <button
              type="button"
              onClick={() =>
                updateProviderDetails(myProvider.id, { isOpen: !myProvider.isOpen })
              }
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                myProvider.isOpen
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-300 bg-slate-100 text-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {myProvider.isOpen ? 'Kitchen Open' : 'Kitchen Closed'}
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Onboarding Form if no kitchen yet */}
      {!myProvider ? (
        <form
          onSubmit={handleRegisterKitchen}
          className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4"
        >
          <h2 className="font-display text-xl font-bold text-slate-900">
            Register Your Mess / Tiffin / Cloud Kitchen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kitchen Name</label>
              <input
                type="text"
                required
                maxLength={120}
                value={kName}
                onChange={(e) => setKName(e.target.value)}
                placeholder="Doon Valley Tiffin House"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Provider Type</label>
              <select
                value={kType}
                onChange={(e) => setKType(e.target.value as ProviderType)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Tiffin Service">Tiffin Service</option>
                <option value="Mess">Mess</option>
                <option value="Cloud Kitchen">Cloud Kitchen</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Dehradun Location / Distance from DBS Campus
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={kLocation}
              onChange={(e) => setKLocation(e.target.value)}
              placeholder="Selaqui / Chakrata Road, near DBS Global University"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kitchen Overview</label>
            <textarea
              rows={3}
              maxLength={500}
              value={kDesc}
              onChange={(e) => setKDesc(e.target.value)}
              placeholder="Hygienic homestyle North Indian meals prepared daily with minimal oil."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={registering}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 cursor-pointer"
          >
            {registering ? 'Submitting...' : 'Submit Kitchen for Approval'}
          </button>
        </form>
      ) : (
        <>
          {/* Provider KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <span className="text-xs text-slate-500">Active Order Queue</span>
              <p className="font-mono tabular-nums text-2xl font-bold text-orange-600 mt-1">
                {pendingOrders.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <span className="text-xs text-slate-500">Published Meals</span>
              <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
                {myMeals.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <span className="text-xs text-slate-500">Active Subscriptions</span>
              <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-1">
                {mySubs.filter((s) => s.status === 'Active').length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <span className="text-xs text-slate-500">Gross Kitchen Sales</span>
              <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
                ₹{(totalRevenue + subRevenue).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
            {[
              { id: 'orders' as const, label: `Incoming Orders (${myOrders.length})`, icon: Package },
              { id: 'meals' as const, label: `Meals & Menu (${myMeals.length})`, icon: ChefHat },
              { id: 'feedback' as const, label: `Feedback (${myReviews.length})`, icon: Star },
              { id: 'reports' as const, label: 'Sales Report', icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    tab === item.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: INCOMING ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
                  No incoming student orders yet.
                </div>
              ) : (
                myOrders.map((ord) => {
                  const nextStatus = NEXT_STATUS[ord.status];
                  return (
                    <div
                      key={ord.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono">{ord.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-800">{ord.customerName}</span>
                          <span aria-hidden="true">·</span>
                          <span>Container: {ord.containerStatus}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {ord.mealTitle} × {ord.quantity}{' '}
                          <span className="font-mono text-sm text-emerald-800 ml-1">
                            ₹{ord.totalAmount}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600">{ord.deliveryAddress}</p>
                        {ord.notes && (
                          <p className="text-xs text-orange-700">Note: {ord.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-700 mr-2">
                          {ord.status}
                        </span>
                        {nextStatus && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, nextStatus)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark {nextStatus}
                          </button>
                        )}
                        {ord.status === 'Order Placed' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, 'Cancelled')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                        {ord.status === 'Delivered' && ord.containerStatus !== 'Returned' && (
                          <button
                            type="button"
                            onClick={() => updateOrderContainerStatus(ord.id, 'Returned')}
                            className="px-3 py-2 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                          >
                            Confirm Container Returned
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: MEALS & IMAGE UPLOAD */}
          {tab === 'meals' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleCreateMeal}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-slate-900">Add New Meal</h2>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Meal Title</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    placeholder="Homestyle Dal Tadka & Jeera Rice"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                    <select
                      value={mCat}
                      onChange={(e) => setMCat(e.target.value as MealCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dietary Tag</label>
                    <select
                      value={mTag}
                      onChange={(e) => setMTag(e.target.value as DietaryTag)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value="Veg">Veg</option>
                      <option value="Homestyle">Homestyle</option>
                      <option value="High Protein">High Protein</option>
                      <option value="Jain Veg">Jain Veg</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={20}
                      max={1000}
                      value={mPrice}
                      onChange={(e) => setMPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1000}
                      value={mCost}
                      onChange={(e) => setMCost(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Calories</label>
                    <input
                      type="number"
                      min={100}
                      max={2000}
                      value={mCalories}
                      onChange={(e) => setMCalories(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    required
                    rows={2}
                    maxLength={600}
                    value={mDesc}
                    onChange={(e) => setMDesc(e.target.value)}
                    placeholder="Includes 4 rotis, dal, seasonal sabzi, rice & salad in reusable tiffin."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Firebase Storage Upload + Studio Image Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Meal Photo (Upload to Firebase Storage or select preset)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-700 text-xs font-semibold text-slate-700 cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-700" />
                    {uploadPct !== null ? `Uploading ${uploadPct}%...` : 'Upload Meal Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  {storageWarning && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      {storageWarning}
                    </p>
                  )}
                  <select
                    value={mImageUrl}
                    onChange={(e) => setMImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value={CURATED_MEAL_IMAGES.breakfast}>Preset: Breakfast Poha & Paratha</option>
                    <option value={CURATED_MEAL_IMAGES.lunch}>Preset: North Indian Student Thali</option>
                    <option value={CURATED_MEAL_IMAGES.hero}>Preset: Paneer & Dal Bento Tiffin</option>
                    <option value={CURATED_MEAL_IMAGES.dinner}>Preset: Rajma Chawal Eco Bowl</option>
                    <option value={CURATED_MEAL_IMAGES.protein}>Preset: High-Protein Paneer Bowl</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mSpecial}
                    onChange={(e) => setMSpecial(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  Feature in Today&apos;s Special Menu
                </label>

                <button
                  type="submit"
                  disabled={creatingMeal}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {creatingMeal ? 'Publishing...' : 'Publish Meal'}
                </button>
              </form>

              {/* Existing Kitchen Meals */}
              <div className="lg:col-span-7 space-y-4">
                {myMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <MealImage
                      src={meal.imageUrl}
                      alt={meal.title}
                      className="w-24 h-20 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">
                        {meal.category} · {meal.dietaryTag} · ₹{meal.price}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 truncate">{meal.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{meal.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateMeal(meal.id, { isAvailable: !meal.isAvailable })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          meal.isAvailable
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {meal.isAvailable ? 'Available' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMeal(meal.id)}
                        aria-label="Delete meal"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER FEEDBACK */}
          {tab === 'feedback' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900">Student Feedback</h2>
              {myReviews.length === 0 ? (
                <p className="text-xs text-slate-500">No student reviews received yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myReviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{rev.userName}</span>
                        <span className="font-mono font-semibold text-orange-600">{rev.rating}/5 ★</span>
                      </div>
                      <p className="text-xs text-slate-600">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SALES & SUBSCRIPTION REPORT */}
          {tab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Kitchen Sales & Active Subscriptions
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4">Subscriber</th>
                      <th className="py-2.5 pr-4">Plan</th>
                      <th className="py-2.5 pr-4">Slots</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4 text-right">Steel Tiffins</th>
                      <th className="py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mySubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium text-slate-900">{sub.customerName}</td>
                        <td className="py-3 pr-4">{sub.planType}</td>
                        <td className="py-3 pr-4">{sub.mealSlots.join(', ')}</td>
                        <td className="py-3 pr-4">{sub.status}</td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums">
                          <button
                            type="button"
                            onClick={() =>
                              updateSubscriptionContainers(sub.id, sub.containersInUse > 0 ? 0 : sub.mealsPerDay)
                            }
                            className="underline text-emerald-700"
                          >
                            {sub.containersInUse} in use
                          </button>
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums font-semibold">
                          ₹{sub.totalAmount}
                        </td>
                      </tr>
                    ))}
                    {mySubs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No active subscriptions assigned to your kitchen yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
