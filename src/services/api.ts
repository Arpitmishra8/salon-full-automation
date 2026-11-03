import {
  Salon, Service, Staff, Customer, Appointment, LoyaltyTransaction,
  LoyaltyReward, Receipt, Expense, NotificationLog, NotificationSettings,
  WebsiteContentPayload, WebsiteConfig, WebsiteAnnouncement, WebsiteOffer,
  WebsiteGalleryItem, WebsiteTestimonial, WebsiteFaq, WebsiteCustomSection
} from '../types/index.ts';

const API_BASE = '/api';

export async function fetchSalon(): Promise<Salon> {
  const res = await fetch(`${API_BASE}/salon`);
  if (!res.ok) throw new Error('Failed to fetch salon info');
  return res.json();
}

export async function updateSalon(salonData: Partial<Salon>): Promise<Salon> {
  const res = await fetch(`${API_BASE}/salon`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salonData),
  });
  if (!res.ok) throw new Error('Failed to update salon');
  return res.json();
}

export async function fetchServices(all = false): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/${all ? 'admin/services' : 'services'}`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export async function createService(serviceData: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_BASE}/admin/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });
  if (!res.ok) throw new Error('Failed to create service');
  return res.json();
}

export async function updateService(id: string, serviceData: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_BASE}/admin/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });
  if (!res.ok) throw new Error('Failed to update service');
  return res.json();
}

export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/services/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete service');
}

export async function fetchStaff(): Promise<Staff[]> {
  const res = await fetch(`${API_BASE}/staff`);
  if (!res.ok) throw new Error('Failed to fetch staff');
  return res.json();
}

export async function createStaff(staffData: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${API_BASE}/admin/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  if (!res.ok) throw new Error('Failed to create staff');
  return res.json();
}

export async function updateStaff(id: string, staffData: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${API_BASE}/admin/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  if (!res.ok) throw new Error('Failed to update staff');
  return res.json();
}

export async function addStaffTimeOff(staffId: string, date: string, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/staff/${staffId}/time-off`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, reason }),
  });
  if (!res.ok) throw new Error('Failed to record staff time off');
  return res.json();
}

export async function fetchAvailability(date: string, serviceId?: string, staffId?: string): Promise<{
  date: string;
  availableSlots: { time: string; availableStaffIds: string[] }[];
  staffCount: number;
}> {
  const params = new URLSearchParams({ date });
  if (serviceId) params.append('service_id', serviceId);
  if (staffId) params.append('staff_id', staffId);

  const res = await fetch(`${API_BASE}/availability?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch availability');
  return res.json();
}

export async function bookAppointment(data: {
  service_id: string;
  staff_id?: string;
  appointment_date: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
  source?: string;
}): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to book appointment');
  }
  return res.json();
}

export async function fetchAppointments(filters?: {
  date?: string;
  staff_id?: string;
  status?: string;
  search?: string;
}): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.append('date', filters.date);
  if (filters?.staff_id) params.append('staff_id', filters.staff_id);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const res = await fetch(`${API_BASE}/appointments?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch appointments');
  return res.json();
}

export async function updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function rescheduleAppointment(id: string, data: {
  appointment_date: string;
  start_time: string;
  staff_id?: string;
}): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to reschedule appointment');
  }
  return res.json();
}

export async function checkoutAppointment(data: {
  appointment_id: string;
  payment_method: string;
  transaction_reference?: string;
  redeem_points?: number;
  discount_inr?: number;
  recorded_by?: string;
}): Promise<{
  success: boolean;
  receipt: Receipt;
  pointsEarned: number;
  pointsRedeemed: number;
  newLoyaltyBalance: number;
}> {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to process checkout');
  }
  return res.json();
}

export async function fetchReceipt(id: string): Promise<{ receipt: Receipt; salon: Salon }> {
  const res = await fetch(`${API_BASE}/receipts/${id}`);
  if (!res.ok) throw new Error('Receipt not found');
  return res.json();
}

export async function processRefund(appointmentId: string, amount: number, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId, amount, reason }),
  });
  if (!res.ok) throw new Error('Failed to process refund');
  return res.json();
}

export async function fetchCustomers(search?: string, sortBy?: string): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (sortBy) params.append('sortBy', sortBy);

  const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function fetchCustomerDetails(id: string): Promise<{
  customer: Customer;
  appointments: Appointment[];
  loyaltyTransactions: LoyaltyTransaction[];
  payments: any[];
}> {
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer profile');
  return res.json();
}

