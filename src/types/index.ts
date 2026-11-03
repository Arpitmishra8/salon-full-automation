export interface Salon {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number;
  currency: string;
  currency_symbol: string;
  points_per_100_inr: number;
  inr_value_per_point: number;
  min_redeem_points: number;
  cancellation_notice_hours: number;
  website?: string;
  google_rating?: number;
  google_reviews?: number;
  custom_upi_id?: string;
  custom_upi_name?: string;
  custom_upi_qr_url?: string;
}

export interface Service {
  id: string;
  salon_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  discounted_price?: number;
  duration_minutes: number;
  image_url?: string;
  is_featured: number;
  is_active: number;
  display_order?: number;
  show_price?: number;
}

export interface Staff {
  id: string;
  salon_id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'owner' | 'manager' | 'receptionist' | 'stylist';
  designation?: string;
  specialties?: string;
  bio?: string;
  avatar_url?: string;
  working_days: string;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  display_order?: number;
  is_active: number;
}

export interface Customer {
  id: string;
  salon_id: string;
  full_name: string;
  phone: string;
  email?: string;
  birthday?: string;
  notes?: string;
  total_visits: number;
  total_spent: number;
  loyalty_points: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  booking_reference: string;
  salon_id: string;
  customer_id: string;
  staff_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
  total_amount: number;
  discount_amount: number;
  points_redeemed: number;
  points_discount: number;
  final_amount: number;
  notes?: string;
  source: 'online' | 'walk_in' | 'phone';
  created_at: string;
  service_name?: string;
  service_price?: number;
  service_category?: string;
  staff_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_loyalty_points?: number;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  appointment_id?: string;
  payment_id?: string;
  transaction_type: 'earned' | 'redeemed' | 'adjusted' | 'reversed' | 'expired';
  points: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  performed_by?: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface LoyaltyReward {
  id: string;
  salon_id: string;
  title: string;
  description?: string;
  points_required: number;
  discount_inr: number;
  is_active: number;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  appointment_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
  appointment_date: string;
  subtotal: number;
  discount: number;
  points_redeemed: number;
  points_discount: number;
  tax_amount: number;
  total_paid: number;
  payment_method: string;
  transaction_reference?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  salon_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  vendor?: string;
  notes?: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  salon_id: string;
  recipient: string;
  recipient_name?: string;
  channel: 'email' | 'sms' | 'whatsapp';
  event_type: string;
  subject?: string;
  content: string;
  status: 'delivered' | 'sent' | 'simulated_log' | 'failed';
  status_detail?: string;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  salon_id: string;
  email_enabled: number;
  sms_enabled: number;
  whatsapp_enabled: number;
  email_provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  resend_api_key: string;
  sms_provider: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  whatsapp_provider: string;
  whatsapp_api_token: string;
  whatsapp_phone_number_id: string;
  notify_on_booking: number;
  notify_on_cancellation: number;
  notify_on_reminder: number;
  notify_on_loyalty: number;
  template_booking_subject: string;
  template_booking_body: string;
  template_reminder_body: string;
  template_cancellation_body: string;
  template_loyalty_body: string;
}

export interface CustomerVisitService {
  id: string;
  visit_id: string;
  service_id?: string;
  service_name: string;
  amount: number;
}

export interface CustomerVisit {
  id: string;
  visit_code: string;
  salon_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  appointment_id?: string;
  staff_id?: string;
  staff_name?: string;
  services_summary: string;
  amount_charged: number;
  amount_paid: number;
  discount_amount: number;
  payment_mode: 'cash' | 'upi' | 'custom_upi_qr';
  payment_status: 'completed' | 'complimentary' | 'unpaid' | 'partially_paid';
  transaction_reference?: string;
  notes?: string;
  receptionist_id: string;
  receptionist_name: string;
  visit_date: string;
  visit_time: string;
  created_at: string;
}

export interface ReceptionistMetrics {
  today: {
    date: string;
    totalVisits: number;
    uniqueCustomers: number;
    totalCollected: number;
    cashPayments: number;
    upiPayments: number;
    customUpiQrPayments: number;
    newCustomers: number;
    returningCustomers: number;
  };
  month: {
    month: string;
    totalVisits: number;
    totalCollected: number;
    newCustomers: number;
  };
  recentVisits: CustomerVisit[];
}

// ----------------------------------------------------
// WEBSITE CONTENT MANAGEMENT TYPES
// ----------------------------------------------------

export interface DaySchedule {
  day: string;
  open: string;
  close: string;
  is_closed: boolean;
}

export interface BusinessInfo {
  salon_name: string;
  logo_url: string;
  business_description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  google_maps_url: string;
  google_business_link?: string;
  website_url: string;
  opening_hours: DaySchedule[];
  holiday_notice?: string;
  is_temporarily_closed?: boolean;
  social_links?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitter?: string;
  };
}

