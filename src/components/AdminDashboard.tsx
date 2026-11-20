import React, { useEffect, useState } from 'react';
import {
  LogOut,
  Users,
  Store,
  Package,
  IndianRupee,
  Calendar,
  Database,
  Check,
  X,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Category,
  Complaint,
  ComplaintStatus,
  FoodProvider,
  Meal,
  Order,
  OrderStatus,
  PricingConfig,
  Subscription,
  UserProfile,
  UserRole,
} from '../types/mealloop';
import {
  adminResolveComplaint,
  adminUpdateOrder,
  adminUpdateProviderStatus,
  adminUpdateUserRole,
  deleteCategory,
  deleteMeal,
  saveCategory,
  savePricingConfig,
  seedStarterCatalog,
  updateMeal,
} from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AdminDashboardProps {
  profile: UserProfile;
  users: UserProfile[];
  providers: FoodProvider[];
  categories: Category[];
  meals: Meal[];
  orders: Order[];
  subscriptions: Subscription[];
  complaints: Complaint[];
  pricing: PricingConfig;
}

export function AdminDashboard({
  profile,
  users,
  providers,
  categories,
  meals,
  orders,
  subscriptions,
  complaints,
  pricing,
}: AdminDashboardProps) {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'providers' | 'orders' | 'pricing' | 'users' | 'complaints'>('providers');
  const [seeding, setSeeding] = useState(false);

  // Pricing form
  const [sellPrice, setSellPrice] = useState(pricing.defaultSellingPrice);
  const [varCost, setVarCost] = useState(pricing.estimatedVariableCost);
  const [fixedCost, setFixedCost] = useState(pricing.monthlyFixedCost);
  const [dailyDisc, setDailyDisc] = useState(pricing.dailyPlanDiscountPct);
  const [weeklyDisc, setWeeklyDisc] = useState(pricing.weeklyPlanDiscountPct);
  const [monthlyDisc, setMonthlyDisc] = useState(pricing.monthlyPlanDiscountPct);

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Complaint reply
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setSellPrice(pricing.defaultSellingPrice);
    setVarCost(pricing.estimatedVariableCost);
    setFixedCost(pricing.monthlyFixedCost);
    setDailyDisc(pricing.dailyPlanDiscountPct);
    setWeeklyDisc(pricing.weeklyPlanDiscountPct);
    setMonthlyDisc(pricing.monthlyPlanDiscountPct);
  }, [pricing]);

  const customersCount = users.filter((u) => u.role === 'student').length;
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const orderRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const subRevenue = subscriptions
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const totalRevenue = orderRevenue + subRevenue;

  const unitMargin = sellPrice - varCost;
  const marginPct = sellPrice > 0 ? ((unitMargin / sellPrice) * 100).toFixed(1) : '0.0';
  const breakEvenMeals = unitMargin > 0 ? Math.ceil(fixedCost / unitMargin) : 0;

  const handleSeedCatalog = async () => {
    setSeeding(true);
    try {
      await seedStarterCatalog(profile.uid, profile.email);
      showToast('DBS Global University starter catalog seeded in Firestore!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Catalog seeding failed.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePricingConfig({
        defaultSellingPrice: sellPrice,
        estimatedVariableCost: varCost,
        monthlyFixedCost: fixedCost,
        dailyPlanDiscountPct: dailyDisc,
        weeklyPlanDiscountPct: weeklyDisc,
        monthlyPlanDiscountPct: monthlyDisc,
      });
      showToast('Venture pricing & unit economics updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed updating pricing.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await saveCategory({
        name: catName,
        description: catDesc,
        sortOrder: categories.length + 1,
        isActive: true,
      });
      setCatName('');
      setCatDesc('');
      showToast('Category saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed adding category.', 'error');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            MealLoop Venture Control Plane · DBS Global University
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Admin Operations & Unit Economics
          </h1>
          <p className="text-xs text-slate-500 mt-1">Signed in as {profile.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            {seeding ? 'Seeding...' : 'Seed DBS Starter Catalog'}
          </button>
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

      {/* Platform Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Customers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
            {customersCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Food Providers</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
            {providers.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
            {orders.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Plans</span>
            <Calendar className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-2">
            {activeSubs.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-orange-600" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-orange-600 mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Unit Economics Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div>
          <span className="text-xs text-slate-500">Selling Price / Meal</span>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1">
            ₹{sellPrice}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Variable Cost / Meal</span>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1">
            ₹{varCost}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Contribution Margin</span>
          <p className="font-mono tabular-nums text-xl font-bold text-emerald-700 mt-1">
            ₹{unitMargin} ({marginPct}%)
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Break-Even Volume</span>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1">
            {breakEvenMeals} meals/mo
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { id: 'providers' as const, label: `Providers (${providers.length})` },
          { id: 'orders' as const, label: `Orders & Plans (${orders.length + subscriptions.length})` },
          { id: 'pricing' as const, label: 'Pricing & Categories' },
          { id: 'users' as const, label: `Users & Meals (${users.length}/${meals.length})` },
          { id: 'complaints' as const, label: `Complaints (${complaints.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              tab === item.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROVIDERS */}
      {tab === 'providers' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Mess, Tiffin & Cloud Kitchen Partners
          </h2>
          {providers.length === 0 ? (
            <p className="text-xs text-slate-500">
              No providers yet. Click &quot;Seed DBS Starter Catalog&quot; above to populate initial Dehradun kitchens.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{p.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{p.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Hygiene ★ {p.hygieneScore}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{p.name}</h3>
                    <p className="text-xs text-slate-600">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold mr-2 ${
                        p.status === 'approved'
                          ? 'text-emerald-700'
                          : p.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-orange-600'
                      }`}
                    >
                      {p.status.toUpperCase()}
                    </span>
                    {p.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => adminUpdateProviderStatus(p.id, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}
                    {p.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => adminUpdateProviderStatus(p.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS & SUBSCRIPTIONS */}
      {tab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">All Platform Orders</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Meal & Kitchen</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="py-3 pr-3 font-mono">{ord.id.slice(0, 12)}</td>
                    <td className="py-3 pr-3 font-medium text-slate-900">{ord.customerName}</td>
                    <td className="py-3 pr-3">
                      {ord.mealTitle} (×{ord.quantity}) · {ord.providerName}
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          adminUpdateOrder(ord.id, { status: e.target.value as OrderStatus })
                        }
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        {['Order Placed', 'Order Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">
                      ₹{ord.totalAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
              Student Meal Subscriptions ({subscriptions.length})
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Plan & Slots</th>
                  <th className="py-2 pr-3">Kitchen</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{sub.customerName}</td>
                    <td className="py-3 pr-3">
                      {sub.planType} ({sub.totalMeals} meals) · {sub.mealSlots.join(', ')}
                    </td>
                    <td className="py-3 pr-3">{sub.providerName}</td>
                    <td className="py-3 pr-3 font-mono">{sub.startDate}</td>
                    <td className="py-3 pr-3 font-semibold">{sub.status}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">
                      ₹{sub.totalAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING & CATEGORIES */}
      {tab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSavePricing}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900">
              Venture Pricing & Unit Economics
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Selling (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Var. Cost (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={varCost}
                  onChange={(e) => setVarCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fixed/Mo (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={fixedCost}
                  onChange={(e) => setFixedCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Daily Disc %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={dailyDisc}
                  onChange={(e) => setDailyDisc(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Weekly Disc %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={weeklyDisc}
                  onChange={(e) => setWeeklyDisc(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Disc %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={monthlyDisc}
                  onChange={(e) => setMonthlyDisc(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
            >
              Save Pricing Configuration
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Food Categories</h2>
            <div className="space-y-2.5">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategory(c.id)}
                    aria-label="Delete category"
                    className="p-1.5 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddCategory} className="pt-3 border-t border-slate-100 space-y-2.5">
              <input
                type="text"
                required
                maxLength={60}
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name (e.g., Snacks)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                maxLength={240}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Short category description"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & MEALS */}
      {tab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Registered Users</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Hostel / PG</th>
                  <th className="py-2 pr-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{u.displayName}</td>
                    <td className="py-3 pr-3">{u.email}</td>
                    <td className="py-3 pr-3">{u.hostelOrPg}</td>
                    <td className="py-3 pr-3">
                      <select
                        value={u.role}
                        onChange={(e) => adminUpdateUserRole(u.uid, e.target.value as UserRole)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="student">student</option>
                        <option value="provider">provider</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">All Meals</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Meal</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Availability</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meals.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{m.title}</td>
                    <td className="py-3 pr-3">{m.providerName}</td>
                    <td className="py-3 pr-3">{m.category}</td>
                    <td className="py-3 pr-3 font-mono">₹{m.price}</td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => updateMeal(m.id, { isAvailable: !m.isAvailable })}
                        className="underline text-emerald-700"
                      >
                        {m.isAvailable ? 'Available' : 'Paused'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMeal(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINTS */}
      {tab === 'complaints' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Customer Complaints</h2>
          {complaints.length === 0 ? (
            <p className="text-xs text-slate-500">No complaints logged.</p>
          ) : (
            <div className="space-y-4">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900">
                      {c.subject} · by {c.userName} {c.orderId ? `(${c.orderId})` : ''}
                    </span>
                    <span className="font-semibold text-orange-600">{c.status}</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.description}</p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="text"
                      maxLength={500}
                      value={replyMap[c.id] ?? c.adminResponse}
                      onChange={(e) =>
                        setReplyMap((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="Write admin resolution note..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <select
                      defaultValue={c.status}
                      onChange={(e) =>
                        adminResolveComplaint(
                          c.id,
                          e.target.value as ComplaintStatus,
                          replyMap[c.id] ?? c.adminResponse
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