export async function updateCustomerNotes(id: string, notes: string): Promise<void> {
  const res = await fetch(`${API_BASE}/customers/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to update notes');
}

export async function adjustCustomerPoints(customerId: string, points: number, reason: string): Promise<any> {
  const res = await fetch(`${API_BASE}/customers/adjust-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: customerId, points, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to adjust points');
  }
  return res.json();
}

export async function fetchLoyaltyRewards(): Promise<LoyaltyReward[]> {
  const res = await fetch(`${API_BASE}/loyalty/rewards`);
  if (!res.ok) throw new Error('Failed to fetch rewards');
  return res.json();
}

export async function fetchLoyaltyLedger(): Promise<LoyaltyTransaction[]> {
  const res = await fetch(`${API_BASE}/admin/loyalty/ledger`);
  if (!res.ok) throw new Error('Failed to fetch loyalty ledger');
  return res.json();
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(`${API_BASE}/expenses`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function createExpense(data: Partial<Expense>): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save expense');
  return res.json();
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch(`${API_BASE}/notifications/settings`);
  if (!res.ok) throw new Error('Failed to fetch notification settings');
  return res.json();
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const res = await fetch(`${API_BASE}/notifications/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update notification settings');
  return res.json();
}

export async function fetchNotificationLogs(): Promise<NotificationLog[]> {
  const res = await fetch(`${API_BASE}/notifications/logs`);
  if (!res.ok) throw new Error('Failed to fetch notification logs');
  return res.json();
}

export async function sendTestNotification(channel: string, recipient: string, message: string): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, recipient, message }),
  });
  if (!res.ok) throw new Error('Failed to send test notification');
  return res.json();
}

export async function trigger24hReminders(): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/trigger-reminders`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger reminders');
  return res.json();
}

export async function fetchAdminOverview(range = '30days'): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/overview?range=${range}`);
  if (!res.ok) throw new Error('Failed to fetch admin overview');
  return res.json();
}

export async function customerLogin(phone: string): Promise<{ success: boolean; customer: Customer }> {
  const res = await fetch(`${API_BASE}/auth/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function customerRegister(data: {
  full_name: string;
  phone: string;
  email?: string;
  birthday?: string;
}): Promise<{ success: boolean; customer: Customer }> {
  const res = await fetch(`${API_BASE}/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function fetchCustomerPortalData(phone: string): Promise<{
  customer: Customer;
  appointments: Appointment[];
  loyaltyTransactions: LoyaltyTransaction[];
  salon: Salon;
  availableRewards: LoyaltyReward[];
}> {
  const res = await fetch(`${API_BASE}/customer/portal-data?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) throw new Error('Failed to fetch portal data');
  return res.json();
}

// ----------------------------------------------------
// RECEPTIONIST ENTRY & MONTHLY REPORTING API
// ----------------------------------------------------

export async function searchCustomerByPhone(phone: string): Promise<{
  exists: boolean;
  customer: Customer | null;
  visits: any[];
}> {
  const res = await fetch(`${API_BASE}/receptionist/search-customer?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to search customer');
  }
  return res.json();
}

export async function saveCustomerVisit(visitData: {
  customer_name: string;
  phone: string;
  services: { id?: string; name: string; amount: number }[];
  amount_paid: number;
  payment_mode: 'cash' | 'upi' | 'custom_upi_qr';
  appointment_id?: string;
  staff_id?: string;
  staff_name?: string;
  discount?: number;
  notes?: string;
  transaction_reference?: string;
  receptionist_id?: string;
  receptionist_name?: string;
}): Promise<{
  success: boolean;
  message: string;
  visit: any;
  paymentId: string;
  customer: Customer;
  isNewCustomer: boolean;
}> {
  const res = await fetch(`${API_BASE}/receptionist/save-visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save customer visit');
  }
  return res.json();
}

export async function fetchReceptionistTodayMetrics(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/receptionist/today-metrics`);
  if (!res.ok) throw new Error('Failed to fetch receptionist metrics');
  return res.json();
}

export async function fetchMonthlyReport(params: {
  year?: string;
  month?: string;
  search?: string;
  payment_mode?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}): Promise<any> {
  const queryParts = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  const url = `${API_BASE}/admin/receptionist/monthly-report?${queryParts.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch monthly report');
  return res.json();
}

// ----------------------------------------------------
// WEBSITE CONTENT MANAGEMENT
// ----------------------------------------------------

export async function fetchPublicWebsiteContent(): Promise<WebsiteContentPayload> {
  const res = await fetch(`${API_BASE}/website/content`);
  if (!res.ok) throw new Error('Failed to fetch website content');
  return res.json();
}

export async function fetchAdminWebsiteContent(): Promise<WebsiteContentPayload> {
  const res = await fetch(`${API_BASE}/admin/website/content`);
  if (!res.ok) throw new Error('Failed to fetch admin website content');
  return res.json();
}

export async function updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<{ success: boolean; config: WebsiteConfig }> {
  const res = await fetch(`${API_BASE}/admin/website/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update website configuration');
  }
  return res.json();
}

export async function publishWebsiteContent(): Promise<{ success: boolean; config: WebsiteConfig }> {
  const res = await fetch(`${API_BASE}/admin/website/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to publish website');
  }
  return res.json();
}

export async function toggleWebsiteItemActive(type: string, id: string): Promise<{ success: boolean; is_active: number; message: string }> {
  const res = await fetch(`${API_BASE}/admin/website/toggle-active/${type}/${id}`, {
    method: 'PATCH'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle item state');
  }
  return res.json();
}

export async function reorderWebsiteItems(type: string, order: string[]): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/website/reorder/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });
  if (!res.ok) throw new Error('Failed to reorder items');
  return res.json();
}

// Announcements CRUD
export async function createAnnouncement(data: Partial<WebsiteAnnouncement>): Promise<WebsiteAnnouncement> {
  const res = await fetch(`${API_BASE}/admin/website/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create announcement');
  return res.json();
}

export async function updateAnnouncement(id: string, data: Partial<WebsiteAnnouncement>): Promise<WebsiteAnnouncement> {
  const res = await fetch(`${API_BASE}/admin/website/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update announcement');
  return res.json();
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/announcements/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete announcement');
}

// Offers CRUD
export async function createOffer(data: Partial<WebsiteOffer>): Promise<WebsiteOffer> {
  const res = await fetch(`${API_BASE}/admin/website/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create offer');
  return res.json();
}

export async function updateOffer(id: string, data: Partial<WebsiteOffer>): Promise<WebsiteOffer> {
  const res = await fetch(`${API_BASE}/admin/website/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update offer');
  return res.json();
}

export async function deleteOffer(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/offers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete offer');
}

// Gallery CRUD
export async function createGalleryItem(data: Partial<WebsiteGalleryItem>): Promise<WebsiteGalleryItem> {
  const res = await fetch(`${API_BASE}/admin/website/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add gallery item');
  return res.json();
}

export async function updateGalleryItem(id: string, data: Partial<WebsiteGalleryItem>): Promise<WebsiteGalleryItem> {
  const res = await fetch(`${API_BASE}/admin/website/gallery/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update gallery item');
  return res.json();
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/gallery/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete gallery item');
}

// Testimonials CRUD
export async function createTestimonial(data: Partial<WebsiteTestimonial>): Promise<WebsiteTestimonial> {
  const res = await fetch(`${API_BASE}/admin/website/testimonials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create testimonial');
  return res.json();
}

export async function updateTestimonial(id: string, data: Partial<WebsiteTestimonial>): Promise<WebsiteTestimonial> {
  const res = await fetch(`${API_BASE}/admin/website/testimonials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update testimonial');
  return res.json();
}

export async function deleteTestimonial(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/testimonials/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete testimonial');
}

// FAQs CRUD
export async function createFaq(data: Partial<WebsiteFaq>): Promise<WebsiteFaq> {
  const res = await fetch(`${API_BASE}/admin/website/faqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create FAQ');
  return res.json();
}

export async function updateFaq(id: string, data: Partial<WebsiteFaq>): Promise<WebsiteFaq> {
  const res = await fetch(`${API_BASE}/admin/website/faqs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update FAQ');
  return res.json();
}

export async function deleteFaq(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/faqs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete FAQ');
}

// Custom Sections CRUD
export async function createCustomSection(data: Partial<WebsiteCustomSection>): Promise<WebsiteCustomSection> {
  const res = await fetch(`${API_BASE}/admin/website/custom-sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create custom section');
  return res.json();
}

export async function updateCustomSection(id: string, data: Partial<WebsiteCustomSection>): Promise<WebsiteCustomSection> {
  const res = await fetch(`${API_BASE}/admin/website/custom-sections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update custom section');
  return res.json();
}

export async function deleteCustomSection(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/website/custom-sections/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete custom section');
}


