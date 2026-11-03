import React, { useState, useEffect } from 'react';
import {
  Globe, Layout, Sparkles, Image as ImageIcon, Tag, Users,
  MessageSquare, HelpCircle, FileText, Share2, Phone, Calendar,
  Clock, MapPin, Eye, EyeOff, Save, CheckCircle2, AlertCircle,
  Plus, Edit2, Trash2, ArrowUp, ArrowDown, ExternalLink,
  Shield, Check, X, RefreshCw, Layers, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  WebsiteContentPayload, WebsiteConfig, WebsiteAnnouncement,
  WebsiteOffer, WebsiteGalleryItem, WebsiteTestimonial,
  WebsiteFaq, WebsiteCustomSection, Service, Staff, DaySchedule
} from '../types/index.ts';
import {
  fetchAdminWebsiteContent, updateWebsiteConfig, publishWebsiteContent,
  toggleWebsiteItemActive, reorderWebsiteItems,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  createOffer, updateOffer, deleteOffer,
  createGalleryItem, updateGalleryItem, deleteGalleryItem,
  createTestimonial, updateTestimonial, deleteTestimonial,
  createFaq, updateFaq, deleteFaq,
  createCustomSection, updateCustomSection, deleteCustomSection,
  createService, updateService, deleteService,
  createStaff, updateStaff
} from '../services/api.ts';

interface WebsiteContentManagerProps {
  onContentUpdated?: () => void;
  onPreviewSite?: () => void;
}

