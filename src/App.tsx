import React, { useState, useEffect } from 'react';
import {
  Sparkles, Calendar, Clock, MapPin, Phone, MessageCircle,
  ShieldCheck, Star, Award, Heart, CheckCircle2, ChevronRight,
  ArrowRight, Scissors, Gift, Users, Mail, ExternalLink, Globe,
  Tag, AlertCircle, X, ChevronDown, ChevronUp, Image as ImageIcon,
  Check, Volume2
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { ServicesSection } from './components/ServicesSection.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { ReceptionistEntry } from './components/ReceptionistEntry.tsx';
import {
  Salon, Service, Staff, Customer, Appointment,
  WebsiteContentPayload, WebsiteConfig, WebsiteAnnouncement,
  WebsiteOffer, WebsiteGalleryItem, WebsiteTestimonial,
  WebsiteFaq, WebsiteCustomSection
} from './types/index.ts';
import {
  fetchSalon, fetchServices, fetchStaff, fetchPublicWebsiteContent
} from './services/api.ts';

export default function App() {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentPayload | null>(null);

  // Navigation views: 'home' | 'services' | 'about' | 'contact' | 'loyalty' | 'portal' | 'admin' | 'receptionist'
  const [currentView, setCurrentView] = useState<
    'home' | 'services' | 'about' | 'contact' | 'loyalty' | 'portal' | 'admin' | 'receptionist'
  >('home');

  // Customer state
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  // UI state for gallery & FAQs
  const [activeGalleryCategory, setActiveGalleryCategory] = useState<string>('all');
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [topBannerDismissed, setTopBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Fetch salon baseline
      const s = await fetchSalon();
      setSalon(s);

      // 2. Fetch all public website content
      const content = await fetchPublicWebsiteContent();
      setWebsiteContent(content);

      if (content.services && content.services.length > 0) {
        setServices(content.services);
      } else {
        const srv = await fetchServices();
        setServices(srv);
      }

      if (content.staff && content.staff.length > 0) {
        setStaff(content.staff);
      } else {
        const st = await fetchStaff();
        setStaff(st);
      }

      // Sync SEO title and meta description
      if (content.config?.seo_settings?.meta_title) {
        document.title = content.config.seo_settings.meta_title;
      }
      if (content.config?.seo_settings?.meta_description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', content.config.seo_settings.meta_description);
      }
    } catch (err) {
      console.error('Failed to load website content:', err);
      // Fallback
      try {
        const s = await fetchSalon();
        setSalon(s);
        const srv = await fetchServices();
        setServices(srv);
        const st = await fetchStaff();
        setStaff(st);
      } catch (_e) {}
    }
  };

  const handleOpenBookingWithService = (serviceId: string) => {
    setPreselectedServiceId(serviceId);
    setIsBookingOpen(true);
  };

  const handleBookingSuccess = (appointment: Appointment) => {
    if (activeCustomer && appointment?.customer_phone?.includes(activeCustomer.phone.replace(/[^\d]/g, '').slice(-10))) {
      // It was booked by current customer
    }
  };

  // Business config shorthands
  const bInfo = websiteContent?.config?.business_info;
  const hInfo = websiteContent?.config?.hero_section;
  const aInfo = websiteContent?.config?.about_section;
  const cInfo = websiteContent?.config?.contact_section;
  const bkInfo = websiteContent?.config?.booking_settings;
  const fInfo = websiteContent?.config?.footer_settings;
  const pInfo = websiteContent?.config?.policies_faq_info;
  const secVisibility = websiteContent?.config?.section_visibility || {};
  const secOrder = websiteContent?.config?.section_order || [
    'announcements', 'hero', 'offers', 'services', 'about', 'staff', 'gallery', 'testimonials', 'faqs', 'custom_sections', 'contact'
  ];

  const studioName = bInfo?.salon_name || salon?.name || 'A-One Hair & Beauty Studio - Subhanpura';
  const studioPhone = bInfo?.phone || salon?.phone || '072030 91115';
  const studioAddress = bInfo?.address || salon?.address || 'Platinum Complex, G-1, Subhanpura, Vadodara, Gujarat 390023';
  const studioWebsite = bInfo?.website_url || salon?.website || 'aonehnb.com';
  const studioMapsUrl = bInfo?.google_maps_url || 'https://www.google.com/maps/search/?api=1&query=A-One+Hair+%26+Beauty+Studio+Platinum+Complex+G-1+Subhanpura+Vadodara+Gujarat+390023';
  const topAnnouncement = (websiteContent?.announcements || []).find(a => a.display_position === 'top_banner');

  const galleryItems = websiteContent?.gallery || [];
  const galleryCategories = ['all', ...Array.from(new Set(galleryItems.map(g => g.category)))];
  const filteredGallery = activeGalleryCategory === 'all'
    ? galleryItems
    : galleryItems.filter(g => g.category === activeGalleryCategory);

  const offers = websiteContent?.offers || [];
  const testimonials = websiteContent?.testimonials || [];
  const faqs = websiteContent?.faqs || [];
  const customSections = websiteContent?.customSections || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900 selection:bg-amber-200">
      {/* ---------------- TOP PROMO ANNOUNCEMENT BANNER ---------------- */}
      {!topBannerDismissed && topAnnouncement && secVisibility.announcements !== false && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-stone-950 px-4 py-2 text-xs font-semibold shadow-xs relative z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
              {topAnnouncement.badge_text && (
                <span className="bg-stone-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {topAnnouncement.badge_text}
                </span>
              )}
              <span className="font-bold">{topAnnouncement.title}:</span>
              <span className="text-stone-900 font-medium truncate">{topAnnouncement.message}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {topAnnouncement.link_url && (
                <a
                  href={topAnnouncement.link_url}
                  onClick={(e) => {
                    if (topAnnouncement.link_url?.startsWith('#')) {
                      e.preventDefault();
                      const target = topAnnouncement.link_url.replace('#', '');
                      if (target === 'offers') setCurrentView('home');
                      else if (target === 'services') setCurrentView('services');
                      else if (target === 'booking') {
                        setPreselectedServiceId(undefined);
                        setIsBookingOpen(true);
                      }
                    }
                  }}
                  className="bg-stone-950 hover:bg-stone-900 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition"
                >
                  {topAnnouncement.link_text || 'Learn More'}
                </a>
              )}
              <button
                onClick={() => setTopBannerDismissed(true)}
                className="p-1 hover:bg-amber-400/40 rounded text-stone-900"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        salon={salon}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenBooking={() => {
          setPreselectedServiceId(undefined);
          setIsBookingOpen(true);
        }}
        activeCustomer={activeCustomer}
        onOpenCustomerAuth={() => setCurrentView('portal')}
        onLogoutCustomer={() => setActiveCustomer(null)}
      />

      {/* Main View Container */}
      <div className="flex-1">
        {/* VIEW 1: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
          <AdminDashboard
            salon={salon}
            onRefreshSalon={loadInitialData}
            onOpenReceipt={id => setActiveReceiptId(id)}
          />
        )}

        {/* VIEW: RECEPTIONIST VISIT ENTRY */}
        {currentView === 'receptionist' && (
          <ReceptionistEntry
            salon={salon}
            services={services}
            staff={staff}
            onVisitSaved={loadInitialData}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        )}

        {/* VIEW 2: CUSTOMER PORTAL */}
        {currentView === 'portal' && (
          <CustomerPortal
            activeCustomer={activeCustomer}
            setActiveCustomer={setActiveCustomer}
            onOpenBooking={() => {
              setPreselectedServiceId(undefined);
              setIsBookingOpen(true);
            }}
            onViewReceipt={id => setActiveReceiptId(id)}
          />
        )}

        {/* VIEW 3: SERVICES & MENU */}
        {currentView === 'services' && (
          <ServicesSection
            services={services}
            onSelectServiceToBook={handleOpenBookingWithService}
          />
        )}

        {/* VIEW 4: ABOUT US (Dynamic from Admin) */}
        {currentView === 'about' && (
          <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-semibold text-amber-800 tracking-widest uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {aInfo?.subtitle || 'About Our Studio'}
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-stone-900">
                {aInfo?.title || studioName}
              </h2>
              <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                {bInfo?.business_description || 'Welcome to A-One Hair & Beauty Studio, your dedicated neighborhood destination for hair styling, creative coloring, rejuvenating skin care, and bridal artistry in Vadodara.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-3xl border border-stone-200 shadow-xs">
              <div className="space-y-4">
                <h3 className="font-editorial text-2xl font-bold text-stone-900">
                  {aInfo?.title || 'Crafting Personalized Beauty in Vadodara'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                  {aInfo?.salon_history || 'Conveniently situated at Platinum Complex in Subhanpura, A-One Hair & Beauty Studio brings together experienced hair stylists, skin aestheticians, and beauty professionals. Whether you are looking for a precision haircut, subtle global hair color, modern balayage, keratin hair smoothing, bridal makeup, or a refreshing facial cleanup, our team is committed to delivering exceptional care.'}
                </p>

                {aInfo?.mission_vision && (
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs text-stone-700">
                    <strong className="block text-amber-900 font-bold mb-1">Our Mission:</strong>
                    {aInfo.mission_vision}
                  </div>
                )}

                <div className="pt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setPreselectedServiceId(undefined);
                      setIsBookingOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    Book Your Appointment
                  </button>
                  <button
                    onClick={() => setCurrentView('services')}
                    className="border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
                  >
                    Explore Services Menu ({services.length})
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-stone-200 aspect-[4/3]">
                <img
                  src={aInfo?.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'}
                  alt={studioName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white text-xs">
                  <strong className="block text-amber-300 font-bold">Platinum Complex, G-1</strong>
                  {studioAddress}
                </div>
              </div>
            </div>

            {/* Factual Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-stone-800">
              {(aInfo?.stats || [
                { label: 'Google Rating', value: '4.0 / 5.0' },
                { label: 'Google Customer Reviews', value: '1,174+' },
                { label: 'Specialized Treatments', value: `${services.length} Services` },
                { label: 'Evening Closing Time', value: '10:00 PM Daily' }
              ]).map((st, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 text-center space-y-1 shadow-2xs">
                  <div className="text-xl font-bold text-amber-900 font-editorial">{st.value}</div>
                  <div className="text-xs text-stone-500">{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: CONTACT US (Dynamic from Admin) */}
        {currentView === 'contact' && (
          <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold text-amber-800 tracking-widest uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Get in Touch
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-stone-900">
                {cInfo?.contact_heading || 'Contact & Location'}
              </h2>
              <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                {cInfo?.contact_subheading || 'Reach out to A-One Hair & Beauty Studio in Subhanpura for appointments, bridal inquiries, and hair care questions.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Contact Information Card */}
              <div className="bg-white p-8 rounded-3xl border border-stone-200 space-y-6 shadow-sm">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Hair Salon &amp; Beauty Studio
                  </span>
                  <h3 className="font-editorial text-2xl font-bold text-stone-900 mt-1">
                    {studioName}
                  </h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-stone-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-stone-900">Salon Address:</strong>
                      <span>{studioAddress}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-stone-900">Phone Number:</strong>
                      <a href={`tel:${studioPhone.replace(/\s+/g, '')}`} className="text-amber-800 font-semibold hover:underline">
                        {studioPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-stone-900">Official Website:</strong>
                      <a
                        href={studioWebsite.startsWith('http') ? studioWebsite : `https://${studioWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-800 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        {studioWebsite} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-stone-900">Operating Hours:</strong>
                      <span>Closing Time: 10:00 PM (Monday – Sunday)</span>
                      {bInfo?.holiday_notice && (
                        <span className="block text-[11px] text-stone-500 mt-0.5">
                          {bInfo.holiday_notice}
                        </span>
                      )}
                    </div>
                  </div>

                  {cInfo?.parking_info && (
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-stone-900">Parking &amp; Access:</strong>
                        <span>{cInfo.parking_info}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-200 flex flex-wrap gap-3">
                  <a
                    href={studioMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Get Directions on Google Maps</span>
                  </a>

                  <a
                    href={`tel:${studioPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {studioPhone}</span>
                  </a>

                  <a
                    href={`https://wa.me/${(bInfo?.whatsapp || '917203091115').replace(/[^\d]/g, '')}?text=Hello%20A-One%20Hair%20%26%20Beauty%20Studio,%20I%20would%20like%20to%20inquire%20about%20an%20appointment.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Booking CTA card */}
              <div className="space-y-6">
                <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    <Calendar className="w-4 h-4" />
                    Book an Appointment Online
                  </div>
                  <h3 className="font-editorial text-2xl font-bold">
                    Reserve Your Seat with Confidence
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Select your treatment, pick your convenient date and time slot, and receive instant confirmation without waiting.
                  </p>
                  <button
                    onClick={() => {
                      setPreselectedServiceId(undefined);
                      setIsBookingOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs py-3 rounded-xl transition-all text-center shadow-md"
                  >
                    Book Appointment Now
                  </button>
                </div>

                {cInfo?.accessibility_info && (
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 text-xs text-stone-600 space-y-2">
                    <h4 className="font-bold text-stone-900 text-sm">Studio Accessibility:</h4>
                    <p>{cInfo.accessibility_info}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: LOYALTY CLUB INFORMATION */}
        {currentView === 'loyalty' && (
          <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-semibold text-amber-800 tracking-widest uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                A-One Loyalty Club
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-stone-900">
                Rewarding Your Visits to Subhanpura
              </h2>
              <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                Every visit to A-One Hair &amp; Beauty Studio earns points toward discounts on your favorite haircuts, treatments, and styling services.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
                  1
                </div>
                <h3 className="font-bold text-stone-900 text-base">Earn Points Automatically</h3>
                <p className="text-xs text-stone-500">
                  Earn 1 loyalty point for every ₹{100 / (salon?.points_per_100_inr || 1)} spent on eligible services.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
                  2
                </div>
                <h3 className="font-bold text-stone-900 text-base">Transparent Ledger</h3>
                <p className="text-xs text-stone-500">
                  Check your points ledger anytime online using your mobile number in the Customer Portal.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
                  3
                </div>
                <h3 className="font-bold text-stone-900 text-base">Redeem at Checkout</h3>
                <p className="text-xs text-stone-500">
                  Redeem points during billing for instant bill discounts or service upgrades.
                </p>
              </div>
            </div>

            {pInfo?.loyalty_terms && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">Loyalty Program Terms:</h4>
                <p>{pInfo.loyalty_terms}</p>
              </div>
            )}

            <div className="bg-gradient-to-r from-stone-900 to-amber-950 p-8 rounded-3xl text-stone-100 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div>
                <h3 className="font-editorial text-2xl font-bold text-white">Join the A-One Loyalty Club</h3>
                <p className="text-xs text-stone-300 mt-1">
                  Access your points, review past invoices, and track appointments.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('portal')}
                className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs px-6 py-3 rounded-xl transition-all shrink-0"
              >
                Access Customer Portal
              </button>
            </div>
          </div>
        )}

        {/* VIEW 7: DYNAMIC HOME PAGE (Controlled by Admin Sections) */}
        {currentView === 'home' && (
          <div className="space-y-20 pb-20">
            {/* Render Sections in Admin Configured Order */}
            {secOrder.map((sectionKey) => {
              if (secVisibility[sectionKey] === false) return null;

              // SECTION: HERO
              if (sectionKey === 'hero') {
                return (
                  <section key="hero" className="relative overflow-hidden bg-stone-900 text-stone-100 pt-16 pb-24 md:py-28">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.18),transparent_50%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(180,83,9,0.15),transparent_50%)] pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>{hInfo?.badge_text || 'Hair Salon & Beauty Studio · Subhanpura, Vadodara'}</span>
                          </div>

                          <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                            {hInfo?.heading || studioName}
                          </h1>

                          {hInfo?.subtitle && (
                            <p className="text-amber-200/90 text-base sm:text-lg font-medium">
                              {hInfo.subtitle}
                            </p>
                          )}

                          <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                            {hInfo?.description || 'Welcome to your trusted neighborhood destination for precision haircuts, hair colouring, global highlights, balayage, keratin smoothing, bridal makeup, facials, and spa grooming in Subhanpura.'}
                          </p>

                          {/* CTAs */}
                          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                            <button
                              onClick={() => {
                                setPreselectedServiceId(undefined);
                                setIsBookingOpen(true);
                              }}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>{hInfo?.primary_btn_text || 'Book an Appointment'}</span>
                            </button>

                            <button
                              onClick={() => setCurrentView('services')}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white text-sm font-medium px-6 py-3.5 rounded-xl transition-colors bg-stone-800/40"
                            >
                              <span>{hInfo?.secondary_btn_text || `View All ${services.length} Services`}</span>
                              <ChevronRight className="w-4 h-4 text-stone-400" />
                            </button>

                            <a
                              href={studioMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-stone-400 hover:text-amber-300 text-xs font-medium px-4 py-3.5 transition-colors"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>Directions</span>
                            </a>
                          </div>

                          {/* Business Highlights */}
                          <div className="pt-6 grid grid-cols-3 gap-4 border-t border-stone-800/80 text-stone-300 text-xs">
                            <div>
                              <div className="font-bold text-amber-300 text-lg sm:text-xl flex items-center justify-center lg:justify-start gap-1">
                                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                                <span>4.0 / 5.0</span>
                              </div>
                              <div className="text-[11px] text-stone-400">Google Rating</div>
                            </div>
                            <div>
                              <div className="font-bold text-amber-300 text-lg sm:text-xl">~1,174</div>
                              <div className="text-[11px] text-stone-400">Google Reviews</div>
                            </div>
                            <div>
                              <div className="font-bold text-amber-300 text-lg sm:text-xl">10:00 PM</div>
                              <div className="text-[11px] text-stone-400">Closing Time Daily</div>
                            </div>
                          </div>
                        </div>

                        {/* Hero Right Visual Banner */}
                        <div className="lg:col-span-5 relative">
                          <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-700/60 aspect-[4/5]">
                            <img
                              src={hInfo?.hero_image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'}
                              alt={studioName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />

                            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-amber-500/30 text-stone-100 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                                  <MapPin className="w-3.5 h-3.5" />
                                  Subhanpura, Vadodara
                                </div>
                                <div className="text-xs font-medium text-stone-200 mt-0.5">
                                  Platinum Complex, G-1 · {studioPhone}
                                </div>
                              </div>
                              <button
                                onClick={() => setCurrentView('portal')}
                                className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                              >
                                VIP Club
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              // SECTION: OFFERS & PACKAGES
              if (sectionKey === 'offers' && offers.length > 0) {
                return (
                  <section key="offers" id="offers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Seasonal Specials
                      </span>
                      <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900">
                        Featured Offers &amp; Packages
                      </h2>
                      <p className="text-xs text-stone-500">
                        Limited time savings on our popular hair smoothing, styling, and bridal combinations in Subhanpura.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {offers.map(off => (
                        <div
                          key={off.id}
                          className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                        >
                          <div>
                            {off.image_url && (
                              <div className="h-48 overflow-hidden relative">
                                <img
                                  src={off.image_url}
                                  alt={off.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {off.discount_percentage && (
                                  <div className="absolute top-3 right-3 bg-amber-500 text-stone-950 text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                    {off.discount_percentage}% OFF
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="p-6 space-y-3">
                              <h3 className="font-bold text-base text-stone-900">{off.title}</h3>
                              <p className="text-xs text-stone-600 leading-relaxed">{off.description}</p>
                              {off.terms_conditions && (
                                <p className="text-[11px] text-stone-400 italic">*{off.terms_conditions}</p>
                              )}
                            </div>
                          </div>

                          <div className="p-6 pt-3 border-t border-stone-100 flex items-center justify-between">
                            <div>
                              {off.original_price > off.discounted_price && (
                                <span className="text-xs text-stone-400 line-through block">
                                  ₹{off.original_price}
                                </span>
                              )}
                              <span className="text-lg font-bold text-stone-900">
                                ₹{off.discounted_price}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setPreselectedServiceId(off.service_id || undefined);
                                setIsBookingOpen(true);
                              }}
                              className="bg-stone-900 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                            >
                              Claim Offer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              // SECTION: FEATURED SERVICES
              if (sectionKey === 'services' && services.length > 0) {
                return (
                  <section key="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest block mb-1">
                          Signature Services
                        </span>
                        <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900">
                          Popular Treatments at Subhanpura
                        </h2>
                      </div>
                      <button
                        onClick={() => setCurrentView('services')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 hover:underline"
                      >
                        View All Services ({services.length}) &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {services.slice(0, 8).map(srv => (
                        <div
                          key={srv.id}
                          className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {srv.image_url && (
                              <div className="h-44 overflow-hidden">
                                <img
                                  src={srv.image_url}
                                  alt={srv.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <div className="p-5">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                                {srv.category}
                              </span>
                              <h4 className="font-bold text-stone-900 text-sm group-hover:text-amber-900 transition-colors">
                                {srv.name}
                              </h4>
                              <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                                {srv.description}
                              </p>
                            </div>
                          </div>

                          <div className="p-5 pt-2 border-t border-stone-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-stone-400 block">{srv.duration_minutes} min</span>
                              {srv.show_price !== 0 && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-stone-900 text-sm">
                                    ₹{(srv.discounted_price || srv.price).toLocaleString()}
                                  </span>
                                  {srv.discounted_price && srv.discounted_price < srv.price && (
                                    <span className="text-[11px] text-stone-400 line-through">
                                      ₹{srv.price}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleOpenBookingWithService(srv.id)}
                              className="bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              // SECTION: ABOUT / WHY CHOOSE
              if (sectionKey === 'about') {
                return (
                  <section key="about" className="bg-stone-100/80 py-16 border-y border-stone-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                      <div className="text-center max-w-2xl mx-auto space-y-2">
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest">
                          The A-One Experience
                        </span>
                        <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900">
                          Why Subhanpura Clients Choose Us
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                          <Award className="w-6 h-6 text-amber-700 mb-1" />
                          <h3 className="font-bold text-stone-900 text-sm">Experienced Stylists</h3>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Skilled artisans specializing in haircuts, balayage, global color, keratin smoothing, and bridal glam.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                          <ShieldCheck className="w-6 h-6 text-amber-700 mb-1" />
                          <h3 className="font-bold text-stone-900 text-sm">Hygienic &amp; Clean Studio</h3>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Clean equipment, fresh towels, and sanitized stations for comfortable hair and skin care.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                          <Clock className="w-6 h-6 text-amber-700 mb-1" />
                          <h3 className="font-bold text-stone-900 text-sm">Punctual Appointments</h3>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Zero overbooking guarantee. Reserve your slot online and get attended to on schedule.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                          <Gift className="w-6 h-6 text-amber-700 mb-1" />
                          <h3 className="font-bold text-stone-900 text-sm">Loyalty Club Points</h3>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Earn reward points on paid treatments and redeem directly at checkout for bill discounts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              // SECTION: STAFF & ARTISANS
              if (sectionKey === 'staff' && staff.length > 0) {
                return (
                  <section key="staff" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Our Team
                      </span>
                      <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900">
                        Meet Our Hair &amp; Beauty Artisans
                      </h2>
                      <p className="text-xs text-stone-500">
                        Experienced professionals dedicated to your styling, coloring, and grooming care.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {staff.map(st => (
                        <div key={st.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex items-start gap-4">
                          <img
                            src={st.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                            alt={st.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shrink-0"
                          />
                          <div className="space-y-1">
                            <h4 className="font-bold text-stone-900 text-sm">{st.name}</h4>
                            <span className="text-xs font-semibold text-amber-800 block">
                              {st.designation || st.role}
                            </span>
                            <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-2">
                              {st.specialties || st.bio}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              // SECTION: GALLERY / LOOKBOOK
              if (sectionKey === 'gallery' && galleryItems.length > 0) {
                return (
                  <section key="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Our Portfolio
                      </span>
                      <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900">
                        Salon Ambience &amp; Styling Lookbook
                      </h2>
                      <p className="text-xs text-stone-500">
                        Explore our creative haircuts, balayage transformations, bridal beauty, and relaxed studio ambience in Subhanpura.
                      </p>
                    </div>

                    {/* Category Filter Pills */}
                    {galleryCategories.length > 2 && (
                      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {galleryCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveGalleryCategory(cat)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition ${
                              activeGalleryCategory === cat
                                ? 'bg-stone-900 text-white'
                                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                            }`}
                          >
                            {cat === 'all' ? 'All Photos' : cat}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredGallery.map(img => (
                        <div
                          key={img.id}
                          onClick={() => setActiveLightboxMedia(img.media_url)}
                          className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer bg-stone-100 border border-stone-200 shadow-2xs"
                        >
                          <img
                            src={img.media_url}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white text-xs">
                            <span className="font-bold">{img.title}</span>
                            <span className="text-[10px] text-amber-300">{img.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              // SECTION: TESTIMONIALS
              if (sectionKey === 'testimonials' && testimonials.length > 0) {
                return (
                  <section key="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="text-center max-w-xl mx-auto space-y-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Client Feedback
                      </span>
                      <h2 className="font-editorial text-3xl font-bold text-stone-900">
                        Rated 4.0 / 5.0 on Google (~1,174 Reviews)
                      </h2>
                      <p className="text-xs text-stone-500">
                        Real experiences from guests visiting A-One Hair &amp; Beauty Studio in Subhanpura.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {testimonials.map(t => (
                        <div key={t.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex gap-1 text-amber-500">
                              {Array.from({ length: t.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                            <p className="text-xs text-stone-600 italic leading-relaxed">
                              "{t.review_text}"
                            </p>
                          </div>

                          <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-stone-900 block">{t.customer_name}</span>
                              <span className="text-[11px] text-stone-400">{t.service_taken || t.source}</span>
                            </div>
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                              {t.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              // SECTION: FAQS
              if (sectionKey === 'faqs' && faqs.length > 0) {
                return (
                  <section key="faqs" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Need Help?
                      </span>
                      <h2 className="font-editorial text-3xl font-bold text-stone-900">
                        Frequently Asked Questions
                      </h2>
                      <p className="text-xs text-stone-500">
                        Find answers regarding appointment bookings, payment methods, and services.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {faqs.map(faq => {
                        const isExpanded = expandedFaqId === faq.id;
                        return (
                          <div
                            key={faq.id}
                            className="bg-white border border-stone-200 rounded-2xl overflow-hidden transition"
                          >
                            <button
                              onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                              className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-stone-900 hover:bg-stone-50 transition"
                            >
                              <span>{faq.question}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="p-4 sm:p-5 pt-0 text-xs text-stone-600 leading-relaxed border-t border-stone-100">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              // SECTION: CUSTOM SECTIONS
              if (sectionKey === 'custom_sections' && customSections.length > 0) {
                return (
                  <div key="custom_sections" className="space-y-12">
                    {customSections.map(cSec => (
                      <section key={cSec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                          {cSec.image_url && cSec.layout_type === 'split_left_image' && (
                            <div className="rounded-2xl overflow-hidden aspect-[4/3] border border-stone-200 shadow-sm">
                              <img src={cSec.image_url} alt={cSec.title} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="space-y-4">
                            {cSec.badge_text && (
                              <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                {cSec.badge_text}
                              </span>
                            )}
                            <h3 className="font-editorial text-3xl font-bold text-stone-900">{cSec.title}</h3>
                            {cSec.subtitle && (
                              <p className="text-sm font-semibold text-amber-900">{cSec.subtitle}</p>
                            )}
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{cSec.description}</p>

                            {cSec.button_text && (
                              <div className="pt-2">
                                <button
                                  onClick={() => {
                                    if (cSec.button_link === 'services') setCurrentView('services');
                                    else if (cSec.button_link === 'contact') setCurrentView('contact');
                                    else {
                                      setPreselectedServiceId(undefined);
                                      setIsBookingOpen(true);
                                    }
                                  }}
                                  className="bg-stone-900 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
                                >
                                  {cSec.button_text}
                                </button>
                              </div>
                            )}
                          </div>

                          {cSec.image_url && cSec.layout_type !== 'split_left_image' && (
                            <div className="rounded-2xl overflow-hidden aspect-[4/3] border border-stone-200 shadow-sm">
                              <img src={cSec.image_url} alt={cSec.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                );
              }

              // SECTION: CONTACT & MAP
              if (sectionKey === 'contact') {
                return (
                  <section key="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-stone-900 rounded-3xl p-8 sm:p-12 text-stone-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-xl">
                      <div className="space-y-5">
                        <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5" />
                          Visit Our Studio
                        </div>
                        <h3 className="font-editorial text-3xl font-bold text-white">
                          Platinum Complex, G-1, Subhanpura
                        </h3>
                        <p className="text-xs text-stone-300 leading-relaxed">
                          {studioAddress}
                        </p>

                        <div className="space-y-2 text-xs text-stone-300">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>Closing Time: 10:00 PM Daily (09:00 – 22:00)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-amber-400" />
                            <span>Direct Phone: <a href={`tel:${studioPhone.replace(/\s+/g, '')}`} className="hover:underline">{studioPhone}</a></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-amber-400" />
                            <span>Official Website: <a href={studioWebsite.startsWith('http') ? studioWebsite : `https://${studioWebsite}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{studioWebsite}</a></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span>Google Rating: 4.0/5 based on ~1,174 Google Reviews</span>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-wrap gap-3">
                          <a
                            href={studioMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors border border-stone-700 shadow-sm"
                          >
                            <MapPin className="w-4 h-4 text-amber-400" />
                            <span>Get Directions on Google Maps</span>
                          </a>

                          <a
                            href={`https://wa.me/${(bInfo?.whatsapp || '917203091115').replace(/[^\d]/g, '')}?text=Hello%20A-One%20Hair%20%26%20Beauty%20Studio,%20I%20would%20like%20to%20book%20an%20appointment.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            onClick={() => {
                              setPreselectedServiceId(undefined);
                              setIsBookingOpen(true);
                            }}
                            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Book Online Now</span>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-stone-700/60 h-64 bg-stone-800 relative">
                        <img
                          src={aInfo?.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'}
                          alt={studioName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[1px]" />
                        <div className="absolute bottom-4 left-4 right-4 bg-stone-900/90 backdrop-blur-md p-3 rounded-xl text-[11px] text-stone-300 border border-stone-700/60">
                          <strong className="text-white block font-bold">{studioName}</strong>
                          {studioAddress}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* FOOTER (Dynamic from Admin) */}
      <footer className="bg-stone-950 text-stone-400 text-xs py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="font-editorial text-xl font-bold text-white tracking-wide">
              {studioName}
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              {fInfo?.description || 'Hair Salon & Beauty Studio located at Platinum Complex, Subhanpura, Vadodara. Complete appointment booking, loyalty rewards, and professional salon care.'}
            </p>
            <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Google Rating 4.0/5 (~1,174 Google Reviews)</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Quick Navigation</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentView('home')} className="hover:text-white">Home</button></li>
              <li><button onClick={() => setCurrentView('services')} className="hover:text-white">Services Menu ({services.length})</button></li>
              <li><button onClick={() => setCurrentView('about')} className="hover:text-white">About Us</button></li>
              <li><button onClick={() => setCurrentView('contact')} className="hover:text-white">Contact &amp; Location</button></li>
              <li><button onClick={() => setCurrentView('loyalty')} className="hover:text-white">Loyalty Rewards</button></li>
              <li><button onClick={() => setCurrentView('portal')} className="hover:text-white">Customer Portal</button></li>
              <li><button onClick={() => setCurrentView('receptionist')} className="text-amber-400 hover:text-amber-300 font-semibold">Receptionist Visit Entry</button></li>
              <li><button onClick={() => setCurrentView('admin')} className="text-amber-400 hover:text-amber-300 font-semibold">Admin Dashboard</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Opening Hours</h4>
            <ul className="space-y-1.5 text-stone-400">
              <li>Monday – Sunday</li>
              <li className="text-white font-semibold">09:00 AM – 10:00 PM</li>
              <li className="pt-2 text-stone-500">
                {bInfo?.holiday_notice || 'Open all 7 days for working professionals & families.'}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Subhanpura Address</h4>
            <div className="space-y-2 text-stone-400">
              <p>{studioAddress}</p>
              <p>Phone: <a href={`tel:${studioPhone.replace(/\s+/g, '')}`} className="text-amber-400 hover:underline">{studioPhone}</a></p>
              <p>Email: <a href={`mailto:${bInfo?.email || 'contact@aonehnb.com'}`} className="hover:underline">{bInfo?.email || 'contact@aonehnb.com'}</a></p>
              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href={studioMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-[11px]"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Google Maps Directions &rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-stone-800 text-stone-500 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px]">
          <div>
            {fInfo?.copyright_text || `© ${new Date().getFullYear()} A-One Hair & Beauty Studio - Subhanpura. All rights reserved.`}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('about')} className="hover:text-stone-300">About Studio</button>
            <button onClick={() => setCurrentView('loyalty')} className="hover:text-stone-300">Loyalty Terms</button>
            <button onClick={() => setCurrentView('contact')} className="hover:text-stone-300">Contact</button>
            <button onClick={() => setCurrentView('admin')} className="text-amber-400 hover:text-amber-300 font-semibold">Admin</button>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX MODAL */}
      {activeLightboxMedia && (
        <div
          onClick={() => setActiveLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setActiveLightboxMedia(null)}
              className="absolute top-4 right-4 p-2 bg-stone-900/80 text-white rounded-full hover:bg-stone-800 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activeLightboxMedia} alt="Enlarged Look" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {isBookingOpen && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            setPreselectedServiceId(undefined);
          }}
          services={services}
          staff={staff}
          preselectedServiceId={preselectedServiceId}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* RECEIPT MODAL */}
      {activeReceiptId && (
        <ReceiptModal
          receiptIdOrAppointmentId={activeReceiptId}
          onClose={() => setActiveReceiptId(null)}
        />
      )}
    </div>
  );
}
