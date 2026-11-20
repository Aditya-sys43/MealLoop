import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { UserProfile } from '../types/mealloop';

export type AppSection = 'menu' | 'subscriptions' | 'green' | 'dashboard';

interface NavbarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  profile: UserProfile | null;
}

export function Navbar({
  activeSection,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenAuth,
  profile,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardLabel =
    profile?.role === 'admin'
      ? 'Admin Console'
      : profile?.role === 'provider'
        ? 'Kitchen Portal'
        : 'My Dashboard';

  const navItems: { id: AppSection; label: string }[] = [
    { id: 'menu', label: "Today's Menu" },
    { id: 'subscriptions', label: 'Meal Plans' },
    { id: 'green', label: 'MealLoop Green' },
    { id: 'dashboard', label: profile ? dashboardLabel : 'Student Portal' },
  ];

  const handlePrimaryAction = () => {
    if (cartCount > 0) {
      onOpenCart();
    } else if (!profile) {
      onOpenAuth();
    } else {
      onNavigate('dashboard');
    }
  };

  const primaryLabel =
    cartCount > 0
      ? `View Cart (${cartCount})`
      : profile
        ? profile.displayName.split(' ')[0]
        : 'Sign In';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('menu')}
          className="font-display text-xl font-extrabold tracking-tight text-emerald-800 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
        >
          MealLoop
        </button>

        {/* Zone 2: 4 single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                activeSection === item.id
                  ? 'border-emerald-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action (plus mobile menu toggle on small viewports) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              cartCount > 0
                ? 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-600'
                : 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700'
            }`}
          >
            {primaryLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeSection === item.id
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
