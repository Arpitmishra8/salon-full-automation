import React from 'react';
import { Sparkles, Calendar, User, Shield, MessageCircle, Phone, Clock, MapPin } from 'lucide-react';
import { Customer, Salon } from '../types/index.ts';

interface NavbarProps {
  salon: Salon | null;
  currentView: 'home' | 'services' | 'about' | 'contact' | 'loyalty' | 'portal' | 'admin' | 'receptionist';
  setCurrentView: (view: 'home' | 'services' | 'about' | 'contact' | 'loyalty' | 'portal' | 'admin' | 'receptionist') => void;
  onOpenBooking: () => void;
  activeCustomer: Customer | null;
  onOpenCustomerAuth: () => void;
  onLogoutCustomer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  salon,
  currentView,
  setCurrentView,
  onOpenBooking,
  activeCustomer,
  onOpenCustomerAuth,
  onLogoutCustomer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 shadow-md">
      {/* Top Notification Announcement Bar */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-amber-900/30 text-xs py-2 px-4 text-stone-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              A-ONE LOYALTY CLUB:
            </span>
            <span className="hidden md:inline text-stone-300">
              Rated ★ 4.0/5 (~1,174 Google Reviews) · Platinum Complex, Subhanpura, Vadodara
            </span>
          </div>
          <div className="flex items-center gap-4 text-stone-300 text-[11px] sm:text-xs">
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Open until 10:00 PM ({salon?.opening_time || '09:00'} - {salon?.closing_time || '22:00'})
            </span>
            <span className="hidden sm:inline text-stone-600">|</span>
            <a
              href="tel:07203091115"
              className="inline-flex items-center gap-1 text-stone-300 hover:text-white"
            >
              <Phone className="w-3 h-3 text-amber-400" />
              072030 91115
            </a>
            <span className="hidden sm:inline text-stone-600">|</span>
            <a
              href="https://wa.me/917203091115?text=Hello%20A-One%20Hair%20%26%20Beauty%20Studio,%20I%20would%20like%20to%20inquire%20about%20an%20appointment."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-editorial text-xl sm:text-2xl tracking-wide text-stone-100 group-hover:text-amber-200 transition-colors">
                {salon?.name || 'A-One Hair & Beauty Studio'}
              </div>
              <div className="text-[10px] tracking-widest uppercase text-amber-400/90 font-medium">
                Hair Salon &amp; Beauty Studio · Subhanpura, Vadodara
              </div>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <button
              onClick={() => setCurrentView('home')}
              className={`text-sm font-medium transition-colors ${
                currentView === 'home' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentView('services')}
              className={`text-sm font-medium transition-colors ${
                currentView === 'services' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              Services Menu
            </button>
            <button
              onClick={() => setCurrentView('about')}
              className={`text-sm font-medium transition-colors ${
                currentView === 'about' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => setCurrentView('contact')}
              className={`text-sm font-medium transition-colors ${
                currentView === 'contact' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              Contact Us
            </button>
            <button
              onClick={() => setCurrentView('loyalty')}
              className={`text-sm font-medium transition-colors ${
                currentView === 'loyalty' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              Loyalty Rewards
            </button>
            <button
              onClick={() => setCurrentView('portal')}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'portal' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-stone-300 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 text-amber-400" />
              {activeCustomer ? (
                <span>
                  {activeCustomer.full_name.split(' ')[0]} ({activeCustomer.loyalty_points} pts)
                </span>
              ) : (
                'Customer Portal'
              )}
            </button>
            <button
              onClick={() => setCurrentView('receptionist')}
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentView === 'receptionist' ? 'text-amber-300 border-b-2 border-amber-400 pb-1' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Receptionist Desk</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Receptionist Quick Entry CTA */}
            <button
              onClick={() => setCurrentView('receptionist')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                currentView === 'receptionist'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                  : 'bg-stone-800 text-amber-300 border-amber-500/40 hover:bg-stone-700'
              }`}
              title="Open Receptionist Walk-in & Billing Entry Console"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visit Entry</span>
            </button>

            {/* Book Appointment CTA */}
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden md:inline">Book Appointment</span>
              <span className="md:hidden">Book</span>
            </button>

            {/* Switch to Admin Dashboard */}
            <button
              onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                currentView === 'admin'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white'
              }`}
              title="Toggle Salon Management & Staff Portal"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {currentView === 'admin' ? 'Exit Admin' : 'Admin Portal'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
