import React, { useState, useEffect, useRef } from 'react';
import {
  User, Phone, Scissors, CreditCard, QrCode, CheckCircle2,
  AlertCircle, RefreshCw, Plus, Trash2, ArrowRight, Clock,
  Calendar, ShieldCheck, Sparkles, Receipt, HelpCircle, X
} from 'lucide-react';
import { Salon, Service, Staff, Customer } from '../types/index.ts';
import { searchCustomerByPhone, saveCustomerVisit } from '../services/api.ts';

interface ReceptionistEntryProps {
  salon: Salon | null;
  services: Service[];
  staff: Staff[];
  onVisitSaved?: () => void;
  onNavigateToAdmin?: () => void;
}

interface SelectedServiceItem {
  id: string; // service id or 'custom-xxx'
  name: string;
  amount: number;
  isCustom?: boolean;
}

export const ReceptionistEntry: React.FC<ReceptionistEntryProps> = ({
  salon,
  services,
  staff,
  onVisitSaved,
  onNavigateToAdmin
}) => {
  // Form fields
  const [customerName, setCustomerName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'custom_upi_qr'>('cash');
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // Service dropdown / search state
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState<boolean>(false);
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [customServiceAmount, setCustomServiceAmount] = useState<string>('');
  const [showCustomServiceInput, setShowCustomServiceInput] = useState<boolean>(false);

  // Customer search & history state
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [customerVisitsHistory, setCustomerVisitsHistory] = useState<any[]>([]);
  const [customerSearchNotice, setCustomerSearchNotice] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    visitId?: string;
    visitCode?: string;
    amount?: number;
    customerName?: string;
  } | null>(null);

  // Reset confirmation dialog
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Debounced phone search
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const cleanDigits = phoneNumber.replace(/[^\d]/g, '');
    if (cleanDigits.length >= 10) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchCustomer(phoneNumber);
      }, 350);
    } else {
      setExistingCustomer(null);
      setCustomerVisitsHistory([]);
      setCustomerSearchNotice(null);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [phoneNumber]);

  const handleSearchCustomer = async (phone: string) => {
    setIsSearchingCustomer(true);
    setCustomerSearchNotice(null);
    try {
      const res = await searchCustomerByPhone(phone);
      if (res.exists && res.customer) {
        setExistingCustomer(res.customer);
        setCustomerVisitsHistory(res.visits || []);
        // Autofill name if empty
        if (!customerName.trim()) {
          setCustomerName(res.customer.full_name);
        }
        setCustomerSearchNotice(`Returning Customer: ${res.customer.full_name} (${res.customer.total_visits} prior visits)`);
      } else {
        setExistingCustomer(null);
        setCustomerVisitsHistory([]);
        setCustomerSearchNotice('New Customer (Profile will be registered automatically upon saving)');
      }
    } catch (err: any) {
      console.warn('Phone search lookup error:', err);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Add standard service
  const handleSelectService = (srv: Service) => {
    const existing = selectedServices.find(s => s.id === srv.id);
    if (!existing) {
      const updated = [...selectedServices, { id: srv.id, name: srv.name, amount: srv.price }];
      setSelectedServices(updated);
      autoComputeTotal(updated, discount);
    }
    setIsServiceDropdownOpen(false);
    setServiceSearchQuery('');
  };

  // Add custom service
  const handleAddCustomService = () => {
    if (!customServiceName.trim()) return;
    const amt = parseFloat(customServiceAmount) || 0;
    const newItem: SelectedServiceItem = {
      id: `custom-${Date.now()}`,
      name: customServiceName.trim(),
      amount: amt,
      isCustom: true
    };
    const updated = [...selectedServices, newItem];
    setSelectedServices(updated);
    autoComputeTotal(updated, discount);
    setCustomServiceName('');
    setCustomServiceAmount('');
    setShowCustomServiceInput(false);
  };

  // Remove a service
  const handleRemoveService = (index: number) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(updated);
    autoComputeTotal(updated, discount);
  };

  // Update a service's amount manually
  const handleUpdateServiceAmount = (index: number, newAmountStr: string) => {
    const parsed = parseFloat(newAmountStr) || 0;
    const updated = [...selectedServices];
    updated[index].amount = Math.max(0, parsed);
    setSelectedServices(updated);
    autoComputeTotal(updated, discount);
  };

  // Compute total charged and default amount paid
  const autoComputeTotal = (servicesList: SelectedServiceItem[], discountStr: string) => {
    const rawTotal = servicesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const disc = parseFloat(discountStr) || 0;
    const net = Math.max(0, rawTotal - disc);
    // If amount paid is empty or equals the previous total, update it automatically
    setAmountPaid(net > 0 ? String(net) : '0');
  };

  const handleDiscountChange = (val: string) => {
    setDiscount(val);
    const rawTotal = selectedServices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const disc = parseFloat(val) || 0;
    const net = Math.max(0, rawTotal - disc);
    setAmountPaid(net > 0 ? String(net) : '0');
  };

  // Form Reset
  const handleResetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setSelectedServices([]);
    setAmountPaid('');
    setPaymentMode('cash');
    setAppointmentId('');
    setSelectedStaffId('');
    setDiscount('');
    setNotes('');
    setTransactionRef('');
    setExistingCustomer(null);
    setCustomerVisitsHistory([]);
    setCustomerSearchNotice(null);
    setErrorMessage(null);
    setShowResetConfirm(false);
  };

  // Form Submission
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    const cleanDigits = phoneNumber.replace(/[^\d]/g, '');
    if (!phoneNumber.trim() || cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (selectedServices.length === 0) {
      setErrorMessage('Please select at least one salon service or add a custom service.');
      return;
    }

    if (amountPaid === '' || isNaN(Number(amountPaid))) {
      setErrorMessage('Amount paid is required. Enter ₹0 for complimentary visits.');
      return;
    }

    const parsedAmount = Number(amountPaid);
    if (parsedAmount < 0) {
      setErrorMessage('Amount paid cannot be negative.');
      return;
    }

    const selectedStaffObj = staff.find(s => s.id === selectedStaffId);

    setIsSubmitting(true);
    try {
      const response = await saveCustomerVisit({
        customer_name: customerName.trim(),
        phone: phoneNumber.trim(),
        services: selectedServices.map(s => ({
          id: s.isCustom ? undefined : s.id,
          name: s.name,
          amount: s.amount
        })),
        amount_paid: parsedAmount,
        payment_mode: paymentMode,
        appointment_id: appointmentId.trim() || undefined,
        staff_id: selectedStaffId || undefined,
        staff_name: selectedStaffObj ? selectedStaffObj.name : undefined,
        discount: parseFloat(discount) || 0,
        notes: notes.trim(),
        transaction_reference: transactionRef.trim(),
        receptionist_id: 'receptionist-subhanpura',
        receptionist_name: 'Front Desk Receptionist (A-One Subhanpura)'
      });

      if (response.success) {
        setSuccessInfo({
          message: 'Customer visit saved successfully!',
          visitId: response.visit?.id,
          visitCode: response.visit?.visit_code,
          amount: parsedAmount,
          customerName: customerName.trim()
        });

        // Clear current form after successful save
        handleResetForm();

        // Notify parent / Admin dashboard to refresh real-time metrics
        if (onVisitSaved) {
          onVisitSaved();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save customer visit. Please check network connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered services for dropdown
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  // Compute total services amount
  const totalServicesAmount = selectedServices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netPayable = Math.max(0, totalServicesAmount - (parseFloat(discount) || 0));

  // Dynamic UPI URL for Custom QR
  const upiId = salon?.custom_upi_id || 'aonehair@upi';
  const upiName = salon?.custom_upi_name || 'A-One Hair & Beauty Studio';
  const upiAmtParam = Number(amountPaid) > 0 ? `&am=${encodeURIComponent(amountPaid)}` : '';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}${upiAmtParam}&cu=INR`;
  const upiQrGeneratedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiString)}`;
  const qrDisplayUrl = salon?.custom_upi_qr_url?.trim() ? salon.custom_upi_qr_url : upiQrGeneratedUrl;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 mb-8 shadow-md border border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Reception Desk · Walk-In & Billing Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-100 tracking-wide">
              Customer Visit Entry
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Record walk-in client visits, service charges, payments, and synchronize automatically with the live Admin Dashboard.
            </p>
          </div>
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors self-start sm:self-center"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>View Admin Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successInfo && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start justify-between shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">{successInfo.message}</h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Visit Code: <strong className="font-mono">{successInfo.visitCode}</strong> · Customer: <strong>{successInfo.customerName}</strong> · Recorded Amount: <strong>₹{successInfo.amount?.toLocaleString()}</strong>
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">
                Admin dashboard metrics and monthly reports have been updated automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessInfo(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Action Failed</h4>
              <p className="text-xs text-red-800 mt-0.5">{errorMessage}</p>
              <p className="text-[11px] text-red-600 mt-1">
                Your entered data has been preserved. Please verify the highlighted details and press DONE again.
              </p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmitVisit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* SECTION 1: CUSTOMER DETAILS */}
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  1. Customer Information
                </h2>
                {isSearchingCustomer && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Looking up...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 072030 91115 or 98250 12345"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                    />
                  </div>
                  {customerSearchNotice && (
                    <p className={`text-[11px] mt-1.5 font-medium ${existingCustomer ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {customerSearchNotice}
                    </p>
                  )}
                </div>

                {/* Customer Full Name Field */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Customer Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Priyanshu Patel"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: SERVICES SELECTION */}
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  2. Salon Service(s) <span className="text-red-500">*</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCustomServiceInput(!showCustomServiceInput)}
                  className="text-xs text-amber-700 font-semibold hover:text-amber-800 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showCustomServiceInput ? 'Cancel Custom Service' : 'Add Custom / Other Service'}
                </button>
              </div>

              {/* Service Dropdown & Search */}
              <div className="relative mb-3">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Search &amp; Select Services (Multi-select allowed)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceSearchQuery}
                    onChange={(e) => {
                      setServiceSearchQuery(e.target.value);
                      setIsServiceDropdownOpen(true);
                    }}
                    onFocus={() => setIsServiceDropdownOpen(true)}
                    placeholder="Search from 26 salon services (Haircut, Balayage, Keratin, Facial...)"
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                  {serviceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setServiceSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {isServiceDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-lg divide-y divide-stone-100">
                    <div className="p-2 bg-stone-50 text-[11px] font-semibold text-stone-500 flex justify-between items-center">
                      <span>Click any service to add to this visit</span>
                      <button
                        type="button"
                        onClick={() => setIsServiceDropdownOpen(false)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        Close
                      </button>
                    </div>
                    {filteredServices.length === 0 ? (
                      <div className="p-4 text-center text-xs text-stone-500">
                        No service matched "{serviceSearchQuery}". You can add it as a custom service below.
                      </div>
                    ) : (
                      filteredServices.map(srv => {
                        const isAlreadySelected = selectedServices.some(s => s.id === srv.id);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => handleSelectService(srv)}
                            className={`w-full text-left p-3 hover:bg-amber-50 flex items-center justify-between text-xs transition-colors ${
                              isAlreadySelected ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-stone-900">{srv.name}</div>
                              <div className="text-[11px] text-stone-500">{srv.category} · {srv.duration_minutes} mins</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-700">₹{srv.price}</span>
                              {isAlreadySelected ? (
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium">Added</span>
                              ) : (
                                <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">+ Add</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Custom Service Input Form */}
              {showCustomServiceInput && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 mb-4 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-900 mb-2">Record Other / Custom Service</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Service name (e.g. Hair Wash + Blowdry Combo)"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-stone-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={customServiceAmount}
                          onChange={(e) => setCustomServiceAmount(e.target.value)}
                          className="w-full pl-6 pr-2 py-2 bg-white rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomService}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Services Table */}
              <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 font-semibold">
                    <tr>
                      <th className="p-3">Selected Service</th>
                      <th className="p-3 w-36">Amount Charged (₹)</th>
                      <th className="p-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {selectedServices.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-stone-400">
                          No services selected yet. Pick a service from the dropdown above.
                        </td>
                      </tr>
                    ) : (
                      selectedServices.map((item, index) => (
                        <tr key={item.id + index}>
                          <td className="p-3 font-medium text-stone-900">
                            {item.name}
                            {item.isCustom && (
                              <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-normal">
                                Custom
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-2 text-stone-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.amount}
                                onChange={(e) => handleUpdateServiceAmount(index, e.target.value)}
                                className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveService(index)}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1"
                              title="Remove service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedServices.length > 0 && (
                    <tfoot className="bg-stone-100 border-t border-stone-200 text-stone-800 font-semibold">
                      <tr>
                        <td className="p-3 text-right">Subtotal Services:</td>
                        <td className="p-3 font-mono font-bold text-amber-900">
                          ₹{totalServicesAmount.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SECTION 3: AMOUNT PAID & PAYMENT MODE */}
            <div>
              <div className="border-b border-stone-200 pb-3 mb-4">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  3. Payment Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Discount */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Discount (₹, Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                    />
                  </div>
                </div>

                {/* Amount Paid Field */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Amount Received / Paid <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-amber-500 text-base font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono bg-amber-50/20"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Net Payable: ₹{netPayable.toLocaleString()} · Zero amount allowed only for complimentary visits.
                  </p>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* 1. Cash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMode === 'cash'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-lg">💵</span>
                    <span>1. Cash</span>
                  </button>

                  {/* 2. UPI */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMode === 'upi'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-lg">📱</span>
                    <span>2. UPI</span>
                  </button>

                  {/* 3. Custom UPI QR */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('custom_upi_qr')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMode === 'custom_upi_qr'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-amber-700" />
                    <span>3. Custom UPI QR</span>
                  </button>
                </div>
              </div>

              {/* Display Custom UPI QR Code when selected */}
              {paymentMode === 'custom_upi_qr' && (
                <div className="p-5 bg-gradient-to-b from-stone-50 to-amber-50/40 rounded-2xl border-2 border-amber-300/80 mb-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm shrink-0 text-center">
                      <img
                        src={qrDisplayUrl}
                        alt="Salon Custom UPI QR Code"
                        className="w-40 h-40 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">Scan with GPay / PhonePe / Paytm</span>
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-900 rounded-md text-[11px] font-bold">
                        <QrCode className="w-3.5 h-3.5" />
                        Salon Custom UPI QR Display
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">{upiName}</h4>
                      <p className="text-xs text-stone-600 font-mono font-medium">
                        UPI ID: <span className="bg-white px-2 py-0.5 rounded border border-stone-200">{upiId}</span>
                      </p>
                      <p className="text-xs text-stone-700">
                        Amount to Collect: <strong className="text-amber-900 font-mono text-sm">₹{Number(amountPaid || 0).toLocaleString()}</strong>
                      </p>
                      <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg text-[11px] text-amber-900">
                        <strong>Important:</strong> Showing the QR code allows the customer to scan and pay. Once payment notification is confirmed on the salon handset or app, enter the transaction reference (if available) and press DONE.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Reference & Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Transaction Reference (UTR / UPI Ref, Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI-349810294 or Bank Ref"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Stylist / Staff Member (Optional)
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  >
                    <option value="">-- Any / Assigned Stylist --</option>
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4: OPTIONAL FIELDS (Appointment ID & Notes) */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Appointment ID (If linked to prior booking)
                  </label>
                  <input
                    type="text"
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    placeholder="e.g. apt-01 or AL-2026-1001"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Visit Notes (Special styling, shade preference, etc.)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Preferred tea without sugar, requested gentle scalp massage"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (DONE & RESET) */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Reset button with confirmation */}
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>RESET FORM</span>
              </button>

              {/* DONE Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>SAVING TO DATABASE...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-stone-950" />
                    <span>DONE — SAVE CUSTOMER VISIT</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Customer History & Profile Sidebar (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Customer Permanent Profile
              </h3>
              {existingCustomer && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Verified Member
                </span>
              )}
            </div>

            {existingCustomer ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-base font-bold text-stone-900">{existingCustomer.full_name}</div>
                  <div className="text-xs text-stone-600 font-mono">{existingCustomer.phone}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200 text-xs">
                    <div>
                      <span className="text-stone-500 text-[11px] block">Total Visits:</span>
                      <strong className="text-stone-900 font-bold text-sm">{existingCustomer.total_visits}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block">Total Spent:</span>
                      <strong className="text-amber-900 font-bold text-sm">₹{existingCustomer.total_spent?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block">Loyalty Balance:</span>
                      <strong className="text-emerald-700 font-bold text-sm">{existingCustomer.loyalty_points} pts</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block">Registered On:</span>
                      <span className="text-stone-700 text-xs">{existingCustomer.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Visit History Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-stone-800 mb-2.5">Previous Visits History</h4>
                  {customerVisitsHistory.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No previous visits recorded via this console yet.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {customerVisitsHistory.map((v, i) => (
                        <div key={v.id || i} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-stone-800 font-medium">
                            <span>{v.visit_date} {v.visit_time ? `· ${v.visit_time.slice(0, 5)}` : ''}</span>
                            <span className="font-bold text-amber-900">₹{v.amount_paid}</span>
                          </div>
                          <div className="text-[11px] text-stone-600">
                            <strong>Services:</strong> {v.services_summary}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                            <span className="capitalize">Mode: {v.payment_mode?.replace('_', ' ')}</span>
                            <span className="font-mono text-[9px] text-stone-400">{v.visit_code}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400 space-y-3">
                <User className="w-10 h-10 text-stone-300 mx-auto" />
                <div className="text-xs">
                  Enter a 10-digit customer mobile number on the left. If they have visited before, their complete profile and visit timeline will appear here automatically.
                </div>
              </div>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-3 text-xs text-stone-600">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              Receptionist Protocol
            </h4>
            <ul className="space-y-2 list-disc list-inside text-[11px] text-stone-500">
              <li>Returning customers are recognized without creating duplicate accounts.</li>
              <li>Every saved visit appends a permanent record to the customer’s timeline.</li>
              <li>Transactions instantly update today's cash, UPI, and total revenue cards in the Admin Dashboard.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-stone-900">Confirm Reset</h3>
            <p className="text-xs text-stone-600">
              Are you sure you want to clear all current unsaved fields? This will erase the entered customer details and services from this form.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
