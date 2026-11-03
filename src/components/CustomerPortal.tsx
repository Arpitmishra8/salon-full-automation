import React, { useState, useEffect } from 'react';
import {
  User, Sparkles, Calendar, Clock, Award, Receipt, ArrowRight,
  LogOut, Phone, AlertCircle, CheckCircle2, History, Gift, RefreshCw
} from 'lucide-react';
import { Customer, Appointment, LoyaltyTransaction, LoyaltyReward, Salon } from '../types/index.ts';
import {
  customerLogin, customerRegister, fetchCustomerPortalData,
  updateAppointmentStatus
} from '../services/api.ts';

interface CustomerPortalProps {
  activeCustomer: Customer | null;
  setActiveCustomer: (c: Customer | null) => void;
  onOpenBooking: () => void;
  onViewReceipt: (appointmentId: string) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  activeCustomer,
  setActiveCustomer,
  onOpenBooking,
  onViewReceipt,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regBirthday, setRegBirthday] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Portal data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyTransaction[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [portalTab, setPortalTab] = useState<'loyalty' | 'appointments' | 'rewards' | 'profile'>('loyalty');

  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);

  useEffect(() => {
    if (activeCustomer) {
      loadPortalData(activeCustomer.phone);
    }
  }, [activeCustomer]);

  const loadPortalData = async (phone: string) => {
    try {
      setLoading(true);
      const data = await fetchCustomerPortalData(phone);
      setActiveCustomer(data.customer);
      setAppointments(data.appointments);
      setLoyaltyLedger(data.loyaltyTransactions);
      setSalon(data.salon);
      setRewards(data.availableRewards);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setAuthError(null);
      const res = await customerLogin(loginPhone);
      setActiveCustomer(res.customer);
      await loadPortalData(res.customer.phone);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setAuthError(null);
      const res = await customerRegister({
        full_name: regName,
        phone: regPhone,
        email: regEmail || undefined,
        birthday: regBirthday || undefined
      });
      setActiveCustomer(res.customer);
      await loadPortalData(res.customer.phone);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apt: Appointment) => {
    try {
      setCancelling(true);
      await updateAppointmentStatus(apt.id, 'cancelled');
      setCancelModalApt(null);
      if (activeCustomer) {
        await loadPortalData(activeCustomer.phone);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  // If NOT logged in, show elegant login / registration card with fast demo switchers
  if (!activeCustomer) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-stone-900">A-One VIP Club</h2>
          <p className="text-xs text-stone-500 mt-1">
            Access your loyalty points, rewards, and booking history
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl mb-5 text-xs font-medium">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'login' ? 'bg-white text-stone-900 shadow-sm font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign In with Phone
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'register' ? 'bg-white text-stone-900 shadow-sm font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Register Account (+50 Pts)
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{authError}</span>
          </div>
        )}

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  placeholder="072030 91115"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-sm"
            >
              {loading ? 'Verifying Account...' : 'Access My Club Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="e.g. Maya Varma"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="+91 98123 45678"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="maya@example.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Birthday (for VIP gifts)</label>
              <input
                type="date"
                value={regBirthday}
                onChange={e => setRegBirthday(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-sm"
            >
              {loading ? 'Creating VIP Membership...' : 'Register & Get 50 Welcome Points'}
            </button>
          </form>
        )}

        {/* A-One Loyalty Club Information */}
        <div className="mt-6 pt-5 border-t border-stone-200">
          <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/80 text-xs space-y-1.5">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
              ★ A-One VIP Loyalty Club
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Earn 1 reward point for every ₹10 spent at A-One Hair &amp; Beauty Studio. New registrations receive <strong>50 welcome bonus points</strong> automatically!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pointValueRupees = (activeCustomer.loyalty_points * (salon?.inr_value_per_point || 0.5)).toFixed(2);
  const upcomingApts = appointments.filter(a => ['confirmed', 'checked_in', 'in_progress'].includes(a.status));
  const pastApts = appointments.filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Customer Header & VIP Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-md">
                VIP Member
              </span>
              <button
                onClick={() => setActiveCustomer(null)}
                className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
            <h2 className="text-xl font-bold text-stone-900">{activeCustomer.full_name}</h2>
            <div className="text-xs text-stone-500 mt-1 flex flex-col gap-1">
              <span>{activeCustomer.phone}</span>
              {activeCustomer.email && <span>{activeCustomer.email}</span>}
              <span className="text-stone-400">Customer ID: {activeCustomer.id}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200/80 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-stone-50 p-2.5 rounded-xl">
              <span className="text-stone-500 block text-[11px]">Completed Visits</span>
              <span className="text-base font-bold text-stone-900">{activeCustomer.total_visits}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl">
              <span className="text-stone-500 block text-[11px]">Total Spent</span>
              <span className="text-base font-bold text-stone-900">₹{activeCustomer.total_spent.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Center: Digital Loyalty Pass (Metallic Luxury Design) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-7 rounded-2xl text-stone-100 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-widest uppercase">
                <Sparkles className="w-4 h-4" />
                A-One Privilege Pass
              </div>
              <span className="text-xs text-stone-400 font-mono">1 PT = ₹0.50</span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <span className="text-xs text-stone-400 uppercase tracking-wider block">Available Loyalty Points</span>
                <div className="font-editorial text-4xl sm:text-5xl font-bold text-amber-300 mt-1">
                  {activeCustomer.loyalty_points.toLocaleString()}
                  <span className="text-lg font-sans font-normal text-stone-400 ml-2">Points</span>
                </div>
              </div>
              <div className="sm:text-right bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[11px] text-stone-300 block">Redeemable Value</span>
                <span className="text-xl font-bold text-emerald-400">₹{pointValueRupees}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-stone-400">
              <span>Lifetime Earned: <strong className="text-stone-200">{activeCustomer.lifetime_points_earned}</strong></span>
              <span>·</span>
              <span>Lifetime Redeemed: <strong className="text-stone-200">{activeCustomer.lifetime_points_redeemed}</strong></span>
            </div>
            <button
              onClick={onOpenBooking}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs px-4 py-2 rounded-lg transition-transform active:scale-95"
            >
              Book &amp; Redeem
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setPortalTab('loyalty')}
          className={`pb-3 flex items-center gap-1.5 transition-colors ${
            portalTab === 'loyalty' ? 'border-b-2 border-amber-600 text-amber-900 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" /> Points Ledger
        </button>
        <button
          onClick={() => setPortalTab('appointments')}
          className={`pb-3 flex items-center gap-1.5 transition-colors ${
            portalTab === 'appointments' ? 'border-b-2 border-amber-600 text-amber-900 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> My Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setPortalTab('rewards')}
          className={`pb-3 flex items-center gap-1.5 transition-colors ${
            portalTab === 'rewards' ? 'border-b-2 border-amber-600 text-amber-900 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Gift className="w-4 h-4" /> Available Rewards ({rewards.length})
        </button>
      </div>

      {/* TAB 1: STRICT LOYALTY TRANSACTION LEDGER */}
      {portalTab === 'loyalty' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Transaction Ledger</h3>
              <p className="text-xs text-stone-500">
                Audited ledger of all points earned, redeemed, and adjusted.
              </p>
            </div>
            <button
              onClick={() => loadPortalData(activeCustomer.phone)}
              className="text-stone-400 hover:text-stone-700 p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loyaltyLedger.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No loyalty point transactions recorded yet. Complete an appointment to earn your first points!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4">Points</th>
                    <th className="py-3 px-4">Previous Balance</th>
                    <th className="py-3 px-4">New Balance</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loyaltyLedger.map(tx => (
                    <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold capitalize ${
                            tx.transaction_type === 'earned'
                              ? 'text-emerald-700'
                              : tx.transaction_type === 'redeemed'
                              ? 'text-amber-800'
                              : 'text-stone-700'
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        {tx.points > 0 ? (
                          <span className="text-emerald-600">+{tx.points}</span>
                        ) : (
                          <span className="text-stone-700">{tx.points}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500">{tx.previous_balance}</td>
                      <td className="py-3 px-4 font-semibold text-stone-900">{tx.new_balance}</td>
                      <td className="py-3 px-4 text-stone-700 max-w-xs truncate">{tx.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENTS */}
      {portalTab === 'appointments' && (
        <div className="space-y-6">
          {/* Upcoming */}
          <div>
            <h3 className="font-semibold text-stone-900 text-sm mb-3">Upcoming Appointments</h3>
            {upcomingApts.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
                You have no upcoming appointments scheduled.
                <button
                  onClick={onOpenBooking}
                  className="mt-3 block mx-auto text-amber-700 font-semibold hover:underline"
                >
                  Book an appointment now &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingApts.map(apt => (
                  <div key={apt.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-amber-800 block">
                          Ref: {apt.booking_reference}
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm">{apt.service_name}</h4>
                        <span className="text-xs text-stone-500">Stylist: {apt.staff_name}</span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                        {apt.status}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl text-xs space-y-1 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Date: {apt.appointment_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>Time: {apt.start_time} ({apt.duration_minutes} min)</span>
                      </div>
                      <div className="font-medium text-stone-900 pt-1">
                        Total Amount: ₹{apt.final_amount.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-stone-100">
                      <button
                        onClick={() => setCancelModalApt(apt)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past History */}
          <div>
            <h3 className="font-semibold text-stone-900 text-sm mb-3">Past Appointment History</h3>
            {pastApts.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
                No past appointment history yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Specialist</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Total Paid</th>
                        <th className="py-3 px-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pastApts.map(apt => (
                        <tr key={apt.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4 text-stone-700">{apt.appointment_date}</td>
                          <td className="py-3 px-4 font-medium text-stone-900">{apt.service_name}</td>
                          <td className="py-3 px-4 text-stone-600">{apt.staff_name}</td>
                          <td className="py-3 px-4 capitalize font-semibold text-stone-700">{apt.status}</td>
                          <td className="py-3 px-4 font-bold text-stone-900">₹{apt.final_amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            {apt.payment_status === 'paid' && (
                              <button
                                onClick={() => onViewReceipt(apt.id)}
                                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium hover:underline"
                              >
                                <Receipt className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REWARDS CATALOG */}
      {portalTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map(r => {
            const canAfford = activeCustomer.loyalty_points >= r.points_required;
            return (
              <div
                key={r.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  canAfford
                    ? 'bg-amber-50/40 border-amber-300 shadow-sm'
                    : 'bg-white border-stone-200 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      {r.points_required} Points Required
                    </span>
                    {canAfford ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Eligible
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400 font-medium">
                        Need {r.points_required - activeCustomer.loyalty_points} more
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-stone-900 text-base">{r.title}</h4>
                  <p className="text-xs text-stone-500 mt-1">{r.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-900">Value: ₹{r.discount_inr}</span>
                  <span className="text-stone-400 text-[11px]">Redeem at Checkout</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation confirmation modal */}
      {cancelModalApt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Cancel Appointment?</h3>
            <p className="text-xs text-stone-600">
              Are you sure you want to cancel your appointment for{' '}
              <strong>{cancelModalApt.service_name}</strong> on {cancelModalApt.appointment_date} at{' '}
              {cancelModalApt.start_time}?
            </p>
            <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Notice: A-One Hair &amp; Beauty Studio kindly requests at least {salon?.cancellation_notice_hours || 2} hours notice for cancellations.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={cancelling}
                onClick={() => setCancelModalApt(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800 font-medium"
              >
                Keep Appointment
              </button>
              <button
                disabled={cancelling}
                onClick={() => handleCancelAppointment(cancelModalApt)}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