export interface HeroSectionConfig {
  enabled: boolean;
  heading: string;
  subtitle: string;
  description: string;
  hero_image: string;
  background_image?: string;
  badge_text?: string;
  primary_btn_text: string;
  primary_btn_action: 'booking' | 'services' | 'contact' | 'portal';
  secondary_btn_text: string;
  secondary_btn_action: 'booking' | 'services' | 'contact' | 'portal';
}

export interface StatItem {
  label: string;
  value: string;
  icon?: string;
}

export interface AboutSectionConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  salon_history: string;
  mission_vision: string;
  experience_specialties: string;
  image_url: string;
  video_url?: string;
  stats?: StatItem[];
}

export interface ContactSectionConfig {
  enabled: boolean;
  contact_heading: string;
  contact_subheading: string;
  map_embed_url?: string;
  contact_form_enabled: boolean;
  whatsapp_button_enabled: boolean;
  call_button_enabled: boolean;
  email_button_enabled: boolean;
  parking_info?: string;
  accessibility_info?: string;
}

export interface BookingSettingsConfig {
  online_booking_enabled: boolean;
  min_notice_hours: number;
  max_advance_days: number;
  booking_hours_start: string;
  booking_hours_end: string;
  slot_interval_minutes: number;
  cancellation_policy_text: string;
  confirmation_message: string;
  enquiry_phone?: string;
  enquiry_email?: string;
}

export interface PoliciesFaqConfig {
  cancellation_policy: string;
  refund_policy: string;
  privacy_policy: string;
  terms_conditions: string;
  loyalty_terms: string;
}

export interface SeoSettingsConfig {
  meta_title: string;
  meta_description: string;
  keywords?: string;
  og_title: string;
  og_description: string;
  og_image: string;
  favicon_url?: string;
}

export interface FooterSettingsConfig {
  description: string;
  copyright_text: string;
  show_social_links: boolean;
  show_opening_hours: boolean;
  show_address: boolean;
}

export interface WebsiteConfig {
  id: string;
  salon_id: string;
  status: 'published' | 'draft';
  business_info: BusinessInfo;
  hero_section: HeroSectionConfig;
  about_section: AboutSectionConfig;
  section_order: string[];
  section_visibility: Record<string, boolean>;
  contact_section: ContactSectionConfig;
  booking_settings: BookingSettingsConfig;
  policies_faq_info: PoliciesFaqConfig;
  seo_settings: SeoSettingsConfig;
  footer_settings: FooterSettingsConfig;
  updated_at: string;
}

export interface WebsiteAnnouncement {
  id: string;
  salon_id: string;
  title: string;
  message: string;
  link_url?: string;
  link_text?: string;
  badge_text?: string;
  display_position: 'top_banner' | 'hero_bar' | 'popup';
  start_date?: string;
  end_date?: string;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteOffer {
  id: string;
  salon_id: string;
  title: string;
  description: string;
  image_url: string;
  original_price: number;
  discounted_price: number;
  discount_percentage?: number;
  start_date?: string;
  end_date?: string;
  terms_conditions?: string;
  action_type: 'book' | 'whatsapp' | 'call';
  service_id?: string;
  is_featured: number;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteGalleryItem {
  id: string;
  salon_id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string;
  category: string;
  is_featured: number;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteTestimonial {
  id: string;
  salon_id: string;
  customer_name: string;
  avatar_url?: string;
  rating: number;
  review_text: string;
  source: string;
  service_taken?: string;
  review_date?: string;
  has_permission: number;
  is_featured: number;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteFaq {
  id: string;
  salon_id: string;
  category: string;
  question: string;
  answer: string;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteCustomSection {
  id: string;
  salon_id: string;
  title: string;
  subtitle?: string;
  description: string;
  layout_type: 'card_grid' | 'split_left_image' | 'split_right_image' | 'banner';
  image_url?: string;
  button_text?: string;
  button_link?: string;
  badge_text?: string;
  is_active: number;
  display_order: number;
  created_at: string;
}

export interface WebsiteContentPayload {
  config: WebsiteConfig | null;
  announcements: WebsiteAnnouncement[];
  offers: WebsiteOffer[];
  gallery: WebsiteGalleryItem[];
  testimonials: WebsiteTestimonial[];
  faqs: WebsiteFaq[];
  customSections: WebsiteCustomSection[];
  services: Service[];
  staff: Staff[];
}