export function WebsiteContentManager({ onContentUpdated, onPreviewSite }: WebsiteContentManagerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active sub-tab in content manager
  const [activeSubTab, setActiveSubTab] = useState<
    'business' | 'homepage' | 'about' | 'services' | 'staff' |
    'gallery' | 'offers' | 'testimonials' | 'contact' | 'booking' |
    'faq' | 'seo' | 'footer' | 'announcements' | 'custom_sections'
  >('business');

  // Live website content payload from server
  const [content, setContent] = useState<WebsiteContentPayload | null>(null);

  // Draft copy of website config for editing
  const [configDraft, setConfigDraft] = useState<WebsiteConfig | null>(null);

  // Modals for CRUD items
  const [announcementModal, setAnnouncementModal] = useState<{ open: boolean; item?: WebsiteAnnouncement }>({ open: false });
  const [offerModal, setOfferModal] = useState<{ open: boolean; item?: WebsiteOffer }>({ open: false });
  const [galleryModal, setGalleryModal] = useState<{ open: boolean; item?: WebsiteGalleryItem }>({ open: false });
  const [testimonialModal, setTestimonialModal] = useState<{ open: boolean; item?: WebsiteTestimonial }>({ open: false });
  const [faqModal, setFaqModal] = useState<{ open: boolean; item?: WebsiteFaq }>({ open: false });
  const [customSecModal, setCustomSecModal] = useState<{ open: boolean; item?: WebsiteCustomSection }>({ open: false });
  const [serviceModal, setServiceModal] = useState<{ open: boolean; item?: Service }>({ open: false });
  const [staffModal, setStaffModal] = useState<{ open: boolean; item?: Staff }>({ open: false });

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminWebsiteContent();
      setContent(data);
      if (data.config) {
        setConfigDraft(JSON.parse(JSON.stringify(data.config)));
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load website content');
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveConfig = async (andPublish = false) => {
    if (!configDraft) return;
    setSaving(true);
    try {
      const updateData = {
        ...configDraft,
        status: andPublish ? ('published' as const) : configDraft.status
      };
      const res = await updateWebsiteConfig(updateData);
      if (res.config) {
        setConfigDraft(JSON.parse(JSON.stringify(res.config)));
      }
      if (andPublish) {
        await publishWebsiteContent();
        showNotice('success', 'Changes published and live on public website!');
      } else {
        showNotice('success', 'Website configuration saved successfully!');
      }
      if (onContentUpdated) onContentUpdated();
      loadData();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishLive = async () => {
    setPublishing(true);
    try {
      if (configDraft) {
        await updateWebsiteConfig({ ...configDraft, status: 'published' });
      }
      await publishWebsiteContent();
      showNotice('success', 'All website content published to public visitors!');
      if (onContentUpdated) onContentUpdated();
      loadData();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleItem = async (type: string, id: string) => {
    try {
      const res = await toggleWebsiteItemActive(type, id);
      showNotice('success', res.message);
      loadData();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to toggle status');
    }
  };

  const handleMoveOrder = async (
    type: 'announcements' | 'offers' | 'gallery' | 'testimonials' | 'faqs' | 'custom_sections' | 'services' | 'staff',
    id: string,
    direction: 'up' | 'down'
  ) => {
    if (!content) return;
    let list: any[] = [];
    if (type === 'announcements') list = [...content.announcements];
    else if (type === 'offers') list = [...content.offers];
    else if (type === 'gallery') list = [...content.gallery];
    else if (type === 'testimonials') list = [...content.testimonials];
    else if (type === 'faqs') list = [...content.faqs];
    else if (type === 'custom_sections') list = [...content.customSections];
    else if (type === 'services') list = [...content.services];
    else if (type === 'staff') list = [...content.staff];

    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === list.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const orderIds = list.map(item => item.id);
    try {
      await reorderWebsiteItems(type, orderIds);
      loadData();
      if (onContentUpdated) onContentUpdated();
    } catch (err: any) {
      showNotice('error', 'Failed to update order');
    }
  };

  const subTabs = [
    { id: 'business', label: 'Business Info', icon: Globe, badge: 'A' },
    { id: 'homepage', label: 'Homepage & Order', icon: Layout, badge: 'B' },
    { id: 'about', label: 'About Us', icon: Sparkles, badge: 'C' },
    { id: 'services', label: 'Services & Pricing', icon: Tag, badge: 'D' },
    { id: 'staff', label: 'Staff & Team', icon: Users, badge: 'E' },
    { id: 'gallery', label: 'Photo Gallery', icon: ImageIcon, badge: 'F' },
    { id: 'offers', label: 'Offers & Deals', icon: Sparkles, badge: 'G' },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, badge: 'H' },
    { id: 'contact', label: 'Contact & Map', icon: MapPin, badge: 'I' },
    { id: 'booking', label: 'Booking Settings', icon: Calendar, badge: 'J' },
    { id: 'faq', label: 'FAQ & Policies', icon: HelpCircle, badge: 'K' },
    { id: 'seo', label: 'SEO & Social Cards', icon: Share2, badge: 'L' },
    { id: 'footer', label: 'Footer Settings', icon: FileText, badge: 'M' },
    { id: 'announcements', label: 'Announcements', icon: AlertCircle, badge: 'N' },
    { id: 'custom_sections', label: 'Custom Sections', icon: Layers, badge: 'O' },
  ];

  if (loading && !content) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Loading Website Content Management...</p>
      </div>
    );
  }

  const bInfo = configDraft?.business_info;
  const hInfo = configDraft?.hero_section;
  const aInfo = configDraft?.about_section;
  const cInfo = configDraft?.contact_section;
  const bkInfo = configDraft?.booking_settings;
  const pInfo = configDraft?.policies_faq_info;
  const sInfo = configDraft?.seo_settings;
  const fInfo = configDraft?.footer_settings;
  const secVisibility = configDraft?.section_visibility || {};
  const secOrder = configDraft?.section_order || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/10 text-amber-800 rounded-xl">
                <Globe className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900">
                Website Content Management
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Live &amp; Synchronized
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Manage all business information, homepage sections, services, staff, photos, offers, policies, and SEO directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (onPreviewSite) onPreviewSite();
                else setPreviewModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-stone-600" />
              <span>Preview Website</span>
            </button>

            <button
              onClick={() => handleSaveConfig(false)}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-stone-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-800" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              onClick={handlePublishLive}
              disabled={publishing}
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{publishing ? 'Publishing...' : 'Publish Live to Public'}</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
                isActive
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                isActive ? 'bg-amber-400 text-stone-950' : 'bg-stone-200 text-stone-700'
              }`}>
                {tab.badge}
              </span>
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT SECTIONS */}

      {/* ---------------- A. BUSINESS INFORMATION ---------------- */}
      {activeSubTab === 'business' && bInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">A</span>
              Business Information &amp; Studio Profile
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Configure official studio name, logo, phone, WhatsApp, full address, Google Maps link, and daily operating hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Salon Name</label>
              <input
                type="text"
                value={bInfo.salon_name || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, salon_name: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Official Website URL</label>
              <input
                type="text"
                value={bInfo.website_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, website_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Phone Number (Calling)</label>
              <input
                type="text"
                value={bInfo.phone || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, phone: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">WhatsApp Number</label>
              <input
                type="text"
                value={bInfo.whatsapp || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, whatsapp: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Contact Email Address</label>
              <input
                type="email"
                value={bInfo.email || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, email: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Logo Image URL</label>
              <input
                type="text"
                value={bInfo.logo_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, logo_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Complete Address</label>
              <input
                type="text"
                value={bInfo.address || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, address: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Google Maps Location Link / Query URL</label>
              <input
                type="text"
                value={bInfo.google_maps_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, google_maps_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Business Description</label>
              <textarea
                rows={3}
                value={bInfo.business_description || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, business_description: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Daily Opening Hours */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Opening Hours Schedule (Each Day)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(bInfo.opening_hours || []).map((sch, i) => (
                <div key={sch.day} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{sch.day}</span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sch.is_closed}
                        onChange={e => {
                          const updated = [...bInfo.opening_hours];
                          updated[i] = { ...sch, is_closed: e.target.checked };
                          setConfigDraft({
                            ...configDraft!,
                            business_info: { ...bInfo, opening_hours: updated }
                          });
                        }}
                        className="rounded text-amber-600"
                      />
                      <span>Closed</span>
                    </label>
                  </div>
                  {!sch.is_closed && (
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="time"
                        value={sch.open}
                        onChange={e => {
                          const updated = [...bInfo.opening_hours];
                          updated[i] = { ...sch, open: e.target.value };
                          setConfigDraft({
                            ...configDraft!,
                            business_info: { ...bInfo, opening_hours: updated }
                          });
                        }}
                        className="px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                      />
                      <span className="text-stone-400">to</span>
                      <input
                        type="time"
                        value={sch.close}
                        onChange={e => {
                          const updated = [...bInfo.opening_hours];
                          updated[i] = { ...sch, close: e.target.value };
                          setConfigDraft({
                            ...configDraft!,
                            business_info: { ...bInfo, opening_hours: updated }
                          });
                        }}
                        className="px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notices & Social Links */}
          <div className="pt-4 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Holiday &amp; Temporary Notice</label>
              <input
                type="text"
                placeholder="e.g. Open until 10:00 PM for late-evening clients."
                value={bInfo.holiday_notice || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: { ...bInfo, holiday_notice: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Instagram Profile Link</label>
              <input
                type="text"
                placeholder="https://instagram.com/aonehairstudio"
                value={bInfo.social_links?.instagram || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  business_info: {
                    ...bInfo,
                    social_links: { ...bInfo.social_links, instagram: e.target.value }
                  }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Business Information
            </button>
          </div>
        </div>
      )}

      {/* ---------------- B. HOMEPAGE & ORDER ---------------- */}
      {activeSubTab === 'homepage' && hInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">B</span>
              Homepage Hero &amp; Section Ordering
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Customize main hero banner copy, images, buttons, and enable/disable or rearrange homepage sections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Hero Main Heading</label>
              <input
                type="text"
                value={hInfo.heading || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, heading: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Hero Top Badge Text</label>
              <input
                type="text"
                value={hInfo.badge_text || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, badge_text: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Hero Subtitle</label>
              <input
                type="text"
                value={hInfo.subtitle || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, subtitle: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Main Description</label>
              <textarea
                rows={3}
                value={hInfo.description || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, description: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Hero Image URL</label>
              <input
                type="text"
                value={hInfo.hero_image || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, hero_image: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Primary Button Text</label>
              <input
                type="text"
                value={hInfo.primary_btn_text || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  hero_section: { ...hInfo, primary_btn_text: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Section Visibility & Reordering */}
          <div className="pt-4 border-t border-stone-200 space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Homepage Sections Visibility &amp; Ordering
            </h4>
            <div className="space-y-2">
              {secOrder.map((secKey, idx) => {
                const isVisible = secVisibility[secKey] !== false;
                const sectionLabels: Record<string, string> = {
                  announcements: 'Promotional Announcements Banner',
                  hero: 'Main Hero Section',
                  offers: 'Featured Offers & Packages',
                  services: 'Featured Services & Pricing Menu',
                  about: 'About Our Studio & Highlights',
                  staff: 'Featured Artisans & Stylists',
                  gallery: 'Salon Lookbook & Ambience Gallery',
                  testimonials: 'Customer Testimonials & Google Reviews',
                  faqs: 'Frequently Asked Questions (FAQ)',
                  custom_sections: 'Custom Studio Content Sections',
                  contact: 'Contact, Hours & Google Map'
                };
                return (
                  <div
                    key={secKey}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                      isVisible ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          {sectionLabels[secKey] || secKey}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {isVisible ? 'Visible on public website' : 'Hidden from homepage'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const updatedVis = { ...secVisibility, [secKey]: !isVisible };
                          setConfigDraft({ ...configDraft!, section_visibility: updatedVis });
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          isVisible
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                        }`}
                      >
                        {isVisible ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        onClick={() => {
                          if (idx === 0) return;
                          const newOrder = [...secOrder];
                          const t = newOrder[idx];
                          newOrder[idx] = newOrder[idx - 1];
                          newOrder[idx - 1] = t;
                          setConfigDraft({ ...configDraft!, section_order: newOrder });
                        }}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (idx === secOrder.length - 1) return;
                          const newOrder = [...secOrder];
                          const t = newOrder[idx];
                          newOrder[idx] = newOrder[idx + 1];
                          newOrder[idx + 1] = t;
                          setConfigDraft({ ...configDraft!, section_order: newOrder });
                        }}
                        disabled={idx === secOrder.length - 1}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Homepage Settings
            </button>
          </div>
        </div>
      )}

      {/* ---------------- C. ABOUT US ---------------- */}
      {activeSubTab === 'about' && aInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">C</span>
              About Us Page &amp; Studio Heritage
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Share the salon's story, mission, vision, specialties, and key milestones in Subhanpura.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">About Title</label>
              <input
                type="text"
                value={aInfo.title || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, title: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">About Subtitle</label>
              <input
                type="text"
                value={aInfo.subtitle || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, subtitle: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Salon History &amp; Story</label>
              <textarea
                rows={4}
                value={aInfo.salon_history || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, salon_history: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Mission &amp; Vision</label>
              <textarea
                rows={3}
                value={aInfo.mission_vision || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, mission_vision: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Experience &amp; Specialties</label>
              <textarea
                rows={3}
                value={aInfo.experience_specialties || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, experience_specialties: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Featured Image URL</label>
              <input
                type="text"
                value={aInfo.image_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, image_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Video Embed / Tour URL (Optional)</label>
              <input
                type="text"
                placeholder="https://youtube.com/embed/..."
                value={aInfo.video_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  about_section: { ...aInfo, video_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save About Us Information
            </button>
          </div>
        </div>
      )}

      {/* ---------------- D. SERVICES & PRICING ---------------- */}
      {activeSubTab === 'services' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">D</span>
                Services &amp; Pricing Management
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Add, edit, reorder, hide or restore salon treatments. Historical visits and receipts remain preserved when services are deactivated.
              </p>
            </div>
            <button
              onClick={() => setServiceModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.services.map((srv, idx) => {
              const isHidden = srv.is_active === 0;
              return (
                <div
                  key={srv.id}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {srv.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isHidden ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isHidden ? 'Hidden' : 'Active'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-stone-900">{srv.name}</h4>
                    <p className="text-xs text-stone-500 line-clamp-2">{srv.description}</p>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm font-bold text-stone-900">₹{srv.price}</span>
                      {srv.discounted_price && srv.discounted_price < srv.price && (
                        <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                          Special: ₹{srv.discounted_price}
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400 ml-auto">{srv.duration_minutes} mins</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveOrder('services', srv.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder('services', srv.id, 'down')}
                        disabled={idx === content.services.length - 1}
                        className="p-1 rounded hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleItem('services', srv.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                      >
                        {isHidden ? 'Restore' : 'Hide'}
                      </button>
                      <button
                        onClick={() => setServiceModal({ open: true, item: srv })}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- E. STAFF & TEAM ---------------- */}
      {activeSubTab === 'staff' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">E</span>
                Staff &amp; Artisans Management
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Manage stylist profiles, public designations, specialties, and active statuses without exposing private contact info.
              </p>
            </div>
            <button
              onClick={() => setStaffModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.staff.map((st, idx) => {
              const isHidden = st.is_active === 0;
              return (
                <div
                  key={st.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={st.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                      alt={st.name}
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-stone-900">{st.name}</h4>
                      <span className="text-xs text-amber-800 font-medium block">
                        {st.designation || st.role}
                      </span>
                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                        {st.specialties || st.bio}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 text-xs">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isHidden ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isHidden ? 'Hidden from public' : 'Active'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleItem('staff', st.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                      >
                        {isHidden ? 'Restore' : 'Hide'}
                      </button>
                      <button
                        onClick={() => setStaffModal({ open: true, item: st })}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- F. GALLERY ---------------- */}
      {activeSubTab === 'gallery' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">F</span>
                Salon Ambience &amp; Transformation Gallery
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Upload photos and videos, organize by category (Hair Styling, Hair Colour, Bridal, Ambience), set featured status, hide or restore.
              </p>
            </div>
            <button
              onClick={() => setGalleryModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Media Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {content.gallery.map((item, idx) => {
              const isHidden = item.is_active === 0;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.category}
                    </div>
                    {item.is_featured === 1 && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Featured
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-1">
                    <h4 className="font-bold text-xs text-stone-900">{item.title}</h4>
                    {item.description && (
                      <p className="text-[11px] text-stone-500 line-clamp-1">{item.description}</p>
                    )}
                  </div>

                  <div className="p-3 pt-0 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleItem('gallery', item.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      {isHidden ? 'Restore' : 'Hide'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setGalleryModal({ open: true, item })}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this gallery item?')) {
                            await deleteGalleryItem(item.id);
                            loadData();
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- G. OFFERS & PROMOTIONS ---------------- */}
      {activeSubTab === 'offers' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">G</span>
                Special Offers &amp; Seasonal Packages
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Configure promotional banners and combos. Expired offers automatically stop showing. Historical billing is never altered.
              </p>
            </div>
            <button
              onClick={() => setOfferModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Offer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.offers.map((off, idx) => {
              const isHidden = off.is_active === 0;
              return (
                <div
                  key={off.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    {off.image_url && (
                      <img
                        src={off.image_url}
                        alt={off.title}
                        className="w-full h-32 object-cover rounded-xl border border-stone-100 mb-2"
                      />
                    )}
                    <h4 className="font-bold text-sm text-stone-900">{off.title}</h4>
                    <p className="text-xs text-stone-600 line-clamp-2">{off.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-bold text-stone-900">₹{off.discounted_price}</span>
                      {off.original_price > off.discounted_price && (
                        <span className="text-xs text-stone-400 line-through">₹{off.original_price}</span>
                      )}
                      {off.discount_percentage && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full ml-auto">
                          {off.discount_percentage}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 text-xs">
                    <button
                      onClick={() => handleToggleItem('offers', off.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      {isHidden ? 'Restore' : 'Hide'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setOfferModal({ open: true, item: off })}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this promotional offer?')) {
                            await deleteOffer(off.id);
                            loadData();
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- H. TESTIMONIALS ---------------- */}
      {activeSubTab === 'testimonials' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">H</span>
                Testimonials &amp; Verified Reviews
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Display authentic reviews and customer feedback. Control order, hide or restore individual reviews.
              </p>
            </div>
            <button
              onClick={() => setTestimonialModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.testimonials.map((test, idx) => {
              const isHidden = test.is_active === 0;
              return (
                <div
                  key={test.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">{test.customer_name}</span>
                      <span className="text-xs text-amber-500 font-bold">★ {test.rating}.0</span>
                    </div>
                    <p className="text-xs text-stone-600 italic">"{test.review_text}"</p>
                    <div className="text-[11px] text-stone-400">
                      Source: {test.source} {test.service_taken ? `· ${test.service_taken}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 text-xs">
                    <button
                      onClick={() => handleToggleItem('testimonials', test.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      {isHidden ? 'Restore' : 'Hide'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTestimonialModal({ open: true, item: test })}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this testimonial?')) {
                            await deleteTestimonial(test.id);
                            loadData();
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- I. CONTACT & LOCATION ---------------- */}
      {activeSubTab === 'contact' && cInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">I</span>
              Contact Page, Map &amp; Accessibility
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Configure contact headings, Google Map embed URL, quick call and WhatsApp triggers, plus parking instructions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Section Title</label>
              <input
                type="text"
                value={cInfo.contact_heading || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  contact_section: { ...cInfo, contact_heading: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Section Subtitle</label>
              <input
                type="text"
                value={cInfo.contact_subheading || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  contact_section: { ...cInfo, contact_subheading: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Google Maps Embed URL (iframe src)</label>
              <input
                type="text"
                placeholder="https://www.google.com/maps/embed?..."
                value={cInfo.map_embed_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  contact_section: { ...cInfo, map_embed_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Parking Information</label>
              <input
                type="text"
                value={cInfo.parking_info || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  contact_section: { ...cInfo, parking_info: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Accessibility Information</label>
              <input
                type="text"
                value={cInfo.accessibility_info || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  contact_section: { ...cInfo, accessibility_info: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Contact Settings
            </button>
          </div>
        </div>
      )}

      {/* ---------------- J. BOOKING SETTINGS ---------------- */}
      {activeSubTab === 'booking' && bkInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">J</span>
              Online Booking Rules &amp; Policies
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Control online appointment access, minimum notice hours, max advance booking horizon, confirmation notices, and cancellation window.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Online Booking Status</label>
              <select
                value={bkInfo.online_booking_enabled ? 'enabled' : 'disabled'}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, online_booking_enabled: e.target.value === 'enabled' }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="enabled">Enabled (Accept online appointments)</option>
                <option value="disabled">Disabled (Walk-in &amp; Phone only)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Minimum Advance Notice (Hours)</label>
              <input
                type="number"
                value={bkInfo.min_notice_hours || 1}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, min_notice_hours: Number(e.target.value) }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Maximum Advance Booking (Days)</label>
              <input
                type="number"
                value={bkInfo.max_advance_days || 30}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, max_advance_days: Number(e.target.value) }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Slot Interval (Minutes)</label>
              <input
                type="number"
                value={bkInfo.slot_interval_minutes || 30}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, slot_interval_minutes: Number(e.target.value) }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Cancellation Policy Notice</label>
              <textarea
                rows={2}
                value={bkInfo.cancellation_policy_text || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, cancellation_policy_text: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Confirmation Message (Displayed upon booking)</label>
              <textarea
                rows={2}
                value={bkInfo.confirmation_message || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  booking_settings: { ...bkInfo, confirmation_message: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Booking Settings
            </button>
          </div>
        </div>
      )}

      {/* ---------------- K. FAQ & POLICIES ---------------- */}
      {activeSubTab === 'faq' && content && pInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">K</span>
                FAQ &amp; Studio Policies Management
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Manage frequently asked questions, cancellation, refund, privacy policy, and loyalty program rules.
              </p>
            </div>
            <button
              onClick={() => setFaqModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New FAQ</span>
            </button>
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Frequently Asked Questions (FAQ)
            </h4>
            <div className="space-y-2">
              {content.faqs.map((faq, idx) => {
                const isHidden = faq.is_active === 0;
                return (
                  <div
                    key={faq.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                      isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {faq.category}
                        </span>
                        <h5 className="font-bold text-xs text-stone-900">{faq.question}</h5>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 pl-1">{faq.answer}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-100 text-xs">
                      <button
                        onClick={() => handleToggleItem('faqs', faq.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                      >
                        {isHidden ? 'Restore' : 'Hide'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setFaqModal({ open: true, item: faq })}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this FAQ question?')) {
                              await deleteFaq(faq.id);
                              loadData();
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal & Policy Texts */}
          <div className="pt-4 border-t border-stone-200 space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Studio Policies &amp; Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Cancellation Policy</label>
                <textarea
                  rows={3}
                  value={pInfo.cancellation_policy || ''}
                  onChange={e => setConfigDraft({
                    ...configDraft!,
                    policies_faq_info: { ...pInfo, cancellation_policy: e.target.value }
                  })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Refund Policy</label>
                <textarea
                  rows={3}
                  value={pInfo.refund_policy || ''}
                  onChange={e => setConfigDraft({
                    ...configDraft!,
                    policies_faq_info: { ...pInfo, refund_policy: e.target.value }
                  })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Privacy Policy</label>
                <textarea
                  rows={3}
                  value={pInfo.privacy_policy || ''}
                  onChange={e => setConfigDraft({
                    ...configDraft!,
                    policies_faq_info: { ...pInfo, privacy_policy: e.target.value }
                  })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Loyalty Programme Terms</label>
                <textarea
                  rows={3}
                  value={pInfo.loyalty_terms || ''}
                  onChange={e => setConfigDraft({
                    ...configDraft!,
                    policies_faq_info: { ...pInfo, loyalty_terms: e.target.value }
                  })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Policies &amp; FAQs
            </button>
          </div>
        </div>
      )}

      {/* ---------------- L. SEO & SOCIAL SHARING ---------------- */}
      {activeSubTab === 'seo' && sInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">L</span>
              SEO, OpenGraph &amp; Social Share Cards
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Configure search engine metadata, OpenGraph titles and images, favicon, and keywords.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">SEO Page Title</label>
              <input
                type="text"
                value={sInfo.meta_title || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, meta_title: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">OpenGraph Title (Social Share)</label>
              <input
                type="text"
                value={sInfo.og_title || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, og_title: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Meta Description</label>
              <textarea
                rows={2}
                value={sInfo.meta_description || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, meta_description: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Keywords (Comma separated)</label>
              <input
                type="text"
                value={sInfo.keywords || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, keywords: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Social Share Image URL (OG Image)</label>
              <input
                type="text"
                value={sInfo.og_image || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, og_image: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Favicon URL</label>
              <input
                type="text"
                value={sInfo.favicon_url || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  seo_settings: { ...sInfo, favicon_url: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save SEO Settings
            </button>
          </div>
        </div>
      )}

      {/* ---------------- M. FOOTER ---------------- */}
      {activeSubTab === 'footer' && fInfo && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">M</span>
              Footer Copy &amp; Links
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Customize copyright notice, footer description, and toggle footer sections.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Footer Business Summary</label>
              <textarea
                rows={2}
                value={fInfo.description || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  footer_settings: { ...fInfo, description: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Copyright Text</label>
              <input
                type="text"
                value={fInfo.copyright_text || ''}
                onChange={e => setConfigDraft({
                  ...configDraft!,
                  footer_settings: { ...fInfo, copyright_text: e.target.value }
                })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveConfig(false)}
              className="px-5 py-2.5 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
            >
              Save Footer Settings
            </button>
          </div>
        </div>
      )}

      {/* ---------------- N. ANNOUNCEMENTS ---------------- */}
      {activeSubTab === 'announcements' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">N</span>
                Promotional &amp; Important Announcements
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Display top ribbons, hero bars, or notices for holiday schedules and seasonal offers.
              </p>
            </div>
            <button
              onClick={() => setAnnouncementModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Announcement</span>
            </button>
          </div>

          <div className="space-y-3">
            {content.announcements.map((ann, idx) => {
              const isHidden = ann.is_active === 0;
              return (
                <div
                  key={ann.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                        {ann.display_position}
                      </span>
                      {ann.badge_text && (
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                          {ann.badge_text}
                        </span>
                      )}
                      <h4 className="font-bold text-xs text-stone-900">{ann.title}</h4>
                    </div>
                    <p className="text-xs text-stone-600">{ann.message}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleToggleItem('announcements', ann.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      {isHidden ? 'Restore' : 'Hide'}
                    </button>
                    <button
                      onClick={() => setAnnouncementModal({ open: true, item: ann })}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete announcement?')) {
                          await deleteAnnouncement(ann.id);
                          loadData();
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- O. CUSTOM SECTIONS ---------------- */}
      {activeSubTab === 'custom_sections' && content && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded text-xs flex items-center justify-center">O</span>
                Custom Website Content Sections
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Add flexible structured content sections with safe layouts (split image, banner, card grid). No unsafe scripts permitted.
              </p>
            </div>
            <button
              onClick={() => setCustomSecModal({ open: true })}
              className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Section</span>
            </button>
          </div>

          <div className="space-y-4">
            {content.customSections.map((sec, idx) => {
              const isHidden = sec.is_active === 0;
              return (
                <div
                  key={sec.id}
                  className={`p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isHidden ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                        Layout: {sec.layout_type}
                      </span>
                      {sec.badge_text && (
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                          {sec.badge_text}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-stone-900">{sec.title}</h4>
                    </div>
                    {sec.subtitle && (
                      <p className="text-xs font-semibold text-amber-800">{sec.subtitle}</p>
                    )}
                    <p className="text-xs text-stone-600">{sec.description}</p>
                    {sec.button_text && (
                      <span className="inline-block text-[11px] text-stone-500">
                        Action: "{sec.button_text}" &rarr; {sec.button_link}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => handleToggleItem('custom_sections', sec.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      {isHidden ? 'Restore' : 'Hide'}
                    </button>
                    <button
                      onClick={() => setCustomSecModal({ open: true, item: sec })}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this custom section?')) {
                          await deleteCustomSection(sec.id);
                          loadData();
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CRUD MODAL: SERVICE */}
      {serviceModal.open && (
        <ServiceEditModal
          item={serviceModal.item}
          onClose={() => setServiceModal({ open: false })}
          onSaved={() => {
            setServiceModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: STAFF */}
      {staffModal.open && (
        <StaffEditModal
          item={staffModal.item}
          onClose={() => setStaffModal({ open: false })}
          onSaved={() => {
            setStaffModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: ANNOUNCEMENT */}
      {announcementModal.open && (
        <AnnouncementEditModal
          item={announcementModal.item}
          onClose={() => setAnnouncementModal({ open: false })}
          onSaved={() => {
            setAnnouncementModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: OFFER */}
      {offerModal.open && (
        <OfferEditModal
          item={offerModal.item}
          onClose={() => setOfferModal({ open: false })}
          onSaved={() => {
            setOfferModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: GALLERY */}
      {galleryModal.open && (
        <GalleryEditModal
          item={galleryModal.item}
          onClose={() => setGalleryModal({ open: false })}
          onSaved={() => {
            setGalleryModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: TESTIMONIAL */}
      {testimonialModal.open && (
        <TestimonialEditModal
          item={testimonialModal.item}
          onClose={() => setTestimonialModal({ open: false })}
          onSaved={() => {
            setTestimonialModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: FAQ */}
      {faqModal.open && (
        <FaqEditModal
          item={faqModal.item}
          onClose={() => setFaqModal({ open: false })}
          onSaved={() => {
            setFaqModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}

      {/* CRUD MODAL: CUSTOM SECTION */}
      {customSecModal.open && (
        <CustomSectionEditModal
          item={customSecModal.item}
          onClose={() => setCustomSecModal({ open: false })}
          onSaved={() => {
            setCustomSecModal({ open: false });
            loadData();
            if (onContentUpdated) onContentUpdated();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// SUB-MODALS FOR INDIVIDUAL ITEM EDITING
// ----------------------------------------------------

function ServiceEditModal({ item, onClose, onSaved }: { item?: Service; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || 'Haircut & Styling');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '350');
  const [discountedPrice, setDiscountedPrice] = useState(item?.discounted_price ? String(item.discounted_price) : '');
  const [duration, setDuration] = useState(item?.duration_minutes ? String(item.duration_minutes) : '30');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [isFeatured, setIsFeatured] = useState(item?.is_featured === 1);
  const [showPrice, setShowPrice] = useState(item?.show_price !== 0);
  const [saving, setSaving] = useState(false);

  const categories = [
    'Haircut & Styling', 'Hair Colouring', 'Hair Care & Spa',
    'Bridal & Grooming', 'Skin & Facials', 'Custom Services'
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name,
        category,
        description,
        price: Number(price),
        discounted_price: discountedPrice ? Number(discountedPrice) : null,
        duration_minutes: Number(duration),
        image_url: imageUrl,
        is_featured: isFeatured ? 1 : 0,
        show_price: showPrice ? 1 : 0,
        is_active: item ? item.is_active : 1
      };
      if (item) {
        await updateService(item.id, payload);
      } else {
        await createService(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Service' : 'Add New Service'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Service Name *</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Standard Price (₹) *</label>
              <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Discounted Price (₹)</label>
              <input type="number" placeholder="Optional" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Duration (Minutes)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Image URL</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
              <span>Featured on Homepage</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded" />
              <span>Show Price Publicly</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Service'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffEditModal({ item, onClose, onSaved }: { item?: Staff; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '');
  const [designation, setDesignation] = useState(item?.designation || 'Senior Hair Stylist');
  const [specialties, setSpecialties] = useState(item?.specialties || 'Hair Styling, Colouring, Care');
  const [phone, setPhone] = useState(item?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(item?.avatar_url || '');
  const [bio, setBio] = useState(item?.bio || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name,
        designation,
        specialties,
        phone: phone || '07203091115',
        avatar_url: avatarUrl,
        bio,
        role: item?.role || 'stylist',
        working_days: item?.working_days || '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
        start_time: item?.start_time || '09:00',
        end_time: item?.end_time || '20:00'
      };
      if (item) {
        await updateStaff(item.id, payload);
      } else {
        await createStaff(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Full Name *</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Designation</label>
            <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Specialties</label>
            <input type="text" value={specialties} onChange={e => setSpecialties(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Profile Photo URL</label>
            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Biography / About</label>
            <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Staff'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementEditModal({ item, onClose, onSaved }: { item?: WebsiteAnnouncement; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || '');
  const [message, setMessage] = useState(item?.message || '');
  const [linkUrl, setLinkUrl] = useState(item?.link_url || '');
  const [linkText, setLinkText] = useState(item?.link_text || '');
  const [badgeText, setBadgeText] = useState(item?.badge_text || 'Announcement');
  const [displayPosition, setDisplayPosition] = useState(item?.display_position || 'top_banner');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { title, message, link_url: linkUrl, link_text: linkText, badge_text: badgeText, display_position: displayPosition };
      if (item) {
        await updateAnnouncement(item.id, payload);
      } else {
        await createAnnouncement(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Announcement' : 'Add Announcement'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Title *</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Message *</label>
            <textarea required rows={2} value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Position</label>
              <select value={displayPosition} onChange={e => setDisplayPosition(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl bg-white">
                <option value="top_banner">Top Banner Bar</option>
                <option value="hero_bar">Hero Section Bar</option>
                <option value="popup">Notice Card</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Badge Text</label>
              <input type="text" value={badgeText} onChange={e => setBadgeText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Link Destination</label>
              <input type="text" placeholder="#offers, #booking" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Button Text</label>
              <input type="text" placeholder="View Offers" value={linkText} onChange={e => setLinkText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OfferEditModal({ item, onClose, onSaved }: { item?: WebsiteOffer; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [originalPrice, setOriginalPrice] = useState(item?.original_price ? String(item.original_price) : '4500');
  const [discountedPrice, setDiscountedPrice] = useState(item?.discounted_price ? String(item.discounted_price) : '3600');
  const [discountPercent, setDiscountPercent] = useState(item?.discount_percentage ? String(item.discount_percentage) : '20');
  const [terms, setTerms] = useState(item?.terms_conditions || '');
  const [actionType, setActionType] = useState(item?.action_type || 'book');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        title,
        description,
        image_url: imageUrl,
        original_price: Number(originalPrice),
        discounted_price: Number(discountedPrice),
        discount_percentage: Number(discountPercent),
        terms_conditions: terms,
        action_type: actionType,
        is_featured: 1,
        is_active: item ? item.is_active : 1
      };
      if (item) {
        await updateOffer(item.id, payload);
      } else {
        await createOffer(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Offer' : 'Add Special Offer'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Offer Title *</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold block mb-1">Original (₹)</label>
              <input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Discounted (₹) *</label>
              <input required type="number" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Discount %</label>
              <input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Banner Image URL</label>
            <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Terms &amp; Conditions</label>
            <input type="text" value={terms} onChange={e => setTerms(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Offer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GalleryEditModal({ item, onClose, onSaved }: { item?: WebsiteGalleryItem; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [mediaUrl, setMediaUrl] = useState(item?.media_url || '');
  const [category, setCategory] = useState(item?.category || 'Hair Styling');
  const [isFeatured, setIsFeatured] = useState(item?.is_featured === 1);
  const [saving, setSaving] = useState(false);

  const categories = ['Hair Styling', 'Hair Colour', 'Bridal & Makeup', 'Skin & Facials', 'Ambience'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        title,
        description,
        media_url: mediaUrl,
        category,
        is_featured: isFeatured ? 1 : 0,
        media_type: 'image'
      };
      if (item) {
        await updateGalleryItem(item.id, payload);
      } else {
        await createGalleryItem(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save gallery item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Gallery Photo' : 'Add Photo to Lookbook'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Title *</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Image URL *</label>
            <input required type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">Caption / Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="gf" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
            <label htmlFor="gf" className="cursor-pointer">Mark as Featured</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Photo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestimonialEditModal({ item, onClose, onSaved }: { item?: WebsiteTestimonial; onClose: () => void; onSaved: () => void }) {
  const [customerName, setCustomerName] = useState(item?.customer_name || '');
  const [rating, setRating] = useState(item?.rating ? String(item.rating) : '5');
  const [reviewText, setReviewText] = useState(item?.review_text || '');
  const [source, setSource] = useState(item?.source || 'Google Review');
  const [serviceTaken, setServiceTaken] = useState(item?.service_taken || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        customer_name: customerName,
        rating: Number(rating),
        review_text: reviewText,
        source,
        service_taken: serviceTaken,
        has_permission: 1,
        is_featured: 1
      };
      if (item) {
        await updateTestimonial(item.id, payload);
      } else {
        await createTestimonial(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Customer Name *</label>
            <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Review Feedback Text *</label>
            <textarea required rows={3} value={reviewText} onChange={e => setReviewText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Rating (Stars)</label>
              <select value={rating} onChange={e => setRating(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white">
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Review Source</label>
              <input type="text" value={source} onChange={e => setSource(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Service Experience</label>
            <input type="text" placeholder="Haircut & Color" value={serviceTaken} onChange={e => setServiceTaken(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Testimonial'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FaqEditModal({ item, onClose, onSaved }: { item?: WebsiteFaq; onClose: () => void; onSaved: () => void }) {
  const [question, setQuestion] = useState(item?.question || '');
  const [answer, setAnswer] = useState(item?.answer || '');
  const [category, setCategory] = useState(item?.category || 'General');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { question, answer, category };
      if (item) {
        await updateFaq(item.id, payload);
      } else {
        await createFaq(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit FAQ' : 'Add FAQ'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Question *</label>
            <input required type="text" value={question} onChange={e => setQuestion(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Answer *</label>
            <textarea required rows={3} value={answer} onChange={e => setAnswer(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save FAQ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomSectionEditModal({ item, onClose, onSaved }: { item?: WebsiteCustomSection; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || '');
  const [subtitle, setSubtitle] = useState(item?.subtitle || '');
  const [description, setDescription] = useState(item?.description || '');
  const [layoutType, setLayoutType] = useState(item?.layout_type || 'split_left_image');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [btnText, setBtnText] = useState(item?.button_text || '');
  const [btnLink, setBtnLink] = useState(item?.button_link || 'booking');
  const [badgeText, setBadgeText] = useState(item?.badge_text || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        title,
        subtitle,
        description,
        layout_type: layoutType,
        image_url: imageUrl,
        button_text: btnText,
        button_link: btnLink,
        badge_text: badgeText
      };
      if (item) {
        await updateCustomSection(item.id, payload);
      } else {
        await createCustomSection(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-stone-900">{item ? 'Edit Custom Section' : 'Add Custom Section'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Section Title *</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Subtitle</label>
            <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="font-bold block mb-1">Description *</label>
            <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Safe Layout</label>
              <select value={layoutType} onChange={e => setLayoutType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl bg-white">
                <option value="split_left_image">Split (Image Left)</option>
                <option value="split_right_image">Split (Image Right)</option>
                <option value="card_grid">Card Highlight</option>
                <option value="banner">Full Banner</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Badge Tag</label>
              <input type="text" value={badgeText} onChange={e => setBadgeText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Section Image URL</label>
            <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Action Button Text</label>
              <input type="text" placeholder="Book Your Visit" value={btnText} onChange={e => setBtnText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Button Destination</label>
              <input type="text" placeholder="booking, services, contact" value={btnLink} onChange={e => setBtnLink(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-stone-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-400 font-bold rounded-xl">{saving ? 'Saving...' : 'Save Section'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
