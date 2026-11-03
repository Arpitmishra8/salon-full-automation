import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Scissors, CheckCircle, Sparkles, Phone, Mail, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Service, Staff, Appointment } from '../types/index.ts';
import { fetchAvailability, bookAppointment } from '../services/api.ts';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  staff: Staff[];
  preselectedServiceId?: string;
  onBookingSuccess: (appointment: Appointment) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  services,
  staff,
  preselectedServiceId,
  onBookingSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const [availableSlots, setAvailableSlots] = useState<{ time: string; availableStaffIds: string[] }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Customer Details Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
      setStep(2);
    }
  }, [preselectedServiceId]);

  // Load availability when date, service or staff changes
  useEffect(() => {
    if (step >= 3 && selectedDate && selectedServiceId) {
      loadSlots();
    }
  }, [selectedDate, selectedServiceId, selectedStaffId, step]);

  const loadSlots = async () => {
    try {
      setLoadingSlots(true);
      setBookingError(null);
      const res = await fetchAvailability(selectedDate, selectedServiceId, selectedStaffId);
      setAvailableSlots(res.availableSlots);
      if (selectedTimeSlot && !res.availableSlots.some(s => s.time === selectedTimeSlot)) {
        setSelectedTimeSlot('');
      }
    } catch (err: any) {
      setBookingError('Unable to load available time slots for the chosen date.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError('Please enter your full name and phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setBookingError(null);

      const created = await bookAppointment({
        service_id: selectedServiceId,
        staff_id: selectedStaffId,
        appointment_date: selectedDate,
        start_time: selectedTimeSlot,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        notes: customerNotes.trim() || undefined,
        source: 'online'
      });

      setConfirmedBooking(created);
      setStep(5);
      onBookingSuccess(created);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setBookingError(err.message || 'An error occurred while confirming booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedServiceId('');
    setSelectedStaffId('any');
    setSelectedTimeSlot('');
    setBookingError(null);
    setConfirmedBooking(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden text-stone-900 transition-all">
        {/* Modal Header */}
        <div className="bg-stone-900 text-stone-100 p-6 flex items-center justify-between border-b border-amber-900/30">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Appointment Booking
            </div>
            <h2 className="font-editorial text-2xl tracking-wide text-white mt-1">
              {step === 5 ? 'Booking Confirmed' : 'Reserve Your Luxury Experience'}
            </h2>
          </div>
          <button
            onClick={() => { resetModal(); onClose(); }}
            className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step < 5 && (
          <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span className={step >= 1 ? 'font-semibold text-amber-800' : ''}>1. Service</span>
            <span className="text-stone-400">/</span>
            <span className={step >= 2 ? 'font-semibold text-amber-800' : ''}>2. Specialist</span>
            <span className="text-stone-400">/</span>
            <span className={step >= 3 ? 'font-semibold text-amber-800' : ''}>3. Date & Time</span>
            <span className="text-stone-400">/</span>
            <span className={step >= 4 ? 'font-semibold text-amber-800' : ''}>4. Your Details</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {bookingError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* STEP 1: SELECT SERVICE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm text-stone-600 mb-2">
                Choose the bespoke treatment you wish to reserve:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {services.map(srv => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      setSelectedServiceId(srv.id);
                      setStep(2);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedServiceId === srv.id
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-amber-400 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider block mb-1">
                        {srv.category}
                      </span>
                      <h4 className="font-semibold text-stone-900 text-sm">{srv.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{srv.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-200/60 text-xs">
                      <span className="text-stone-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {srv.duration_minutes} mins
                      </span>
                      <span className="font-bold text-stone-900 text-sm">₹{srv.price.toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SPECIALIST */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-sm text-stone-600 mb-2">
                Select your preferred artisan specialist for{' '}
                <span className="font-semibold text-stone-900">{selectedService?.name}</span>:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedStaffId('any');
                    setStep(3);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedStaffId === 'any'
                      ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                      : 'border-stone-200 hover:border-amber-400 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      ANY
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">Any Available Specialist</div>
                      <div className="text-xs text-stone-500">First available master artisan</div>
                    </div>
                  </div>
                </button>

                {staff.map(st => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStaffId(st.id);
                      setStep(3);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedStaffId === st.id
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-amber-400 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {st.avatar_url ? (
                        <img
                          src={st.avatar_url}
                          alt={st.name}
                          className="w-10 h-10 rounded-full object-cover border border-stone-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                          {st.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{st.name}</div>
                        <div className="text-xs text-amber-800 font-medium capitalize">{st.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-200">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Services
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT DATE & TIME SLOT */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Select Appointment Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 bg-stone-50/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                    Available Time Slots ({selectedDate})
                  </label>
                  {loadingSlots && (
                    <span className="text-xs text-amber-700 font-medium">Checking salon schedule...</span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="py-8 text-center text-stone-400 text-xs">Loading available slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                    <Clock className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-700">No slots available on this date</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Please pick another date or select "Any Available Specialist".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTimeSlot(slot.time)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          selectedTimeSlot === slot.time
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white border-stone-300 text-stone-800 hover:border-amber-500 hover:bg-amber-50/30'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-200">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  disabled={!selectedTimeSlot}
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1.5 bg-amber-600 disabled:opacity-50 hover:bg-amber-700 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-colors"
                >
                  Continue to Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS & REVIEW */}
          {step === 4 && (
            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Service:</span>
                  <span className="font-semibold text-stone-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Specialist:</span>
                  <span className="font-semibold text-stone-900">
                    {selectedStaffId === 'any' ? 'Any Available Specialist' : selectedStaff?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date & Time:</span>
                  <span className="font-semibold text-stone-900">
                    {selectedDate} at {selectedTimeSlot} ({selectedService?.duration_minutes} min)
                  </span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 text-sm">
                  <span className="font-medium text-stone-700">Estimated Total:</span>
                  <span className="font-bold text-amber-800">₹{selectedService?.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Mobile Number (for SMS & WhatsApp) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="072030 91115"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email Address (for Confirmation & Reminders)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Notes or Special Preferences (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Allergies, sensitive skin, special occasion styling..."
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="text-[11px] text-stone-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Booking with this phone number earns you A-One Loyalty Points upon checkout!
                </span>
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 disabled:opacity-50 hover:from-amber-500 hover:to-amber-600 text-white font-medium text-xs px-6 py-2.5 rounded-lg transition-all shadow-sm"
                >
                  {isSubmitting ? 'Securing Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: CONFIRMATION SUCCESS */}
          {step === 5 && confirmedBooking && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
                  Booking Confirmed!
                </span>
                <h3 className="font-editorial text-2xl text-stone-900 mt-1">We look forward to welcoming you</h3>
                <p className="text-xs text-stone-500 mt-1">
                  A confirmation notification has been dispatched via Email &amp; SMS.
                </p>
              </div>

              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 max-w-md mx-auto text-left space-y-2.5 text-xs">
                <div className="flex justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500">Booking Reference:</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">
                    {confirmedBooking.booking_reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Service:</span>
                  <span className="font-semibold text-stone-800">{confirmedBooking.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Stylist / Specialist:</span>
                  <span className="font-semibold text-stone-800">{confirmedBooking.staff_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date &amp; Time:</span>
                  <span className="font-semibold text-stone-800">
                    {confirmedBooking.appointment_date} at {confirmedBooking.start_time}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 font-medium">
                  <span className="text-stone-600">Payable at Salon:</span>
                  <span className="font-bold text-stone-900">₹{confirmedBooking.final_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => { resetModal(); onClose(); }}
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
