import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppSection, Navbar } from './components/Navbar';
import { MenuShowcase } from './components/MenuShowcase';
import { SubscriptionBuilder } from './components/SubscriptionBuilder';
import { MealLoopGreenSection } from './components/MealLoopGreenSection';
import { StudentDashboard } from './components/StudentDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { MealDetailModal } from './components/MealDetailModal';
import { CartDrawer } from './components/CartDrawer';
import {
  subscribeAddresses,
  subscribeAllUsers,
  subscribeCategories,
  subscribeComplaints,
  subscribeMeals,
  subscribeNotifications,
  subscribeOrders,
  subscribePricingConfig,
  subscribeProviders,
  subscribeReviews,
  subscribeSubscriptions,
} from './services/firestoreService';
import {
  AppNotification,
  CartItem,
  Category,
  Complaint,
  DEFAULT_PRICING_CONFIG,
  FoodProvider,
  Meal,
  Order,
  PricingConfig,
  Review,
  SavedAddress,
  Subscription,
  UserProfile,
} from './types/mealloop';

function MealLoopWorkspace() {
  const { firebaseUser, profile, authReady, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<AppSection>('menu');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Public Firestore Catalog State
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [providers, setProviders] = useState<FoodProvider[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Authenticated Role-Scoped State
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Subscribe to public catalog (pricing, categories, meals, approved providers, reviews)
  useEffect(() => {
    if (!authReady) return;

    const mode: 'public' | 'provider' | 'admin' = isAdmin
      ? 'admin'
      : profile?.role === 'provider'
        ? 'provider'
        : 'public';

    const unsubPricing = subscribePricingConfig(setPricing);
    const unsubCats = subscribeCategories(isAdmin, setCategories);
    const unsubMeals = subscribeMeals(mode, firebaseUser?.uid || null, (list) => {
      setMeals(list);
      setCatalogLoading(false);
    });
    const unsubProvs = subscribeProviders(mode, firebaseUser?.uid || null, setProviders);
    const unsubRevs = subscribeReviews(setReviews);

    return () => {
      unsubPricing();
      unsubCats();
      unsubMeals();
      unsubProvs();
      unsubRevs();
    };
  }, [authReady, isAdmin, profile?.role, firebaseUser?.uid]);

  // Subscribe to private user/role-scoped collections only when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser || !profile) {
      setOrders([]);
      setSubscriptions([]);
      setAddresses([]);
      setNotifications([]);
      setComplaints([]);
      setAllUsers([]);
      return;
    }

    const roleMode: 'student' | 'provider' | 'admin' = isAdmin
      ? 'admin'
      : profile.role === 'provider'
        ? 'provider'
        : 'student';

    const unsubs = [
      subscribeOrders(roleMode, firebaseUser.uid, setOrders),
      subscribeSubscriptions(roleMode, firebaseUser.uid, setSubscriptions),
      subscribeAddresses(firebaseUser.uid, setAddresses),
      subscribeNotifications(firebaseUser.uid, setNotifications),
      subscribeComplaints(isAdmin, firebaseUser.uid, setComplaints),
    ];

    if (isAdmin) {
      unsubs.push(subscribeAllUsers(setAllUsers));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, profile, isAdmin]);

  const handleAddToCart = (meal: Meal, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.meal.id === meal.id);
      if (existing) {
        return prev.map((item) =>
          item.meal.id === meal.id
            ? { ...item, quantity: Math.min(20, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { meal, quantity }];
    });
    showToast(`Added ${meal.title} to cart`, 'success');
  };

  const handleUpdateCartQty = (mealId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.meal.id !== mealId));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.meal.id === mealId ? { ...item, quantity: Math.min(20, qty) } : item))
      );
    }
  };

  const handleNavigate = (section: AppSection) => {
    if (section === 'dashboard' && !firebaseUser) {
      setAuthModalOpen(true);
      return;
    }
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const emailVerified = Boolean(firebaseUser?.emailVerified);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900">
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        profile={profile}
      />

      <main className="flex-1">
        {activeSection === 'menu' && (
          <MenuShowcase
            meals={meals.filter((m) => m.status === 'active')}
            providers={providers}
            reviews={reviews}
            pricing={pricing}
            loading={catalogLoading}
            onSelectMeal={(m) => setSelectedMeal(m)}
            onAddToCart={(m) => handleAddToCart(m, 1)}
            onNavigatePlans={() => handleNavigate('subscriptions')}
            onNavigateGreen={() => handleNavigate('green')}
          />
        )}

        {activeSection === 'subscriptions' && (
          <SubscriptionBuilder
            pricing={pricing}
            providers={providers}
            profile={profile}
            emailVerified={emailVerified}
            addresses={addresses}
            onRequireAuth={() => setAuthModalOpen(true)}
            onSubscribed={() => setActiveSection('dashboard')}
          />
        )}

        {activeSection === 'green' && (
          <MealLoopGreenSection
            profile={profile}
            orders={orders}
            subscriptions={subscriptions}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeSection === 'dashboard' && profile && (
          <>
            {isAdmin ? (
              <AdminDashboard
                profile={profile}
                users={allUsers}
                providers={providers}
                categories={categories}
                meals={meals}
                orders={orders}
                subscriptions={subscriptions}
                complaints={complaints}
                pricing={pricing}
              />
            ) : profile.role === 'provider' ? (
              <ProviderDashboard
                profile={profile}
                emailVerified={emailVerified}
                providers={providers}
                meals={meals}
                orders={orders}
                subscriptions={subscriptions}
                reviews={reviews}
                pricing={pricing}
              />
            ) : (
              <StudentDashboard
                profile={profile}
                emailVerified={emailVerified}
                orders={orders}
                subscriptions={subscriptions}
                addresses={addresses}
                notifications={notifications}
                complaints={complaints}
                onBrowseMenu={() => setActiveSection('menu')}
                onCreatePlan={() => setActiveSection('subscriptions')}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            MealLoop · Student Meal Subscription Platform · DBS Global University, Dehradun
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('menu')}
              className="hover:text-slate-900"
            >
              Today&apos;s Menu
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('subscriptions')}
              className="hover:text-slate-900"
            >
              Subscriptions
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('green')}
              className="hover:text-slate-900"
            >
              MealLoop Green
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => setActiveSection('dashboard')}
      />

      <MealDetailModal
        meal={selectedMeal}
        reviews={reviews}
        onClose={() => setSelectedMeal(null)}
        onAddToCart={(meal, qty) => handleAddToCart(meal, qty)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateCartQty}
        onClearCart={() => setCart([])}
        profile={profile}
        emailVerified={emailVerified}
        addresses={addresses}
        onRequireAuth={() => {
          setCartOpen(false);
          setAuthModalOpen(true);
        }}
        onOrderComplete={() => setActiveSection('dashboard')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <MealLoopWorkspace />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
