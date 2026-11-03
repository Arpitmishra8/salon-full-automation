import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Calendar, Users, Scissors, DollarSign, Gift,
  Bell, Settings, TrendingUp, CreditCard, Clock, CheckCircle2,
  AlertCircle, Plus, Search, Filter, Download, Edit2, Trash2,
  RefreshCw, Shield, UserCheck, Send, Eye, FileText, ChevronRight,
  QrCode, FileSpreadsheet, Printer, BarChart3, Globe
} from 'lucide-react';
import { WebsiteContentManager } from './WebsiteContentManager.tsx';
import {
  Salon, Service, Staff, Customer, Appointment, LoyaltyTransaction,
  LoyaltyReward, Expense, NotificationLog, NotificationSettings, Receipt, CustomerVisit
} from '../types/index.ts';
import {
  fetchAdminOverview, fetchAppointments, updateAppointmentStatus,
  rescheduleAppointment, checkoutAppointment, fetchCustomers,
  fetchCustomerDetails, updateCustomerNotes, adjustCustomerPoints,
  fetchStaff, createStaff, updateStaff, addStaffTimeOff,
  fetchServices, createService, updateService, deleteService,
  fetchLoyaltyRewards, fetchLoyaltyLedger, fetchExpenses,
  createExpense, deleteExpense, fetchNotificationSettings,
  updateNotificationSettings, fetchNotificationLogs, sendTestNotification,
  trigger24hReminders, updateSalon, bookAppointment,
  fetchReceptionistTodayMetrics, fetchMonthlyReport
} from '../services/api.ts';

interface AdminDashboardProps {
  salon: Salon | null;
  onRefreshSalon: () => void;
  onOpenReceipt: (appointmentId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  salon,
  onRefreshSalon,
  onOpenReceipt
}) => {
  // Current admin tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'appointments' | 'customers' | 'staff' | 'services' | 'loyalty' | 'expenses' | 'notifications' | 'monthly_reports' | 'website_content' | 'settings'
  >('overview');

  // Role simulation
  const [currentRole, setCurrentRole] = useState<'owner' | 'manager' | 'receptionist' | 'stylist'>('owner');

  // Global loading & refresh
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Overview data
  const [overview, setOverview] = useState<any>(null);

  // Receptionist today real-time metrics
  const [receptionistMetrics, setReceptionistMetrics] = useState<any>(null);

  // Monthly Report states
  const [reportYear, setReportYear] = useState<string>(new Date().getFullYear().toString());
  const [reportMonth, setReportMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [reportSearch, setReportSearch] = useState<string>('');
  const [reportPaymentMode, setReportPaymentMode] = useState<string>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportSortBy, setReportSortBy] = useState<string>('date');
  const [reportSortOrder, setReportSortOrder] = useState<string>('DESC');
  const [reportPage, setReportPage] = useState<number>(1);
  const [monthlyReportData, setMonthlyReportData] = useState<any>(null);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [aptDateFilter, setAptDateFilter] = useState<string>('');
  const [aptStaffFilter, setAptStaffFilter] = useState<string>('all');
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('all');
  const [aptSearch, setAptSearch] = useState<string>('');

  // Modals state
  const [checkoutApt, setCheckoutApt] = useState<Appointment | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [newAptModal, setNewAptModal] = useState<boolean>(false);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<any | null>(null);
  const [adjustPointsCust, setAdjustPointsCust] = useState<Customer | null>(null);
  const [testNotifModal, setTestNotifModal] = useState<boolean>(false);

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifLogs, setNotifLogs] = useState<NotificationLog[]>([]);

  // Polling every 10 seconds for live database sync without manual page refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'overview') {
        fetchAdminOverview().then(ov => setOverview(ov)).catch(() => {});
        fetchReceptionistTodayMetrics().then(rm => setReceptionistMetrics(rm)).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab]);

  // Load active tab data
  useEffect(() => {
    loadTabData();
  }, [
    activeTab, refreshTrigger,
    reportYear, reportMonth, reportSearch, reportPaymentMode,
    reportStartDate, reportEndDate, reportSortBy, reportSortOrder, reportPage
  ]);

  const loadTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'overview') {
        const [ov, rm] = await Promise.all([
          fetchAdminOverview(),
          fetchReceptionistTodayMetrics()
        ]);
        setOverview(ov);
        setReceptionistMetrics(rm);
      } else if (activeTab === 'monthly_reports') {
        const rep = await fetchMonthlyReport({
          year: reportYear,
          month: reportMonth,
          search: reportSearch,
          payment_mode: reportPaymentMode,
          start_date: reportStartDate,
          end_date: reportEndDate,
          sort_by: reportSortBy,
          sort_order: reportSortOrder,
          page: reportPage,
          limit: 25
        });
        setMonthlyReportData(rep);
      } else if (activeTab === 'appointments') {
        const apts = await fetchAppointments({
          date: aptDateFilter || undefined,
          staff_id: aptStaffFilter,
          status: aptStatusFilter,
          search: aptSearch || undefined
        });
        setAppointments(apts);
        const st = await fetchStaff();
        setStaffList(st);
        const srv = await fetchServices(true);
        setServicesList(srv);
      } else if (activeTab === 'customers') {
        const custs = await fetchCustomers(customerSearch);
        setCustomers(custs);
      } else if (activeTab === 'staff') {
        const st = await fetchStaff();
        setStaffList(st);
      } else if (activeTab === 'services') {
        const srv = await fetchServices(true);
        setServicesList(srv);
      } else if (activeTab === 'loyalty') {
        const rew = await fetchLoyaltyRewards();
        setLoyaltyRewards(rew);
        const led = await fetchLoyaltyLedger();
        setLoyaltyLedger(led);
      } else if (activeTab === 'expenses') {
        const exp = await fetchExpenses();
        setExpenses(exp);
      } else if (activeTab === 'notifications') {
        const ns = await fetchNotificationSettings();
        setNotifSettings(ns);
        const logs = await fetchNotificationLogs();
        setNotifLogs(logs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Role permissions check
  const canManageFinancials = ['owner', 'manager'].includes(currentRole);
  const canManageStaff = ['owner'].includes(currentRole);
  const canManageSettings = ['owner'].includes(currentRole);

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-200 shrink-0 flex flex-col justify-between border-r border-stone-800">
        <div>
          {/* Admin Header */}
          <div className="p-5 border-b border-stone-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Salon Control Center</span>
            </div>
            <h2 className="font-editorial text-xl font-bold text-white mt-1">
              {salon?.name || 'A-One Hair & Beauty Studio'}
            </h2>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Platinum Complex, Subhanpura · Vadodara
            </div>
          </div>

          {/* Role Switcher (RBAC) */}
          <div className="p-3 bg-stone-950/60 border-b border-stone-800">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">
              Active Staff Role (RBAC)
            </label>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {(['owner', 'manager', 'receptionist', 'stylist'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`py-1 px-2 rounded font-medium capitalize text-left transition-colors ${
                    currentRole === role
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              <span>Overview &amp; Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'appointments'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Appointments</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'customers'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Customer CRM</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'services'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Scissors className="w-4 h-4 text-amber-400" />
              <span>Services &amp; Menu</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Staff &amp; Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab('loyalty')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'loyalty'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Loyalty &amp; Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Expenses &amp; P&amp;L</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notification Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly_reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                activeTab === 'monthly_reports'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Monthly Business Reports</span>
            </button>

            {canManageSettings && (
              <button
                onClick={() => setActiveTab('website_content')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === 'website_content'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>Website Content Management</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded-md">LIVE</span>
              </button>
            )}

            {canManageSettings && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Salon Settings</span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
          <span>A-One Salon Engine v2.4</span>
          <span className="text-emerald-400 font-medium">● Connected</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 capitalize font-editorial">
              {activeTab === 'overview' && 'Salon Business Overview'}
              {activeTab === 'monthly_reports' && 'Monthly Business Records & Reports'}
              {activeTab === 'website_content' && 'Website Content Management'}
              {activeTab === 'appointments' && 'Appointment Management'}
              {activeTab === 'customers' && 'Customer CRM & Directory'}
              {activeTab === 'services' && 'Salon Services & Treatment Menu'}
              {activeTab === 'staff' && 'Artisans & Staff Schedule'}
              {activeTab === 'loyalty' && 'Loyalty Program & Ledger'}
              {activeTab === 'expenses' && 'Business Expenses & P&L'}
              {activeTab === 'notifications' && 'Notification Settings & Logs'}
              {activeTab === 'settings' && 'Salon Configuration'}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Role: <strong className="uppercase text-amber-800">{currentRole}</strong> · Live Persistent SQLite Database
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerRefresh}
              className="inline-flex items-center gap-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs px-3 py-2 rounded-lg font-medium transition-colors shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {activeTab === 'appointments' && (
              <button
                onClick={() => setNewAptModal(true)}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Appointment</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: OVERVIEW & ANALYTICS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* RECEPTIONIST & VISIT REAL-TIME METRICS (Auto-updated from SQLite visits & payments) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm uppercase tracking-wide">
                    Live Receptionist &amp; Walk-In Desk Sync
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500">
                  Auto-updates from persistent database without manual page refresh
                </span>
              </div>

              {/* 10 Required Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Total customer visits today */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Visits Today
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-0.5">
                    {receptionistMetrics?.today?.totalVisits ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">Total visits recorded</span>
                </div>

                {/* 2. Unique customers served today */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Unique Customers Today
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-0.5">
                    {receptionistMetrics?.today?.uniqueCustomers ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">Distinct clients</span>
                </div>

                {/* 3. Total amount collected today */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-2xs bg-amber-50/20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
                    Collected Today
                  </span>
                  <div className="text-xl font-bold text-amber-900 mt-0.5 font-mono">
                    ₹{(receptionistMetrics?.today?.totalCollected ?? (overview?.today?.revenue || 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-700">All modes combined</span>
                </div>

                {/* 4. Cash payments today */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Cash Payments Today
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-0.5 font-mono">
                    ₹{(receptionistMetrics?.today?.cashPayments ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-stone-400">Cash drawer</span>
                </div>

                {/* 5. UPI payments today */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    UPI Payments Today
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-0.5 font-mono">
                    ₹{(receptionistMetrics?.today?.upiPayments ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-stone-400">Direct UPI app</span>
                </div>

                {/* 6. Custom UPI QR payments today */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
                    Custom QR Payments
                  </span>
                  <div className="text-xl font-bold text-amber-900 mt-0.5 font-mono">
                    ₹{(receptionistMetrics?.today?.customUpiQrPayments ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-700">Salon QR counter</span>
                </div>

                {/* 7. Total visits this month */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Visits This Month
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-0.5">
                    {receptionistMetrics?.month?.totalVisits ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">Calendar month</span>
                </div>

                {/* 8. Total collected payments this month */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Collected This Month
                  </span>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5 font-mono">
                    ₹{(receptionistMetrics?.month?.totalCollected ?? (overview?.lifetime?.totalCollectedRevenue || 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-stone-400">Total receipts</span>
                </div>

                {/* 9. Number of new customers */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    New Customers
                  </span>
                  <div className="text-xl font-bold text-blue-700 mt-0.5">
                    {receptionistMetrics?.today?.newCustomers ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">First-time visitors today</span>
                </div>

                {/* 10. Number of returning customers */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Returning Customers
                  </span>
                  <div className="text-xl font-bold text-purple-700 mt-0.5">
                    {receptionistMetrics?.today?.returningCustomers ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-400">Loyal regular clients</span>
                </div>
              </div>
            </div>

            {/* General Salon Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Today's Bookings
                </span>
                <div className="text-2xl font-bold text-stone-900 mt-1">
                  {overview.today.appointmentsCount}
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                  {overview.today.completedCount} completed
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Total Registered Clients
                </span>
                <div className="text-2xl font-bold text-stone-900 mt-1">
                  {overview.lifetime.totalCustomers}
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  In permanent CRM database
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Lifetime Revenue Collected
                </span>
                <div className="text-2xl font-bold text-stone-900 mt-1">
                  ₹{Number(overview.lifetime.totalCollectedRevenue || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Total recorded transactions
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Est. Operating Surplus
                </span>
                <div className={`text-2xl font-bold mt-1 ${overview.lifetime.estimatedSurplus >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{Number(overview.lifetime.estimatedSurplus || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Revenue minus recorded expenses
                </span>
              </div>
            </div>

            {/* Charts & Breakdown Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Revenue Trend (7 days) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-stone-900 text-sm">7-Day Revenue Trajectory</h3>
                    <p className="text-xs text-stone-500">Collected customer payments per day</p>
                  </div>
                  <span className="text-xs font-bold text-amber-800">
                    Lifetime: ₹{Number(overview.lifetime.totalCollectedRevenue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-stone-100">
                  {overview.dailyRevenue.map((d: any) => {
                    const maxAmt = Math.max(...overview.dailyRevenue.map((x: any) => x.amount), 5000);
                    const heightPercent = Math.max(10, Math.round((d.amount / maxAmt) * 100));
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] font-bold text-stone-700">
                          {d.amount > 0 ? `₹${d.amount}` : '-'}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-300"
                        />
                        <span className="text-[10px] text-stone-500 whitespace-nowrap">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Loyalty Program Health */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">Loyalty Points Health</h3>
                  <p className="text-xs text-stone-500">Privilege club activity</p>

                  <div className="mt-5 space-y-3 text-xs">
                    <div className="flex justify-between pb-2 border-b border-stone-100">
                      <span className="text-stone-500">Total Points Issued:</span>
                      <strong className="text-stone-900">{overview.lifetime.pointsIssued}</strong>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-stone-100">
                      <span className="text-stone-500">Points Redeemed:</span>
                      <strong className="text-amber-800">{overview.lifetime.pointsRedeemed}</strong>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-stone-100">
                      <span className="text-stone-500">Outstanding Balance:</span>
                      <strong className="text-emerald-700 font-bold">{overview.lifetime.activeLoyaltyPoints}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/60 text-[11px] text-amber-900">
                  Redemption Rate: {overview.lifetime.pointsIssued > 0 ? Math.round((overview.lifetime.pointsRedeemed / overview.lifetime.pointsIssued) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* Top Services & Staff Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <h3 className="font-semibold text-stone-900 text-sm mb-3">Most Popular Services</h3>
                <div className="divide-y divide-stone-100 text-xs">
                  {overview.popularServices.map((ps: any) => (
                    <div key={ps.name} className="py-2.5 flex justify-between items-center">
                      <span className="font-medium text-stone-800">{ps.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-stone-900">{ps.count} bookings</span>
                        <span className="text-[11px] text-stone-400 block">₹{Number(ps.total_volume).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <h3 className="font-semibold text-stone-900 text-sm mb-3">Staff Workload &amp; Revenue</h3>
                <div className="divide-y divide-stone-100 text-xs">
                  {overview.staffWorkload.map((sw: any) => (
                    <div key={sw.name} className="py-2.5 flex justify-between items-center">
                      <span className="font-medium text-stone-800">{sw.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-stone-900">{sw.appointments_count} clients</span>
                        <span className="text-[11px] text-emerald-700 font-medium block">₹{Number(sw.revenue_generated || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW: MONTHLY BUSINESS RECORDS & REPORTS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'monthly_reports' && (
          <div className="space-y-6">
            {/* Header & Controls Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-stone-900">
                      Monthly Business Report: {new Date(`${reportYear}-${reportMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Real-time aggregated analytics &amp; itemized customer visit logs from persistent database
                  </p>
                </div>

                {/* Export & Print actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/admin/receptionist/export-csv?year=${reportYear}&month=${reportMonth}&search=${encodeURIComponent(reportSearch)}&payment_mode=${reportPaymentMode}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export CSV</span>
                  </a>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-stone-600" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Month / Year & Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                {/* Year Select */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Select Year</label>
                  <select
                    value={reportYear}
                    onChange={(e) => {
                      setReportYear(e.target.value);
                      setReportPage(1);
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  >
                    {[2024, 2025, 2026, 2027].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Month Select */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Select Month</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => {
                      setReportMonth(e.target.value);
                      setReportPage(1);
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = String(i + 1).padStart(2, '0');
                      const name = new Date(2026, i, 1).toLocaleString('default', { month: 'long' });
                      return <option key={m} value={m}>{name} ({m})</option>;
                    })}
                  </select>
                </div>

                {/* Payment Mode Filter */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Payment Mode Filter</label>
                  <select
                    value={reportPaymentMode}
                    onChange={(e) => {
                      setReportPaymentMode(e.target.value);
                      setReportPage(1);
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">All Modes</option>
                    <option value="cash">Cash Only</option>
                    <option value="upi">UPI Only</option>
                    <option value="custom_upi_qr">Custom UPI QR Only</option>
                  </select>
                </div>

                {/* Date Range Start (Optional) */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">From Date (Optional)</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => {
                      setReportStartDate(e.target.value);
                      setReportPage(1);
                    }}
                    className="w-full p-1.5 border border-stone-300 rounded-lg focus:outline-none text-xs"
                  />
                </div>

                {/* Date Range End (Optional) */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">To Date (Optional)</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => {
                      setReportEndDate(e.target.value);
                      setReportPage(1);
                    }}
                    className="w-full p-1.5 border border-stone-300 rounded-lg focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search visits by customer name, phone number, or visit code..."
                  value={reportSearch}
                  onChange={(e) => {
                    setReportSearch(e.target.value);
                    setReportPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Aggregated Report KPI Metrics Grid */}
            {monthlyReportData?.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total customer visits */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Total Visits
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-1">
                    {monthlyReportData.metrics.totalVisits}
                  </div>
                  <span className="text-[10px] text-stone-400">Total appointments &amp; walk-ins</span>
                </div>

                {/* Total unique customers */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Unique Customers
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-1">
                    {monthlyReportData.metrics.totalUniqueCustomers}
                  </div>
                  <span className="text-[10px] text-stone-400">Served this month</span>
                </div>

                {/* New vs Returning */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    New / Returning
                  </span>
                  <div className="text-xl font-bold text-stone-900 mt-1">
                    <span className="text-blue-700">{monthlyReportData.metrics.newCustomers}</span>
                    <span className="text-stone-300 mx-1">/</span>
                    <span className="text-purple-700">{monthlyReportData.metrics.returningCustomers}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Acquisition vs Retention</span>
                </div>

                {/* Total amount collected */}
                <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs bg-amber-50/20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
                    Total Collected
                  </span>
                  <div className="text-xl font-bold text-amber-900 mt-1 font-mono">
                    ₹{Number(monthlyReportData.metrics.totalAmountCollected).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-700">Actual payments recorded</span>
                </div>

                {/* Cash vs UPI vs Custom QR */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Mode Collections
                  </span>
                  <div className="text-xs space-y-0.5 mt-1 font-mono">
                    <div className="text-stone-700">Cash: ₹{monthlyReportData.metrics.totalCashCollected.toLocaleString()}</div>
                    <div className="text-stone-700">UPI: ₹{monthlyReportData.metrics.totalUpiCollected.toLocaleString()}</div>
                    <div className="text-amber-800 font-semibold">QR: ₹{monthlyReportData.metrics.totalCustomUpiQrCollected.toLocaleString()}</div>
                  </div>
                </div>

                {/* Average recorded payment per visit */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                    Avg Payment / Visit
                  </span>
                  <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">
                    ₹{monthlyReportData.metrics.averagePaymentPerVisit}
                  </div>
                  <span className="text-[10px] text-stone-400">Total Discounts: ₹{monthlyReportData.metrics.totalDiscounts}</span>
                </div>
              </div>
            )}

            {/* Service-wise Revenue Breakdown & Daily Collection Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service-wise Revenue */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                  <h3 className="font-bold text-sm text-stone-900">Service-Wise Revenue</h3>
                  <span className="text-xs text-stone-500">From visit services</span>
                </div>
                {monthlyReportData?.serviceWiseRevenue?.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">No service revenue data for this month.</p>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto pr-1 text-xs">
                    {monthlyReportData?.serviceWiseRevenue?.map((sr: any) => (
                      <div key={sr.service_name} className="py-2 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-stone-800 block">{sr.service_name}</span>
                          <span className="text-[11px] text-stone-400">{sr.service_count} time(s) performed</span>
                        </div>
                        <span className="font-mono font-bold text-amber-900">
                          ₹{Number(sr.total_revenue || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily Collection Summary */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                  <h3 className="font-bold text-sm text-stone-900">Daily Collection Summary</h3>
                  <span className="text-xs text-stone-500">Day-by-day cash, UPI &amp; QR</span>
                </div>
                {monthlyReportData?.dailyCollections?.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">No daily collection records for this month.</p>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto pr-1 text-xs">
                    {monthlyReportData?.dailyCollections?.map((dc: any) => (
                      <div key={dc.date} className="py-2 flex justify-between items-center">
                        <div>
                          <strong className="text-stone-900">{dc.date}</strong>
                          <span className="text-[11px] text-stone-500 block">
                            {dc.visits} visit(s) · Cash: ₹{dc.cash} · UPI: ₹{dc.upi} · QR: ₹{dc.custom_upi_qr}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800">
                          ₹{Number(dc.revenue).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Customer Visits & Payments Detailed Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-3 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Recorded Customer Visits &amp; Payments Table</h3>
                  <p className="text-xs text-stone-500">
                    Showing {monthlyReportData?.table?.records?.length || 0} of {monthlyReportData?.table?.totalRecords || 0} records
                  </p>
                </div>

                {/* Sort controls */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-stone-500 font-semibold">Sort By:</label>
                  <select
                    value={reportSortBy}
                    onChange={(e) => setReportSortBy(e.target.value)}
                    className="p-1.5 border border-stone-300 rounded-lg focus:outline-none"
                  >
                    <option value="date">Date &amp; Time</option>
                    <option value="amount">Amount Paid</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setReportSortOrder(reportSortOrder === 'ASC' ? 'DESC' : 'ASC')}
                    className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-bold"
                  >
                    {reportSortOrder === 'ASC' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Date &amp; Time</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Phone Number</th>
                      <th className="p-3">Service(s)</th>
                      <th className="p-3 whitespace-nowrap">Amount Paid</th>
                      <th className="p-3 whitespace-nowrap">Payment Mode</th>
                      <th className="p-3">Receptionist</th>
                      <th className="p-3">Visit ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {monthlyReportData?.table?.records?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-stone-400">
                          No visits found matching your filters for this period.
                        </td>
                      </tr>
                    ) : (
                      monthlyReportData?.table?.records?.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="p-3 whitespace-nowrap font-medium text-stone-900">
                            <div>{rec.visit_date}</div>
                            <div className="text-[10px] text-stone-400 font-mono">{rec.visit_time?.slice(0, 5)}</div>
                          </td>
                          <td className="p-3 font-semibold text-stone-900">
                            {rec.customer_name}
                          </td>
                          <td className="p-3 font-mono text-stone-700">
                            {rec.customer_phone}
                          </td>
                          <td className="p-3 text-stone-800 max-w-xs truncate" title={rec.services_summary}>
                            {rec.services_summary}
                          </td>
                          <td className="p-3 whitespace-nowrap font-mono font-bold text-amber-900">
                            ₹{Number(rec.amount_paid).toLocaleString()}
                            {rec.payment_status === 'complimentary' && (
                              <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-sans font-normal">
                                Free
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                              rec.payment_mode === 'cash'
                                ? 'bg-stone-100 text-stone-800'
                                : rec.payment_mode === 'upi'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              {rec.payment_mode === 'custom_upi_qr' ? 'Custom QR' : rec.payment_mode}
                            </span>
                          </td>
                          <td className="p-3 text-stone-600 text-[11px]">
                            {rec.receptionist_name || 'Front Desk'}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-stone-500">
                            {rec.visit_code}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {monthlyReportData?.table && monthlyReportData.table.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs text-stone-600">
                  <span>
                    Page {monthlyReportData.table.page} of {monthlyReportData.table.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={monthlyReportData.table.page <= 1}
                      onClick={() => setReportPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={monthlyReportData.table.page >= monthlyReportData.table.totalPages}
                      onClick={() => setReportPage(prev => prev + 1)}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: APPOINTMENT MANAGEMENT */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Filter Date</label>
                <input
                  type="date"
                  value={aptDateFilter}
                  onChange={e => setAptDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Staff</label>
                <select
                  value={aptStaffFilter}
                  onChange={e => setAptStaffFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg focus:outline-none"
                >
                  <option value="all">All Specialists</option>
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Status</label>
                <select
                  value={aptStatusFilter}
                  onChange={e => setAptStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Search</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search client name, phone, ref..."
                    value={aptSearch}
                    onChange={e => setAptSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={loadTabData}
                  className="bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Ref &amp; Date</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Specialist</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {appointments.map(apt => (
                      <tr key={apt.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-800 block">{apt.booking_reference}</span>
                          <span className="text-stone-600 text-[11px]">{apt.appointment_date} at {apt.start_time}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900 block">{apt.customer_name}</span>
                          <span className="text-stone-500 text-[11px]">{apt.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-stone-800">{apt.service_name}</span>
                          <span className="text-stone-400 text-[11px] block">{apt.duration_minutes} min · ₹{apt.final_amount}</span>
                        </td>
                        <td className="py-3 px-4 text-stone-700">{apt.staff_name}</td>
                        <td className="py-3 px-4">
                          <select
                            value={apt.status}
                            onChange={async e => {
                              await updateAppointmentStatus(apt.id, e.target.value);
                              triggerRefresh();
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                              apt.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : apt.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : apt.status === 'cancelled'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`capitalize font-bold text-[11px] ${
                            apt.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-800'
                          }`}>
                            {apt.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {apt.payment_status !== 'paid' && apt.status !== 'cancelled' && (
                            <button
                              onClick={() => setCheckoutApt(apt)}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded font-semibold text-[11px] transition-colors"
                            >
                              Checkout POS
                            </button>
                          )}
                          {apt.payment_status === 'paid' && (
                            <button
                              onClick={() => onOpenReceipt(apt.id)}
                              className="text-stone-600 hover:text-stone-900 border border-stone-200 px-2 py-1 rounded text-[11px] transition-colors"
                            >
                              Receipt
                            </button>
                          )}
                          {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                            <button
                              onClick={() => setRescheduleApt(apt)}
                              className="text-stone-500 hover:text-stone-800 px-1.5 py-1 text-[11px]"
                            >
                              Reschedule
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400">
                          No appointments scheduled yet. Use &quot;+ New Appointment&quot; above or book online from the website.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 3: CUSTOMER CRM */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer by name, phone, email..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchCustomers(customerSearch).then(setCustomers)}
                  className="bg-stone-900 text-white px-3.5 py-2 rounded-xl hover:bg-stone-800 font-medium"
                >
                  Search
                </button>
                <a
                  href="/api/customers-export-csv"
                  download="salon_customers.csv"
                  className="inline-flex items-center gap-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3 py-2 rounded-xl font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Completed Visits</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4">Loyalty Balance</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-900 block">{c.full_name}</span>
                          <span className="text-stone-400 text-[10px]">ID: {c.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-stone-800">{c.phone}</span>
                          {c.email && <span className="text-stone-400 block text-[11px]">{c.email}</span>}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-700">{c.total_visits}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">₹{c.total_spent.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-amber-800">{c.loyalty_points} pts</span>
                          <span className="text-stone-400 block text-[10px]">
                            Worth ₹{(c.loyalty_points * (salon?.inr_value_per_point || 0.5)).toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={async () => {
                              const details = await fetchCustomerDetails(c.id);
                              setSelectedCustomerProfile(details);
                            }}
                            className="text-amber-800 hover:text-amber-900 font-semibold hover:underline"
                          >
                            View Profile
                          </button>
                          {canManageFinancials && (
                            <button
                              onClick={() => setAdjustPointsCust(c)}
                              className="text-stone-500 hover:text-stone-800 text-[11px] border border-stone-200 px-2 py-0.5 rounded"
                            >
                              Adjust Pts
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400">
                          No clients registered yet. Clients are automatically saved when receptionists record visits, when appointments are booked, or when registering in the Loyalty Club.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 4: SERVICES MANAGEMENT */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">
                Manage treatments, pricing in INR, durations, and categories.
              </span>
              <button
                onClick={async () => {
                  const name = prompt('Service Name:');
                  if (!name) return;
                  const category = prompt('Category (e.g. Haircuts & Styling, Facials):') || 'General';
                  const price = Number(prompt('Price in INR (₹):') || 1000);
                  const duration = Number(prompt('Duration in minutes:') || 45);
                  await createService({
                    name,
                    category,
                    price,
                    duration_minutes: duration,
                    description: 'Custom service crafted by A-One salon experts.'
                  });
                  triggerRefresh();
                }}
                className="bg-stone-900 text-white text-xs px-3.5 py-2 rounded-xl font-semibold hover:bg-stone-800 transition-colors"
              >
                + Add Service
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Price (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {servicesList.map(srv => (
                    <tr key={srv.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 block">{srv.name}</span>
                        <span className="text-stone-400 text-[11px] truncate max-w-sm block">{srv.description}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-700">{srv.category}</td>
                      <td className="py-3 px-4 text-stone-600">{srv.duration_minutes} min</td>
                      <td className="py-3 px-4 font-bold text-stone-900">₹{srv.price.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${srv.is_active ? 'text-emerald-700' : 'text-stone-400'}`}>
                          {srv.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={async () => {
                            const newPrice = Number(prompt(`Update price for ${srv.name}:`, String(srv.price)));
                            if (!newPrice) return;
                            await updateService(srv.id, { ...srv, price: newPrice });
                            triggerRefresh();
                          }}
                          className="text-amber-800 hover:text-amber-900 font-semibold hover:underline"
                        >
                          Edit Price
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Deactivate ${srv.name}?`)) {
                              await deleteService(srv.id);
                              triggerRefresh();
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 5: STAFF & SCHEDULE */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">
                Staff working hours, assigned services, and leave management.
              </span>
              {canManageStaff && (
                <button
                  onClick={async () => {
                    const name = prompt('Artisan Name:');
                    if (!name) return;
                    const phone = prompt('Mobile Number:') || '';
                    const role = prompt('Role (stylist, manager, receptionist):') || 'stylist';
                    await createStaff({
                      name,
                      phone,
                      role: role as any,
                      start_time: '09:00',
                      end_time: '20:00',
                      break_start: '13:00',
                      break_end: '14:00'
                    });
                    triggerRefresh();
                  }}
                  className="bg-stone-900 text-white text-xs px-3.5 py-2 rounded-xl font-semibold hover:bg-stone-800 transition-colors"
                >
                  + Add Staff Member
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map(st => (
                <div key={st.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    {st.avatar_url ? (
                      <img src={st.avatar_url} alt={st.name} className="w-12 h-12 rounded-full object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-700">
                        {st.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{st.name}</h4>
                      <span className="text-xs text-amber-800 font-semibold uppercase">{st.role}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-xl text-xs space-y-1 text-stone-600">
                    <div>Hours: {st.start_time} - {st.end_time}</div>
                    <div>Break: {st.break_start} - {st.break_end}</div>
                    <div>Contact: {st.phone}</div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-xs">
                    <button
                      onClick={async () => {
                        const date = prompt('Enter Leave Date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
                        if (!date) return;
                        const reason = prompt('Reason for Leave:', 'Personal Leave') || 'Leave';
                        await addStaffTimeOff(st.id, date, reason);
                        alert(`Leave recorded for ${st.name} on ${date}. Online bookings will avoid this date.`);
                      }}
                      className="text-amber-800 hover:text-amber-900 font-medium"
                    >
                      Record Time Off
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 6: LOYALTY & REWARDS LEDGER */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-stone-900 text-base">Privilege Club Rules</h3>
                <p className="text-xs text-stone-500">
                  Earn Rate: 1 Point per ₹{100 / (salon?.points_per_100_inr || 1)} spent · Value: 1 Point = ₹{salon?.inr_value_per_point || 0.50}
                </p>
              </div>

              {canManageSettings && (
                <button
                  onClick={async () => {
                    const pts = Number(prompt('Points earned per ₹100 eligible spending:', String(salon?.points_per_100_inr || 1)));
                    const val = Number(prompt('Rupee value per 1 loyalty point (e.g. 0.50 for ₹0.50 off):', String(salon?.inr_value_per_point || 0.5)));
                    await updateSalon({ points_per_100_inr: pts, inr_value_per_point: val });
                    onRefreshSalon();
                    triggerRefresh();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3.5 py-2 rounded-xl font-semibold"
                >
                  Configure Rates
                </button>
              )}
            </div>

            {/* Global Loyalty Ledger */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-stone-200">
                <h3 className="font-semibold text-stone-900 text-sm">Global Loyalty Points Ledger</h3>
                <p className="text-xs text-stone-500">Immutable ledger audit of all customer transactions</p>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold sticky top-0 border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Points</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loyaltyLedger.map(tx => (
                      <tr key={tx.id} className="hover:bg-stone-50">
                        <td className="py-3 px-4 text-stone-600">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900">{tx.customer_name}</span>
                          <span className="text-stone-400 text-[10px] block">{tx.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4 uppercase font-bold text-[10px] text-amber-800">{tx.transaction_type}</td>
                        <td className="py-3 px-4 font-bold">
                          {tx.points > 0 ? (
                            <span className="text-emerald-700">+{tx.points}</span>
                          ) : (
                            <span className="text-stone-700">{tx.points}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-900">{tx.new_balance}</td>
                        <td className="py-3 px-4 text-stone-600">{tx.reason}</td>
                        <td className="py-3 px-4 text-stone-400">{tx.performed_by || 'System'}</td>
                      </tr>
                    ))}
                    {loyaltyLedger.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400">
                          No loyalty transactions recorded yet. Points are automatically logged when clients visit or redeem points.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 7: EXPENSES & P&L */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">
                Track operating overheads (Rent, Supplies, Salaries, Utilities) to evaluate surplus.
              </span>
              <button
                onClick={async () => {
                  const category = prompt('Category (Rent, Salaries, Products and Supplies, Electricity & Utilities, Marketing, Maintenance):') || 'Products and Supplies';
                  const description = prompt('Description:') || 'Salon Supplies';
                  const amount = Number(prompt('Amount in INR (₹):') || 5000);
                  const vendor = prompt('Vendor / Payee:') || 'Local Vendor';
                  await createExpense({
                    category,
                    description,
                    amount,
                    date: new Date().toISOString().slice(0, 10),
                    vendor,
                    payment_method: 'upi'
                  });
                  triggerRefresh();
                }}
                className="bg-stone-900 text-white text-xs px-3.5 py-2 rounded-xl font-semibold hover:bg-stone-800 transition-colors"
              >
                + Record Expense
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4 text-stone-600">{exp.date}</td>
                      <td className="py-3 px-4 font-semibold text-stone-800">{exp.category}</td>
                      <td className="py-3 px-4 text-stone-700">{exp.description}</td>
                      <td className="py-3 px-4 text-stone-500">{exp.vendor || '-'}</td>
                      <td className="py-3 px-4 font-bold text-stone-900">₹{exp.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this expense?')) {
                              await deleteExpense(exp.id);
                              triggerRefresh();
                            }
                          }}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400">
                        No expenses logged yet. Use &quot;+ Record Expense&quot; above to track salon supplies, utilities, or operating overheads.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 8: NOTIFICATION HUB */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'notifications' && notifSettings && (
          <div className="space-y-6">
            {/* Quick Actions Header */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-stone-900 text-sm">Omnichannel Notification Engine</h3>
                <p className="text-xs text-stone-500">
                  Triggers confirmation, 24-hour reminders, cancellations, and loyalty updates via Email &amp; SMS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const res = await trigger24hReminders();
                    alert(`Scanned schedule: ${res.count} customer reminders processed.`);
                    triggerRefresh();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3.5 py-2 rounded-xl font-semibold transition-colors"
                >
                  Trigger 24h Reminders Now
                </button>
                <button
                  onClick={() => setTestNotifModal(true)}
                  className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs px-3 py-2 rounded-xl font-semibold transition-colors"
                >
                  Send Test Notification
                </button>
              </div>
            </div>

            {/* Provider Configuration Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email Provider Config */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                  <span className="font-bold text-stone-900 text-sm">Email Service Configuration</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(notifSettings.email_enabled)}
                      onChange={e => setNotifSettings({ ...notifSettings, email_enabled: e.target.checked ? 1 : 0 })}
                    />
                    <span className="font-semibold text-stone-700">Enabled</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Provider</label>
                    <select
                      value={notifSettings.email_provider}
                      onChange={e => setNotifSettings({ ...notifSettings, email_provider: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="smtp">Custom SMTP Server</option>
                      <option value="resend">Resend API</option>
                      <option value="sendgrid">SendGrid API</option>
                    </select>
                  </div>

                  {notifSettings.email_provider === 'smtp' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-500 block mb-0.5">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.example.com"
                          value={notifSettings.smtp_host}
                          onChange={e => setNotifSettings({ ...notifSettings, smtp_host: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500 block mb-0.5">SMTP Port</label>
                        <input
                          type="number"
                          placeholder="587"
                          value={notifSettings.smtp_port}
                          onChange={e => setNotifSettings({ ...notifSettings, smtp_port: Number(e.target.value) })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {notifSettings.email_provider === 'resend' && (
                    <div>
                      <label className="text-[10px] text-stone-500 block mb-0.5">Resend API Key</label>
                      <input
                        type="password"
                        placeholder="re_xxxxxxxxxxxx"
                        value={notifSettings.resend_api_key}
                        onChange={e => setNotifSettings({ ...notifSettings, resend_api_key: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">From Address</label>
                    <input
                      type="email"
                      value={notifSettings.from_email}
                      onChange={e => setNotifSettings({ ...notifSettings, from_email: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* SMS Provider Config */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                  <span className="font-bold text-stone-900 text-sm">SMS &amp; Twilio Gateway</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(notifSettings.sms_enabled)}
                      onChange={e => setNotifSettings({ ...notifSettings, sms_enabled: e.target.checked ? 1 : 0 })}
                    />
                    <span className="font-semibold text-stone-700">Enabled</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Twilio Account SID</label>
                    <input
                      type="text"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={notifSettings.twilio_account_sid}
                      onChange={e => setNotifSettings({ ...notifSettings, twilio_account_sid: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Twilio Auth Token</label>
                    <input
                      type="password"
                      placeholder="Auth token..."
                      value={notifSettings.twilio_auth_token}
                      onChange={e => setNotifSettings({ ...notifSettings, twilio_auth_token: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Twilio Sender Phone</label>
                    <input
                      type="text"
                      placeholder="+1234567890"
                      value={notifSettings.twilio_phone_number}
                      onChange={e => setNotifSettings({ ...notifSettings, twilio_phone_number: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={async () => {
                      await updateNotificationSettings(notifSettings);
                      alert('Notification settings saved successfully!');
                    }}
                    className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Save Provider Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Templates Customizer */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-stone-900 text-sm">Customizable Notification Message Templates</h3>
              <p className="text-stone-500 text-[11px]">
                Available variables: {'{customer_name}'}, {'{service_name}'}, {'{staff_name}'}, {'{date}'}, {'{time}'}, {'{booking_reference}'}, {'{points}'}, {'{new_balance}'}, {'{rupee_value}'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Appointment Confirmation Email Body</label>
                  <textarea
                    rows={4}
                    value={notifSettings.template_booking_body}
                    onChange={e => setNotifSettings({ ...notifSettings, template_booking_body: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">24-Hour Reminder SMS / Email</label>
                  <textarea
                    rows={4}
                    value={notifSettings.template_reminder_body}
                    onChange={e => setNotifSettings({ ...notifSettings, template_reminder_body: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Appointment Cancellation Notice</label>
                  <textarea
                    rows={3}
                    value={notifSettings.template_cancellation_body}
                    onChange={e => setNotifSettings({ ...notifSettings, template_cancellation_body: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Loyalty Points Earned Notification</label>
                  <textarea
                    rows={3}
                    value={notifSettings.template_loyalty_body}
                    onChange={e => setNotifSettings({ ...notifSettings, template_loyalty_body: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="text-right pt-2">
                <button
                  onClick={async () => {
                    await updateNotificationSettings(notifSettings);
                    alert('Templates saved successfully!');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Save Notification Templates
                </button>
              </div>
            </div>

            {/* Notification Logs Audit Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-stone-200">
                <h3 className="font-semibold text-stone-900 text-sm">Outgoing Notification Logs</h3>
                <p className="text-xs text-stone-500">Live dispatch record and audit trail</p>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold sticky top-0 border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Delivery Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {notifLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50">
                        <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 uppercase font-bold text-[10px] text-stone-700">
                          {log.channel}
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-stone-800">
                          {log.event_type}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900 block">{log.recipient_name}</span>
                          <span className="text-stone-400 text-[11px]">{log.recipient}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'simulated_log'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status === 'simulated_log' ? 'Logged (Simulated)' : log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600 max-w-xs truncate" title={log.status_detail}>
                          {log.status_detail}
                        </td>
                      </tr>
                    ))}
                    {notifLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400">
                          No notification dispatches yet. Notifications are logged when SMS, WhatsApp, or Emails are sent for booking confirmations or reminders.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 9: SALON SETTINGS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'settings' && salon && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs max-w-2xl space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-base">Salon Operating Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Salon Name</label>
                <input
                  type="text"
                  defaultValue={salon.name}
                  id="salon_name_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  defaultValue={salon.phone}
                  id="salon_phone_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-stone-700 block mb-1">Full Address</label>
                <input
                  type="text"
                  defaultValue={salon.address}
                  id="salon_address_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">City &amp; State</label>
                <input
                  type="text"
                  defaultValue={`${salon.city}, ${salon.state} - ${salon.pincode}`}
                  disabled
                  className="w-full p-2 border rounded-lg bg-stone-100 text-stone-600"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Official Website</label>
                <input
                  type="text"
                  defaultValue={salon.website || 'aonehnb.com'}
                  id="salon_website_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Opening Time (Verify with Owner)</label>
                <input
                  type="time"
                  defaultValue={salon.opening_time}
                  id="salon_open_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Closing Time (Confirmed: 10:00 PM)</label>
                <input
                  type="time"
                  defaultValue={salon.closing_time || '22:00'}
                  id="salon_close_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Google Rating</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={salon.google_rating || 4.0}
                  id="salon_rating_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Google Review Count</label>
                <input
                  type="number"
                  defaultValue={salon.google_reviews || 1174}
                  id="salon_reviews_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Slot Interval (Minutes)</label>
                <input
                  type="number"
                  defaultValue={salon.slot_interval_minutes}
                  id="salon_slot_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Cancellation Notice (Hours)</label>
                <input
                  type="number"
                  defaultValue={salon.cancellation_notice_hours}
                  id="salon_notice_input"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Custom UPI QR Configuration */}
              <div className="col-span-2 pt-3 border-t border-stone-200">
                <div className="flex items-center gap-2 mb-2 text-stone-900 font-bold">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Custom UPI QR Code Configuration (For Receptionist Visit Entry)</span>
                </div>
                <p className="text-[11px] text-stone-500 mb-3">
                  Configure the salon's official UPI ID, payee display name, and optional custom QR code image URL shown to clients at the reception desk.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Salon UPI ID *</label>
                    <input
                      type="text"
                      defaultValue={salon.custom_upi_id || 'aonehair@upi'}
                      id="salon_upi_id_input"
                      placeholder="e.g. 07203091115@okaxis or aonehair@upi"
                      className="w-full p-2 border rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Payee Business Name *</label>
                    <input
                      type="text"
                      defaultValue={salon.custom_upi_name || 'A-One Hair & Beauty Studio'}
                      id="salon_upi_name_input"
                      placeholder="e.g. A-One Hair & Beauty Studio"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Custom QR Image URL (Optional)</label>
                    <input
                      type="text"
                      defaultValue={salon.custom_upi_qr_url || ''}
                      id="salon_upi_qr_url_input"
                      placeholder="https://... (Leave blank to generate dynamic UPI QR)"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 text-right">
              <button
                onClick={async () => {
                  const name = (document.getElementById('salon_name_input') as HTMLInputElement).value;
                  const phone = (document.getElementById('salon_phone_input') as HTMLInputElement).value;
                  const address = (document.getElementById('salon_address_input') as HTMLInputElement).value;
                  const website = (document.getElementById('salon_website_input') as HTMLInputElement).value;
                  const opening_time = (document.getElementById('salon_open_input') as HTMLInputElement).value;
                  const closing_time = (document.getElementById('salon_close_input') as HTMLInputElement).value;
                  const google_rating = Number((document.getElementById('salon_rating_input') as HTMLInputElement).value);
                  const google_reviews = Number((document.getElementById('salon_reviews_input') as HTMLInputElement).value);
                  const slot_interval_minutes = Number((document.getElementById('salon_slot_input') as HTMLInputElement).value);
                  const cancellation_notice_hours = Number((document.getElementById('salon_notice_input') as HTMLInputElement).value);
                  const custom_upi_id = (document.getElementById('salon_upi_id_input') as HTMLInputElement).value;
                  const custom_upi_name = (document.getElementById('salon_upi_name_input') as HTMLInputElement).value;
                  const custom_upi_qr_url = (document.getElementById('salon_upi_qr_url_input') as HTMLInputElement).value;

                  await updateSalon({
                    name, phone, address, website, opening_time, closing_time,
                    google_rating, google_reviews, slot_interval_minutes, cancellation_notice_hours,
                    custom_upi_id, custom_upi_name, custom_upi_qr_url
                  });
                  onRefreshSalon();
                  alert('A-One Hair & Beauty Studio settings and Custom UPI QR updated successfully!');
                }}
                className="bg-stone-900 text-white font-semibold px-4 py-2 rounded-lg hover:bg-stone-800"
              >
                Save Salon Parameters
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 10: WEBSITE CONTENT MANAGEMENT */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'website_content' && (
          <WebsiteContentManager
            onContentUpdated={onRefreshSalon}
          />
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: CHECKOUT & POS SETTLEMENT */}
      {/* ---------------------------------------------------- */}
      {checkoutApt && (
        <CheckoutModal
          appointment={checkoutApt}
          salon={salon}
          onClose={() => setCheckoutApt(null)}
          onSuccess={async (receipt) => {
            setCheckoutApt(null);
            triggerRefresh();
            onOpenReceipt(receipt.id);
          }}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: RESCHEDULE APPOINTMENT */}
      {/* ---------------------------------------------------- */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">
              Reschedule Appointment ({rescheduleApt.booking_reference})
            </h3>
            <p className="text-stone-500">
              Client: <strong>{rescheduleApt.customer_name}</strong> · Service: {rescheduleApt.service_name}
            </p>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">New Date</label>
              <input
                type="date"
                id="reschedule_date_input"
                defaultValue={rescheduleApt.appointment_date}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">New Start Time (HH:MM)</label>
              <input
                type="time"
                id="reschedule_time_input"
                defaultValue={rescheduleApt.start_time}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRescheduleApt(null)}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const appointment_date = (document.getElementById('reschedule_date_input') as HTMLInputElement).value;
                  const start_time = (document.getElementById('reschedule_time_input') as HTMLInputElement).value;
                  try {
                    await rescheduleAppointment(rescheduleApt.id, { appointment_date, start_time });
                    setRescheduleApt(null);
                    triggerRefresh();
                    alert('Appointment successfully rescheduled! Notifications dispatched.');
                  } catch (err: any) {
                    alert(err.message || 'Reschedule conflict');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-semibold"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: MANUAL APPOINTMENT CREATION */}
      {/* ---------------------------------------------------- */}
      {newAptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">Create Appointment (Walk-in / Phone)</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Full Name *</label>
                <input type="text" id="manual_name" className="w-full p-2 border rounded-lg" placeholder="Customer Name" />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Phone *</label>
                <input type="tel" id="manual_phone" className="w-full p-2 border rounded-lg" placeholder="072030 91115" />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Service *</label>
              <select id="manual_service" className="w-full p-2 border rounded-lg">
                {servicesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (₹{s.price} - {s.duration_minutes}m)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Specialist *</label>
              <select id="manual_staff" className="w-full p-2 border rounded-lg">
                <option value="any">Any Available</option>
                {staffList.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Date *</label>
                <input
                  type="date"
                  id="manual_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Time (HH:MM) *</label>
                <input type="time" id="manual_time" defaultValue="11:00" className="w-full p-2 border rounded-lg" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewAptModal(false)}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const customer_name = (document.getElementById('manual_name') as HTMLInputElement).value;
                  const customer_phone = (document.getElementById('manual_phone') as HTMLInputElement).value;
                  const service_id = (document.getElementById('manual_service') as HTMLSelectElement).value;
                  const staff_id = (document.getElementById('manual_staff') as HTMLSelectElement).value;
                  const appointment_date = (document.getElementById('manual_date') as HTMLInputElement).value;
                  const start_time = (document.getElementById('manual_time') as HTMLInputElement).value;

                  if (!customer_name || !customer_phone) {
                    alert('Please provide customer name and phone.');
                    return;
                  }

                  try {
                    await bookAppointment({
                      customer_name,
                      customer_phone,
                      service_id,
                      staff_id,
                      appointment_date,
                      start_time,
                      source: 'walk_in'
                    });
                    setNewAptModal(false);
                    triggerRefresh();
                    alert('Appointment created successfully!');
                  } catch (err: any) {
                    alert(err.message || 'Booking conflict');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-semibold"
              >
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: CUSTOMER PROFILE FULL DRAWER */}
      {/* ---------------------------------------------------- */}
      {selectedCustomerProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-xl p-6 overflow-y-auto space-y-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-900 text-base">{selectedCustomerProfile.customer.full_name}</h3>
                <span className="text-stone-500">{selectedCustomerProfile.customer.phone} · ID: {selectedCustomerProfile.customer.id}</span>
              </div>
              <button
                onClick={() => setSelectedCustomerProfile(null)}
                className="text-stone-400 hover:text-stone-800 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block">Total Spend</span>
                <span className="font-bold text-stone-900 text-sm">₹{selectedCustomerProfile.customer.total_spent}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block">Visits</span>
                <span className="font-bold text-stone-900 text-sm">{selectedCustomerProfile.customer.total_visits}</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 block">Loyalty Points</span>
                <span className="font-bold text-amber-900 text-sm">{selectedCustomerProfile.customer.loyalty_points}</span>
              </div>
            </div>

            {/* Staff Notes */}
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Confidential Staff Notes</label>
              <textarea
                rows={3}
                defaultValue={selectedCustomerProfile.customer.notes || ''}
                id="customer_notes_edit"
                className="w-full p-2.5 border rounded-lg"
              />
              <button
                onClick={async () => {
                  const notes = (document.getElementById('customer_notes_edit') as HTMLTextAreaElement).value;
                  await updateCustomerNotes(selectedCustomerProfile.customer.id, notes);
                  alert('Notes saved!');
                }}
                className="mt-1 bg-stone-900 text-white px-3 py-1 rounded text-[11px] font-medium"
              >
                Save Notes
              </button>
            </div>

            {/* Appointment History */}
            <div>
              <h4 className="font-bold text-stone-800 mb-2">Appointment History ({selectedCustomerProfile.appointments.length})</h4>
              <div className="divide-y divide-stone-100 border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {selectedCustomerProfile.appointments.map((apt: any) => (
                  <div key={apt.id} className="p-2.5 flex justify-between items-center bg-white hover:bg-stone-50">
                    <div>
                      <span className="font-semibold text-stone-900 block">{apt.service_name}</span>
                      <span className="text-stone-400 text-[10px]">{apt.appointment_date} · {apt.staff_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-stone-900 block">₹{apt.final_amount}</span>
                      <span className="text-[10px] uppercase font-semibold text-amber-800">{apt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loyalty Transactions */}
            <div>
              <h4 className="font-bold text-stone-800 mb-2">Loyalty Ledger ({selectedCustomerProfile.loyaltyTransactions.length})</h4>
              <div className="divide-y divide-stone-100 border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {selectedCustomerProfile.loyaltyTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-2.5 flex justify-between items-center bg-white hover:bg-stone-50">
                    <div>
                      <span className="font-semibold text-stone-800 block capitalize">{tx.transaction_type}: {tx.reason}</span>
                      <span className="text-stone-400 text-[10px]">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className="font-bold text-amber-800">
                      {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: MANUAL POINT ADJUSTMENT */}
      {/* ---------------------------------------------------- */}
      {adjustPointsCust && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">
              Adjust Loyalty Points for {adjustPointsCust.full_name}
            </h3>
            <p className="text-stone-500">Current balance: <strong>{adjustPointsCust.loyalty_points} points</strong></p>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Points to Add or Deduct (+/-)</label>
              <input
                type="number"
                id="adjust_points_input"
                placeholder="e.g. 50 or -25"
                className="w-full p-2 border rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Mandatory Audit Reason *</label>
              <input
                type="text"
                id="adjust_reason_input"
                placeholder="e.g. Birthday gift, Customer service concession"
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustPointsCust(null)}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const points = Number((document.getElementById('adjust_points_input') as HTMLInputElement).value);
                  const reason = (document.getElementById('adjust_reason_input') as HTMLInputElement).value;
                  if (!points || !reason) {
                    alert('Both points and a reason are required.');
                    return;
                  }
                  try {
                    await adjustCustomerPoints(adjustPointsCust.id, points, reason);
                    setAdjustPointsCust(null);
                    triggerRefresh();
                    alert('Loyalty points adjusted and recorded in ledger.');
                  } catch (err: any) {
                    alert(err.message);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-semibold"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: SEND TEST NOTIFICATION */}
      {/* ---------------------------------------------------- */}
      {testNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">Send Test Notification</h3>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Channel</label>
              <select id="test_channel" className="w-full p-2 border rounded-lg">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Recipient (Email or Phone)</label>
              <input
                type="text"
                id="test_recipient"
                defaultValue="072030 91115"
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Message Preview</label>
              <textarea
                rows={3}
                id="test_message"
                defaultValue="Hello from A-One Hair & Beauty Studio! This is an interactive notification test."
                className="w-full p-2 border rounded-lg text-[11px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTestNotifModal(false)}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const channel = (document.getElementById('test_channel') as HTMLSelectElement).value;
                  const recipient = (document.getElementById('test_recipient') as HTMLInputElement).value;
                  const message = (document.getElementById('test_message') as HTMLTextAreaElement).value;
                  const res = await sendTestNotification(channel, recipient, message);
                  setTestNotifModal(false);
                  triggerRefresh();
                  alert(`Test notification logged: Status [${res.status}]. Note: ${res.detail}`);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-semibold"
              >
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CHECKOUT & POS MODAL COMPONENT
 */
function CheckoutModal({
  appointment,
  salon,
  onClose,
  onSuccess
}: {
  appointment: Appointment;
  salon: Salon | null;
  onClose: () => void;
  onSuccess: (receipt: Receipt) => void;
}) {
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [discountInr, setDiscountInr] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [txnRef, setTxnRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pointValue = salon?.inr_value_per_point || 0.5;
  const customerBalance = appointment.customer_loyalty_points || 0;
  const pointsDiscountRupees = Math.round(redeemPoints * pointValue);
  const subtotal = appointment.total_amount;
  const totalDiscount = Number(discountInr || 0) + pointsDiscountRupees;
  const finalPayable = Math.max(0, subtotal - totalDiscount);

  // Projected points to be earned from net payment
  const earnRate = salon?.points_per_100_inr || 1;
  const projectedPointsEarned = Math.floor((finalPayable / 100) * earnRate);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await checkoutAppointment({
        appointment_id: appointment.id,
        payment_method: paymentMethod,
        transaction_reference: txnRef.trim() || undefined,
        redeem_points: redeemPoints,
        discount_inr: Number(discountInr || 0),
        recorded_by: 'Front Desk'
      });

      onSuccess(res.receipt);
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 text-xs shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-stone-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Point of Sale</span>
            <h3 className="font-bold text-stone-900 text-base">Settle Appointment &amp; Bill</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 font-bold">✕</button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-stone-500">Client:</span>
            <strong className="text-stone-900">{appointment.customer_name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Service:</span>
            <strong className="text-stone-900">{appointment.service_name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Original Price:</span>
            <strong className="text-stone-900">₹{subtotal.toLocaleString()}</strong>
          </div>
          <div className="flex justify-between text-amber-800 pt-1 border-t border-stone-200">
            <span>Customer Available Points:</span>
            <strong>{customerBalance} Points (Worth ₹{(customerBalance * pointValue).toFixed(1)})</strong>
          </div>
        </div>

        {/* Loyalty Redemption Input */}
        <div>
          <label className="font-semibold text-stone-700 block mb-1">
            Redeem Loyalty Points (Max: {customerBalance})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={customerBalance}
              value={redeemPoints}
              onChange={e => setRedeemPoints(Math.min(customerBalance, Math.max(0, Number(e.target.value))))}
              className="flex-1 p-2 border rounded-lg font-bold"
            />
            <button
              type="button"
              onClick={() => setRedeemPoints(customerBalance)}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg"
            >
              Use Max
            </button>
          </div>
          {pointsDiscountRupees > 0 && (
            <span className="text-emerald-700 font-medium block mt-1">
              Discount Applied: -₹{pointsDiscountRupees}
            </span>
          )}
        </div>

        {/* Direct Discount */}
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Special Direct Discount (₹)</label>
          <input
            type="number"
            min={0}
            value={discountInr}
            onChange={e => setDiscountInr(Math.max(0, Number(e.target.value)))}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Payment Method *</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full p-2 border rounded-lg uppercase font-bold"
          >
            <option value="upi">UPI (GooglePay / PhonePe / Paytm)</option>
            <option value="cash">Cash in Hand</option>
            <option value="card">Credit / Debit Card</option>
            <option value="bank_transfer">Bank Transfer / IMPS</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-stone-700 block mb-1">Txn Reference / Notes</label>
          <input
            type="text"
            placeholder="e.g. UPI-REF-4921"
            value={txnRef}
            onChange={e => setTxnRef(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        {/* Total Summary */}
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/60 space-y-1">
          <div className="flex justify-between text-base font-extrabold text-stone-900">
            <span>Final Amount to Collect:</span>
            <span>₹{finalPayable.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-amber-800 flex justify-between">
            <span>Client will earn from this visit:</span>
            <strong className="text-emerald-700">+{projectedPointsEarned} Loyalty Points</strong>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-stone-600 hover:text-stone-800 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckout}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg font-bold shadow-xs transition-colors"
          >
            {isSubmitting ? 'Recording Settlement...' : 'Collect & Issue Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
