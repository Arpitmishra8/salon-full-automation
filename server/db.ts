import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'salon.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Error reading existing database file, creating fresh:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');
  initSchema(dbInstance);
  migrateToAOneSalon(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS salons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      tagline TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      opening_time TEXT DEFAULT '09:00',
      closing_time TEXT DEFAULT '20:00',
      slot_interval_minutes INTEGER DEFAULT 30,
      currency TEXT DEFAULT 'INR',
      currency_symbol TEXT DEFAULT '₹',
      points_per_100_inr INTEGER DEFAULT 1,
      inr_value_per_point REAL DEFAULT 0.50,
      min_redeem_points INTEGER DEFAULT 50,
      cancellation_notice_hours INTEGER DEFAULT 2,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'stylist', -- 'owner', 'manager', 'receptionist', 'stylist'
      bio TEXT,
      avatar_url TEXT,
      working_days TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
      start_time TEXT DEFAULT '09:00',
      end_time TEXT DEFAULT '20:00',
      break_start TEXT DEFAULT '13:00',
      break_end TEXT DEFAULT '14:00',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL, -- In Rupees
      duration_minutes INTEGER NOT NULL,
      image_url TEXT,
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_services (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      UNIQUE(staff_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      birthday TEXT,
      notes TEXT,
      total_visits INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0, -- In Rupees
      loyalty_points INTEGER DEFAULT 0,
      lifetime_points_earned INTEGER DEFAULT 0,
      lifetime_points_redeemed INTEGER DEFAULT 0,
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_time_off (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      booking_reference TEXT NOT NULL UNIQUE,
      salon_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      appointment_date TEXT NOT NULL, -- YYYY-MM-DD
      start_time TEXT NOT NULL, -- HH:MM
      end_time TEXT NOT NULL,   -- HH:MM
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'
      payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'refunded'
      total_amount INTEGER NOT NULL, -- In Rupees
      discount_amount INTEGER DEFAULT 0,
      points_redeemed INTEGER DEFAULT 0,
      points_discount INTEGER DEFAULT 0,
      final_amount INTEGER NOT NULL,
      notes TEXT,
      source TEXT DEFAULT 'online', -- 'online', 'walk_in', 'phone'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_reference TEXT NOT NULL UNIQUE,
      appointment_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL, -- 'cash', 'upi', 'card', 'bank_transfer'
      transaction_reference TEXT,
      notes TEXT,
      recorded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      appointment_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      service_name TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER DEFAULT 0,
      points_redeemed INTEGER DEFAULT 0,
      points_discount INTEGER DEFAULT 0,
      tax_amount INTEGER DEFAULT 0,
      total_paid INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      appointment_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      points_reversed INTEGER DEFAULT 0,
      recorded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      appointment_id TEXT,
      payment_id TEXT,
      transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'adjusted', 'reversed', 'expired'
      points INTEGER NOT NULL,
      previous_balance INTEGER NOT NULL,
      new_balance INTEGER NOT NULL,
      reason TEXT NOT NULL,
      performed_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      points_required INTEGER NOT NULL,
      discount_inr INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'upi',
      vendor TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      email_enabled INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 1,
      whatsapp_enabled INTEGER DEFAULT 1,
      email_provider TEXT DEFAULT 'smtp', -- 'smtp', 'resend', 'sendgrid'
      smtp_host TEXT DEFAULT '',
      smtp_port INTEGER DEFAULT 587,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      from_email TEXT DEFAULT 'bookings@auraluxe.in',
      resend_api_key TEXT DEFAULT '',
      sms_provider TEXT DEFAULT 'twilio', -- 'twilio', 'msg91'
      twilio_account_sid TEXT DEFAULT '',
      twilio_auth_token TEXT DEFAULT '',
      twilio_phone_number TEXT DEFAULT '',
      whatsapp_provider TEXT DEFAULT 'whatsapp_business',
      whatsapp_api_token TEXT DEFAULT '',
      whatsapp_phone_number_id TEXT DEFAULT '',
      notify_on_booking INTEGER DEFAULT 1,
      notify_on_cancellation INTEGER DEFAULT 1,
      notify_on_reminder INTEGER DEFAULT 1,
      notify_on_loyalty INTEGER DEFAULT 1,
      template_booking_subject TEXT DEFAULT 'Your Appointment at Aura Luxe is Confirmed! (Ref: {booking_reference})',
      template_booking_body TEXT DEFAULT 'Hello {customer_name},\n\nYour appointment for {service_name} with {staff_name} is confirmed on {date} at {time}.\nBooking Reference: {booking_reference}.\n\nLocation: {salon_address}\nPhone: {salon_phone}\n\nWe look forward to pampering you!\nAura Luxe Salon & Spa',
      template_reminder_body TEXT DEFAULT 'Reminder: Hello {customer_name}, your appointment for {service_name} at Aura Luxe is tomorrow, {date} at {time}. See you soon!',
      template_cancellation_body TEXT DEFAULT 'Hello {customer_name}, your appointment (Ref: {booking_reference}) on {date} at {time} has been cancelled as requested. Hope to see you again soon!',
      template_loyalty_body TEXT DEFAULT 'Hello {customer_name}, you just earned {points} loyalty points at Aura Luxe! Your updated balance is {new_balance} points (Value: ₹{rupee_value}). Redeem on your next visit!'
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      recipient_name TEXT,
      channel TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
      event_type TEXT NOT NULL, -- 'confirmation', 'reminder', 'cancellation', 'loyalty'
      subject TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL, -- 'delivered', 'sent', 'simulated_log', 'failed'
      status_detail TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_role TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salon_users (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'owner', 'manager', 'receptionist', 'stylist'
      staff_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData(db);
}

function seedInitialData(db: Database) {
  // Check if already seeded
  const check = db.exec("SELECT COUNT(*) FROM salons");
  if (check.length > 0 && check[0].values[0][0] && Number(check[0].values[0][0]) > 0) {
    return;
  }

  const salonId = 'salon-aura-luxe-01';

  db.run(`
    INSERT INTO salons (
      id, name, slug, tagline, phone, email, address, city, state, pincode,
      opening_time, closing_time, slot_interval_minutes, currency, currency_symbol,
      points_per_100_inr, inr_value_per_point, min_redeem_points, cancellation_notice_hours
    ) VALUES (
      '${salonId}',
      'Aura Luxe Salon & Spa',
      'aura-luxe',
      'Exquisite Beauty, Effortless Elegance & Wellness',
      '+91 98765 43210',
      'concierge@auraluxe.in',
      'Plot 42, Galleria Boulevard, Indiranagar',
      'Bengaluru',
      'Karnataka',
      '560038',
      '09:00',
      '20:00',
      30,
      'INR',
      '₹',
      1,
      0.50,
      50,
      2
    );
  `);

  // Notification settings seed
  db.run(`
    INSERT INTO notification_settings (
      id, salon_id, email_enabled, sms_enabled, whatsapp_enabled,
      email_provider, sms_provider, whatsapp_provider,
      from_email
    ) VALUES (
      'notif-setting-01',
      '${salonId}',
      1, 1, 1,
      'smtp', 'twilio', 'whatsapp_business',
      'bookings@aonehnb.com'
    );
  `);

  // Seed authentic A-One Hair & Beauty Studio staff
  const staffMembers = [
    {
      id: 'staff-01',
      name: 'Ramesh Solanki',
      role: 'owner',
      phone: '072030 91115',
      email: 'ramesh@aonehnb.com',
      bio: 'Studio Founder & Master Stylist with over 15 years experience in precision haircutting, restyling, and men’s & women’s grooming.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'staff-02',
      name: 'Sneha Patel',
      role: 'manager',
      phone: '072030 91115',
      email: 'sneha@aonehnb.com',
      bio: 'Senior Hair Colorist & Balayage Specialist. Certified in advanced ammonia-free coloring, permanent blow dry, and keratin smoothing infusions.',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'staff-03',
      name: 'Kavita Parmar',
      role: 'stylist',
      phone: '072030 91115',
      email: 'kavita@aonehnb.com',
      bio: 'Certified Skin Aesthetician & Bridal Makeover Expert with extensive training in deep cleanup, bridal glow packages, and herbal hair spa therapies.',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'staff-04',
      name: 'Rahul Varma',
      role: 'receptionist',
      phone: '072030 91115',
      email: 'frontdesk@aonehnb.com',
      bio: 'Guest Relations & Front Desk Coordinator managing seamless client consultations, appointments, and billing hospitality at Subhanpura.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'staff-05',
      name: 'Pooja Dave',
      role: 'stylist',
      phone: '072030 91115',
      email: 'pooja@aonehnb.com',
      bio: 'Nail Artist & Spa Specialist skilled in herbal pedicure, manicure, relaxing hair massage, and party makeup.',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    }
  ];

  for (const s of staffMembers) {
    db.run(`
      INSERT INTO staff (id, salon_id, name, email, phone, role, bio, avatar_url, working_days, start_time, end_time, break_start, break_end, is_active)
      VALUES ('${s.id}', '${salonId}', '${s.name}', '${s.email}', '${s.phone}', '${s.role}', '${s.bio.replace(/'/g, "''")}', '${s.avatar_url}', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]', '09:00', '22:00', '13:00', '14:00', 1);
    `);
  }

  // Seed Admin & Team Users
  db.run(`
    INSERT INTO salon_users (id, salon_id, username, password_hash, full_name, role, staff_id) VALUES
    ('user-admin-01', '${salonId}', 'admin', 'admin123', 'Ramesh Solanki (Studio Admin)', 'owner', 'staff-01'),
    ('user-mgr-01', '${salonId}', 'manager', 'mgr123', 'Sneha Patel (Manager)', 'manager', 'staff-02'),
    ('user-rec-01', '${salonId}', 'frontdesk', 'desk123', 'Rahul Varma (Front Desk)', 'receptionist', 'staff-04'),
    ('user-stylist-01', '${salonId}', 'stylist', 'stylist123', 'Kavita Parmar (Stylist)', 'stylist', 'staff-03');
  `);

  // Seed Loyalty Rewards for A-One Studio
  db.run(`
    INSERT INTO loyalty_rewards (id, salon_id, title, description, points_required, discount_inr) VALUES
    ('rew-01', '${salonId}', '₹100 Off Any Haircut', 'Redeem 200 loyalty points for ₹100 instant reduction on any haircut.', 200, 100),
    ('rew-02', '${salonId}', '₹250 Off Hair Colour or Spa', 'Redeem 500 loyalty points for ₹250 discount on hair colouring or hair spa.', 500, 250),
    ('rew-03', '${salonId}', '₹500 Off Keratin / Bridal', 'Redeem 1,000 loyalty points for ₹500 discount on premium services.', 1000, 500),
    ('rew-04', '${salonId}', 'Complimentary Hair Wash & Conditioning', 'Redeem 500 loyalty points for a refreshing shampoo and conditioning session.', 500, 250);
  `);
}

function migrateToAOneSalon(db: Database) {
  // Ensure schema columns exist
  try {
    db.run("ALTER TABLE salons ADD COLUMN website TEXT DEFAULT 'aonehnb.com';");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE salons ADD COLUMN google_rating REAL DEFAULT 4.0;");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE salons ADD COLUMN google_reviews INTEGER DEFAULT 1174;");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE salons ADD COLUMN custom_upi_id TEXT DEFAULT 'aonehair@upi';");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE salons ADD COLUMN custom_upi_name TEXT DEFAULT 'A-One Hair & Beauty Studio';");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE salons ADD COLUMN custom_upi_qr_url TEXT DEFAULT '';");
  } catch (_e) {}

  // Customer Visits & Visit Services tables
  db.run(`
    CREATE TABLE IF NOT EXISTS customer_visits (
      id TEXT PRIMARY KEY,
      visit_code TEXT NOT NULL UNIQUE,
      salon_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      appointment_id TEXT,
      staff_id TEXT,
      staff_name TEXT,
      services_summary TEXT NOT NULL,
      amount_charged REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL, -- 'cash', 'upi', 'custom_upi_qr'
      payment_status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'complimentary', 'unpaid', 'partially_paid'
      transaction_reference TEXT,
      notes TEXT,
      receptionist_id TEXT NOT NULL DEFAULT 'receptionist-subhanpura',
      receptionist_name TEXT NOT NULL DEFAULT 'Front Desk Receptionist',
      visit_date TEXT NOT NULL, -- YYYY-MM-DD
      visit_time TEXT NOT NULL, -- HH:MM:SS
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_visit_services (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      service_id TEXT,
      service_name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0
    );

    -- Website Content Management Tables
    CREATE TABLE IF NOT EXISTS website_config (
      id TEXT PRIMARY KEY DEFAULT 'main',
      salon_id TEXT NOT NULL,
      status TEXT DEFAULT 'published', -- 'published', 'draft'
      business_info TEXT,
      hero_section TEXT,
      about_section TEXT,
      section_order TEXT,
      section_visibility TEXT,
      contact_section TEXT,
      booking_settings TEXT,
      policies_faq_info TEXT,
      seo_settings TEXT,
      footer_settings TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_announcements (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_url TEXT,
      link_text TEXT,
      badge_text TEXT,
      display_position TEXT DEFAULT 'top_banner', -- 'top_banner', 'hero_bar', 'popup'
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_offers (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      original_price REAL,
      discounted_price REAL,
      discount_percentage INTEGER,
      start_date TEXT,
      end_date TEXT,
      terms_conditions TEXT,
      action_type TEXT DEFAULT 'book', -- 'book', 'whatsapp', 'call'
      service_id TEXT,
      is_featured INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_gallery (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      media_type TEXT DEFAULT 'image', -- 'image', 'video'
      media_url TEXT NOT NULL,
      category TEXT DEFAULT 'Hair Styling',
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_testimonials (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      avatar_url TEXT,
      rating INTEGER DEFAULT 5,
      review_text TEXT NOT NULL,
      source TEXT DEFAULT 'Google Review',
      service_taken TEXT,
      review_date TEXT,
      has_permission INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_faqs (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_custom_sections (
      id TEXT PRIMARY KEY,
      salon_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT NOT NULL,
      layout_type TEXT DEFAULT 'card_grid', -- 'split_left_image', 'split_right_image', 'banner', 'card_grid'
      image_url TEXT,
      button_text TEXT,
      button_link TEXT,
      badge_text TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Service & Staff optional column migrations
  try { db.run("ALTER TABLE services ADD COLUMN discounted_price REAL;"); } catch (_e) {}
  try { db.run("ALTER TABLE services ADD COLUMN display_order INTEGER DEFAULT 0;"); } catch (_e) {}
  try { db.run("ALTER TABLE services ADD COLUMN show_price INTEGER DEFAULT 1;"); } catch (_e) {}
  try { db.run("ALTER TABLE staff ADD COLUMN designation TEXT DEFAULT 'Senior Stylist';"); } catch (_e) {}
  try { db.run("ALTER TABLE staff ADD COLUMN specialties TEXT DEFAULT 'Hair Styling, Color, Hair Care';"); } catch (_e) {}
  try { db.run("ALTER TABLE staff ADD COLUMN display_order INTEGER DEFAULT 0;"); } catch (_e) {}

  db.run(`
    UPDATE salons SET
      name = 'A-One Hair & Beauty Studio - Subhanpura',
      slug = 'aone-hair-beauty-subhanpura',
      tagline = 'Hair Salon & Beauty Studio',
      phone = '072030 91115',
      email = 'contact@aonehnb.com',
      website = 'aonehnb.com',
      address = 'Platinum Complex, G-1, Subhanpura',
      city = 'Vadodara',
      state = 'Gujarat',
      pincode = '390023',
      closing_time = '22:00',
      google_rating = 4.0,
      google_reviews = 1174,
      updated_at = CURRENT_TIMESTAMP
    WHERE 1=1;
  `);

  // Update notification settings
  db.run(`
    UPDATE notification_settings SET
      from_email = 'bookings@aonehnb.com',
      template_booking_subject = 'Your Appointment at A-One Hair & Beauty Studio is Confirmed! (Ref: {booking_reference})',
      template_booking_body = 'Hello {customer_name},\n\nYour appointment for {service_name} with {staff_name} is confirmed on {date} at {time}.\nBooking Reference: {booking_reference}.\n\nLocation: Platinum Complex, G-1, Subhanpura, Vadodara, Gujarat 390023\nPhone: 072030 91115\n\nThank you for choosing A-One Hair & Beauty Studio - Subhanpura!',
      template_reminder_body = 'Reminder: Hello {customer_name}, your appointment for {service_name} at A-One Hair & Beauty Studio is tomorrow, {date} at {time}. Location: Platinum Complex, G-1, Subhanpura, Vadodara. See you soon!',
      template_cancellation_body = 'Hello {customer_name}, your appointment (Ref: {booking_reference}) on {date} at {time} at A-One Hair & Beauty Studio has been cancelled as requested.',
      template_loyalty_body = 'Hello {customer_name}, you just earned {points} loyalty points at A-One Hair & Beauty Studio! Your updated balance is {new_balance} points (Worth ₹{rupee_value}). Redeem on your next visit!'
    WHERE 1=1;
  `);

  // Purge all legacy mock operational data, mock customers, and template services
  try {
    db.run("DELETE FROM appointments WHERE id LIKE 'apt-%';");
    db.run("DELETE FROM payments WHERE id LIKE 'pay-%';");
    db.run("DELETE FROM receipts WHERE id LIKE 'rec-%';");
    db.run("DELETE FROM expenses WHERE id LIKE 'exp-%';");
    db.run("DELETE FROM customer_visits WHERE id LIKE 'visit-demo-%' OR customer_id LIKE 'cust-%';");
    db.run("DELETE FROM customer_visit_services WHERE visit_id NOT IN (SELECT id FROM customer_visits);");
    db.run("DELETE FROM loyalty_transactions WHERE id LIKE 'lt-init-%';");
    db.run("DELETE FROM notification_logs WHERE id LIKE 'nl-%';");
    db.run("DELETE FROM customers WHERE id LIKE 'cust-%' OR phone LIKE '+91 98111 22334' OR phone LIKE '+91 98222 33445' OR phone LIKE '+91 98333 44556' OR phone LIKE '+91 98444 55667';");
    db.run("DELETE FROM staff_services WHERE service_id LIKE 'srv-%';");
    db.run("DELETE FROM services WHERE id LIKE 'srv-%';");
  } catch (err) {
    console.warn('Purge warning:', err);
  }

  const salonRow = db.exec("SELECT id FROM salons LIMIT 1");
  const salonId = (salonRow.length > 0 && salonRow[0].values[0][0]) ? String(salonRow[0].values[0][0]) : 'salon-aone-subhanpura-01';

  // Upsert authentic A-One salon staff
  const authenticStaff = [
    {
      id: 'staff-01',
      name: 'Ramesh Solanki',
      role: 'owner',
      phone: '072030 91115',
      email: 'ramesh@aonehnb.com',
      bio: 'Studio Founder & Master Stylist with over 15 years experience in precision haircutting, restyling, and men’s & women’s grooming.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      designation: 'Studio Director & Master Stylist',
      specialties: 'Precision Cuts, Hair Restructuring, Styling',
      display_order: 1
    },
    {
      id: 'staff-02',
      name: 'Sneha Patel',
      role: 'manager',
      phone: '072030 91115',
      email: 'sneha@aonehnb.com',
      bio: 'Senior Hair Colorist & Balayage Specialist. Certified in advanced ammonia-free coloring, permanent blow dry, and keratin smoothing infusions.',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      designation: 'Senior Colorist & Salon Manager',
      specialties: 'Global Color, Balayage, Highlights, Keratin',
      display_order: 2
    },
    {
      id: 'staff-03',
      name: 'Kavita Parmar',
      role: 'stylist',
      phone: '072030 91115',
      email: 'kavita@aonehnb.com',
      bio: 'Certified Skin Aesthetician & Bridal Makeover Expert with extensive training in deep cleanup, bridal glow packages, and herbal hair spa therapies.',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      designation: 'Skin Aesthetician & Bridal Artist',
      specialties: 'Facials, Clean Up, Bridal Makeup, Waxing',
      display_order: 3
    },
    {
      id: 'staff-04',
      name: 'Rahul Varma',
      role: 'receptionist',
      phone: '072030 91115',
      email: 'frontdesk@aonehnb.com',
      bio: 'Guest Relations & Front Desk Coordinator managing seamless client consultations, appointments, and billing hospitality at Subhanpura.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      designation: 'Front Desk Hospitality Coordinator',
      specialties: 'Appointments, Client Hospitality, Customer Relations',
      display_order: 4
    },
    {
      id: 'staff-05',
      name: 'Pooja Dave',
      role: 'stylist',
      phone: '072030 91115',
      email: 'pooja@aonehnb.com',
      bio: 'Nail Artist & Spa Specialist skilled in herbal pedicure, manicure, relaxing hair massage, and party makeup.',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      designation: 'Spa & Nail Specialist',
      specialties: 'Manicure, Pedicure, Hair Spa, Event Makeup',
      display_order: 5
    }
  ];

  for (const st of authenticStaff) {
    const stExists = db.exec(`SELECT id FROM staff WHERE id = '${st.id}'`);
    if (stExists.length > 0 && stExists[0].values.length > 0) {
      db.run(`
        UPDATE staff SET
          name = '${st.name}',
          email = '${st.email}',
          phone = '${st.phone}',
          role = '${st.role}',
          bio = '${st.bio.replace(/'/g, "''")}',
          avatar_url = '${st.avatar_url}',
          designation = '${st.designation}',
          specialties = '${st.specialties}',
          display_order = ${st.display_order},
          is_active = 1
        WHERE id = '${st.id}';
      `);
    } else {
      db.run(`
        INSERT INTO staff (id, salon_id, name, email, phone, role, bio, avatar_url, working_days, start_time, end_time, break_start, break_end, is_active, designation, specialties, display_order)
        VALUES ('${st.id}', '${salonId}', '${st.name}', '${st.email}', '${st.phone}', '${st.role}', '${st.bio.replace(/'/g, "''")}', '${st.avatar_url}', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]', '09:00', '22:00', '13:00', '14:00', 1, '${st.designation}', '${st.specialties}', ${st.display_order});
      `);
    }
  }

  // Update salon users
  db.run("UPDATE salon_users SET full_name = 'Ramesh Solanki (Studio Admin)', role = 'owner', staff_id = 'staff-01' WHERE username = 'admin';");
  db.run("UPDATE salon_users SET full_name = 'Sneha Patel (Manager)', role = 'manager', staff_id = 'staff-02' WHERE username = 'manager';");
  db.run("UPDATE salon_users SET full_name = 'Rahul Varma (Front Desk)', role = 'receptionist', staff_id = 'staff-04' WHERE username = 'frontdesk';");
  db.run("UPDATE salon_users SET full_name = 'Kavita Parmar (Stylist)', role = 'stylist', staff_id = 'staff-03' WHERE username = 'priya' OR username = 'stylist';");

  // Define the exact services specified by the user
  const aOneServices = [
    // Haircut & Styling
    {
      id: 'aone-srv-01',
      category: 'Haircut & Styling',
      name: 'Haircut',
      description: 'Precision haircut customized to your face profile and styling preference.',
      price: 350,
      duration_minutes: 30,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-02',
      category: 'Haircut & Styling',
      name: 'Hair Styling',
      description: 'Blow-dry styling, soft curls, waves, or sleek straightening for every day or special events.',
      price: 450,
      duration_minutes: 30,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-03',
      category: 'Haircut & Styling',
      name: 'Shampoo & Conditioning',
      description: 'Cleansing hair wash with scalp massage and revitalizing deep conditioning.',
      price: 250,
      duration_minutes: 20,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-04',
      category: 'Haircut & Styling',
      name: 'Permanent Blow Dry',
      description: 'Long-lasting smoothening blow-dry finish for frizz-free, manageable, and silky hair.',
      price: 2500,
      duration_minutes: 90,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80'
    },

    // Hair Colouring
    {
      id: 'aone-srv-05',
      category: 'Hair Colouring',
      name: 'Hair Colouring',
      description: 'Expert hair coloring, root touch-up, and grey coverage with rich glossy shades.',
      price: 1500,
      duration_minutes: 60,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-06',
      category: 'Hair Colouring',
      name: 'Global Color',
      description: 'Uniform full-head color application from roots to ends for deep, vibrant, and lustrous tone.',
      price: 3200,
      duration_minutes: 90,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-07',
      category: 'Hair Colouring',
      name: 'Global Highlight',
      description: 'Dimensional foil highlighting across the entire hair to add brightness and texture.',
      price: 3800,
      duration_minutes: 105,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-08',
      category: 'Hair Colouring',
      name: 'Ombre Hair Color',
      description: 'Seamless gradient transition from darker roots to lighter, radiant ends.',
      price: 3500,
      duration_minutes: 120,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-09',
      category: 'Hair Colouring',
      name: 'Balayage Hair Color',
      description: 'Hand-painted color contouring that mimics natural sun-kissed lightening with low maintenance.',
      price: 4200,
      duration_minutes: 120,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80'
    },

    // Hair Treatments & Spa
    {
      id: 'aone-srv-10',
      category: 'Hair Treatments & Spa',
      name: 'Keratin Treatments',
      description: 'Keratin protein treatment to rebuild broken hair bonds, eliminate frizz, and provide silky smoothness.',
      price: 4500,
      duration_minutes: 120,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-11',
      category: 'Hair Treatments & Spa',
      name: 'Hair Smoothing',
      description: 'Smoothening procedure for glossy, straight, and easy-to-manage tresses.',
      price: 4000,
      duration_minutes: 150,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-12',
      category: 'Hair Treatments & Spa',
      name: 'Hair Spa',
      description: 'Intense nourishing cream bath, soothing head massage, and steam therapy to combat dryness.',
      price: 900,
      duration_minutes: 45,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-13',
      category: 'Hair Treatments & Spa',
      name: 'Hair Treatments',
      description: 'Specialized therapeutic solutions for dandruff, split ends, or chemically compromised hair.',
      price: 1200,
      duration_minutes: 50,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&auto=format&fit=crop&q=80'
    },

    // Men's Grooming
    {
      id: 'aone-srv-14',
      category: "Men's Grooming",
      name: 'Beard Trim',
      description: 'Precision beard sculpting, moustache shaping, and razor sharp boundary lines.',
      price: 150,
      duration_minutes: 20,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-15',
      category: "Men's Grooming",
      name: 'Shaving',
      description: 'Hot towel prep, foam lathering, clean razor shave, and refreshing aftershave splash.',
      price: 120,
      duration_minutes: 20,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'
    },

    // Facial & Skin Care
    {
      id: 'aone-srv-16',
      category: 'Facial & Skin Care',
      name: 'Facial Treatments',
      description: 'Multi-step skin rejuvenation treatment customized for glow, deep hydration, and anti-pollution defense.',
      price: 1500,
      duration_minutes: 60,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-17',
      category: 'Facial & Skin Care',
      name: 'Clean Up Facial',
      description: 'Quick-acting skin cleanup: exfoliation scrub, blackhead/whitehead extraction, and soothing mask pack.',
      price: 750,
      duration_minutes: 40,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1512290900672-1f5be63fa7b1?w=600&auto=format&fit=crop&q=80'
    },

    // Body Care & Spa
    {
      id: 'aone-srv-18',
      category: 'Body Care & Spa',
      name: 'Body Waxing',
      description: 'Hygienic, gentle body waxing with premium skin-friendly wax for silky smooth hair removal.',
      price: 1200,
      duration_minutes: 45,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-19',
      category: 'Body Care & Spa',
      name: 'Massage',
      description: 'Relaxing therapeutic head, neck, and shoulder pressure point massage to melt fatigue away.',
      price: 1000,
      duration_minutes: 45,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-20',
      category: 'Body Care & Spa',
      name: 'Spa Services',
      description: 'Holistic wellness body polish, scrub, and relaxation spa therapies.',
      price: 2200,
      duration_minutes: 60,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80'
    },

    // Bridal & Special Occasion
    {
      id: 'aone-srv-21',
      category: 'Bridal & Special Occasion',
      name: 'Bridal Services',
      description: 'Comprehensive pre-bridal skincare, body polishing, and beauty preparation package for brides.',
      price: 7500,
      duration_minutes: 180,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-22',
      category: 'Bridal & Special Occasion',
      name: 'Bridal Makeup',
      description: 'High-definition bridal makeup with professional contouring, eye glam, dupatta/saree draping, and hair artistry.',
      price: 9500,
      duration_minutes: 150,
      is_featured: 1,
      image_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-23',
      category: 'Bridal & Special Occasion',
      name: 'Makeup & Makeover',
      description: 'Celebration party makeup, festive glam, and stylish hair transformation for weddings and functions.',
      price: 2800,
      duration_minutes: 60,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'aone-srv-24',
      category: 'Bridal & Special Occasion',
      name: 'Beauty & Hairstyling',
      description: 'Intricate hair styling, bun creation, braids, and beauty touch-ups for festive events.',
      price: 2200,
      duration_minutes: 60,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80'
    },

    // Nails, Hands & Feet
    {
      id: 'aone-srv-25',
      category: 'Hands & Feet Care',
      name: 'Manicure & Pedicure',
      description: 'Herbal hand and foot bath, exfoliation, cuticle care, relaxing massage, and nail buffing.',
      price: 1100,
      duration_minutes: 60,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&auto=format&fit=crop&q=80'
    },

    // Special / Home Services
    {
      id: 'aone-srv-26',
      category: 'Special Services',
      name: 'Home Services',
      description: 'Convenient beauty and grooming at your home. Note: Subject to confirmation by salon owner.',
      price: 1500,
      duration_minutes: 60,
      is_featured: 0,
      image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80'
    }
  ];

  // Insert or update A-One services
  for (const s of aOneServices) {
    const exists = db.exec(`SELECT id FROM services WHERE id = '${s.id}' OR name = '${s.name.replace(/'/g, "''")}'`);
    if (exists.length > 0 && exists[0].values.length > 0) {
      db.run(`
        UPDATE services SET
          category = '${s.category.replace(/'/g, "''")}',
          name = '${s.name.replace(/'/g, "''")}',
          description = '${s.description.replace(/'/g, "''")}',
          is_active = 1,
          image_url = '${s.image_url}',
          is_featured = ${s.is_featured}
        WHERE id = '${exists[0].values[0][0]}';
      `);
    } else {
      db.run(`
        INSERT INTO services (id, salon_id, category, name, description, price, duration_minutes, is_featured, is_active, image_url)
        VALUES ('${s.id}', '${salonId}', '${s.category.replace(/'/g, "''")}', '${s.name.replace(/'/g, "''")}', '${s.description.replace(/'/g, "''")}', ${s.price}, ${s.duration_minutes}, ${s.is_featured}, 1, '${s.image_url}');
      `);
    }
  }

  // Link staff to services
  const staffRows = db.exec("SELECT id FROM staff WHERE is_active = 1");
  if (staffRows.length > 0 && staffRows[0].values.length > 0) {
    const staffIds = staffRows[0].values.map(v => String(v[0]));
    const serviceRows = db.exec("SELECT id FROM services WHERE is_active = 1");
    if (serviceRows.length > 0 && serviceRows[0].values.length > 0) {
      const serviceIds = serviceRows[0].values.map(v => String(v[0]));
      for (const stId of staffIds) {
        for (const srvId of serviceIds) {
          try {
            db.run(`INSERT OR IGNORE INTO staff_services (id, staff_id, service_id) VALUES ('ss-${stId}-${srvId}', '${stId}', '${srvId}');`);
          } catch (_e) {}
        }
      }
    }
  }

  // Seed initial website config and content
  seedWebsiteContent(db, salonId);
}

function seedWebsiteContent(db: Database, salonId: string) {
  // Check if website_config already exists
  const existingConfig = db.exec("SELECT id FROM website_config WHERE id = 'main'");
  if (existingConfig.length === 0 || existingConfig[0].values.length === 0) {
    const businessInfo = JSON.stringify({
      salon_name: 'A-One Hair & Beauty Studio - Subhanpura',
      logo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&auto=format&fit=crop&q=80',
      business_description: 'Vadodara’s premier neighborhood hair salon and beauty studio at Platinum Complex, Subhanpura. Specializing in precision haircutting, global hair color, balayage, keratin smoothing, bridal makeup, facials, and spa grooming.',
      phone: '072030 91115',
      whatsapp: '+917203091115',
      email: 'contact@aonehnb.com',
      address: 'Platinum Complex, G-1, Subhanpura, Vadodara, Gujarat 390023, India',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=A-One+Hair+%26+Beauty+Studio+Platinum+Complex+G-1+Subhanpura+Vadodara+Gujarat+390023',
      google_business_link: 'https://maps.app.goo.gl/AOneSubhanpura',
      website_url: 'https://aonehnb.com',
      opening_hours: [
        { day: 'Monday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Tuesday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Wednesday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Thursday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Friday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Saturday', open: '09:00', close: '22:00', is_closed: false },
        { day: 'Sunday', open: '09:00', close: '22:00', is_closed: false }
      ],
      holiday_notice: 'Open all 7 days of the week until 10:00 PM for late-evening clients.',
      is_temporarily_closed: false,
      social_links: {
        instagram: 'https://instagram.com/aonehairstudio',
        facebook: 'https://facebook.com/aonehairstudio',
        youtube: 'https://youtube.com',
        twitter: ''
      }
    });

    const heroSection = JSON.stringify({
      enabled: true,
      heading: 'A-One Hair & Beauty Studio',
      subtitle: 'Precision Hair Styling, Creative Coloring & Aesthetic Care in Subhanpura',
      description: 'Welcome to your trusted neighborhood destination for precision haircuts, hair colouring, global highlights, balayage, keratin smoothing, bridal makeup, facials, and spa grooming in Subhanpura, Vadodara.',
      hero_image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
      background_image: '',
      badge_text: 'Hair Salon & Beauty Studio · Subhanpura, Vadodara',
      primary_btn_text: 'Book Appointment',
      primary_btn_action: 'booking',
      secondary_btn_text: 'Explore Services Menu',
      secondary_btn_action: 'services'
    });

    const aboutSection = JSON.stringify({
      enabled: true,
      title: 'Crafting Personalized Beauty in Vadodara',
      subtitle: 'About A-One Hair & Beauty Studio - Subhanpura',
      salon_history: 'Conveniently situated at Platinum Complex in Subhanpura, A-One Hair & Beauty Studio brings together experienced hair stylists, skin aestheticians, and beauty professionals. Over the years, we have served thousands of satisfied clients across Vadodara.',
      mission_vision: 'Our mission is to bring high-touch, tailored beauty and grooming services with uncompromised hygiene, certified stylists, and transparent pricing in a warm neighborhood setting.',
      experience_specialties: 'With 26 specialized hair, beauty, bridal, and spa treatments, we blend classical barbering technique with contemporary hair aesthetics and skin wellness.',
      image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
      video_url: '',
      stats: [
        { label: 'Google Rating', value: '4.0 / 5.0' },
        { label: 'Google Customer Reviews', value: '1,174+' },
        { label: 'Specialized Treatments', value: '26 Services' },
        { label: 'Evening Closing Time', value: '10:00 PM Daily' }
      ]
    });

    const sectionOrder = JSON.stringify([
      'announcements', 'hero', 'offers', 'services', 'about', 'staff', 'gallery', 'testimonials', 'faqs', 'custom_sections', 'contact'
    ]);

    const sectionVisibility = JSON.stringify({
      announcements: true,
      hero: true,
      offers: true,
      services: true,
      about: true,
      staff: true,
      gallery: true,
      testimonials: true,
      faqs: true,
      custom_sections: true,
      contact: true
    });

    const contactSection = JSON.stringify({
      enabled: true,
      contact_heading: 'Contact & Location',
      contact_subheading: 'Reach out to A-One Hair & Beauty Studio in Subhanpura for appointments, bridal inquiries, and hair care questions.',
      map_embed_url: '',
      contact_form_enabled: true,
      whatsapp_button_enabled: true,
      call_button_enabled: true,
      email_button_enabled: true,
      parking_info: 'Ample complex parking available in front of Platinum Complex Ground Floor.',
      accessibility_info: 'Ground floor G-1 location with easy step-free entry for seniors and wheelchairs.'
    });

    const bookingSettings = JSON.stringify({
      online_booking_enabled: true,
      min_notice_hours: 1,
      max_advance_days: 30,
      booking_hours_start: '09:00',
      booking_hours_end: '21:30',
      slot_interval_minutes: 30,
      cancellation_policy_text: 'Appointments can be cancelled or rescheduled up to 2 hours in advance without penalty.',
      confirmation_message: 'Your appointment at A-One Hair & Beauty Studio - Subhanpura has been confirmed! We look forward to welcoming you.',
      enquiry_phone: '072030 91115',
      enquiry_email: 'contact@aonehnb.com'
    });

    const policiesFaqInfo = JSON.stringify({
      cancellation_policy: 'Free cancellation up to 2 hours before the scheduled appointment. For no-shows, please inform us as soon as possible so we can release the chair.',
      refund_policy: 'Services are delivered with professional care. In the rare event of service dissatisfaction, please contact our salon manager within 48 hours for a complimentary consultation and adjustment.',
      privacy_policy: 'We respect your personal privacy. Mobile numbers and contact details collected during booking or loyalty membership are used solely for appointment reminders, invoices, and studio updates.',
      terms_conditions: 'All prices are in Indian Rupees (INR) and inclusive of applicable standard taxes. Promotional offers cannot be combined with existing discount vouchers unless specified.',
      loyalty_terms: 'Earn 1 point for every ₹100 spent. Each point is worth ₹0.50 upon redemption at checkout against valid services.'
    });

    const seoSettings = JSON.stringify({
      meta_title: 'A-One Hair & Beauty Studio | Salon in Subhanpura, Vadodara',
      meta_description: 'Book haircuts, hair coloring, balayage, keratin treatments, bridal makeup and skin facials at A-One Hair & Beauty Studio, Platinum Complex, Subhanpura, Vadodara. Open until 10 PM.',
      keywords: 'hair salon subhanpura, salon vadodara, a-one hair studio, hair cut subhanpura, balayage vadodara, bridal makeup subhanpura',
      og_title: 'A-One Hair & Beauty Studio - Subhanpura, Vadodara',
      og_description: 'Premier hair salon and beauty studio in Subhanpura, Vadodara. Open till 10 PM. Rated 4.0/5 with 1,170+ reviews.',
      og_image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
      favicon_url: '/vite.svg'
    });

    const footerSettings = JSON.stringify({
      description: 'A-One Hair & Beauty Studio is Subhanpura’s premier salon for precision haircuts, advanced color techniques, rejuvenating facials, and wedding glam.',
      copyright_text: '© 2026 A-One Hair & Beauty Studio - Subhanpura. All rights reserved.',
      show_social_links: true,
      show_opening_hours: true,
      show_address: true
    });

    const cleanSql = (str: string) => str.replace(/'/g, "''");

    db.run(`
      INSERT INTO website_config (
        id, salon_id, status, business_info, hero_section, about_section,
        section_order, section_visibility, contact_section, booking_settings,
        policies_faq_info, seo_settings, footer_settings
      ) VALUES (
        'main', '${salonId}', 'published',
        '${cleanSql(businessInfo)}',
        '${cleanSql(heroSection)}',
        '${cleanSql(aboutSection)}',
        '${cleanSql(sectionOrder)}',
        '${cleanSql(sectionVisibility)}',
        '${cleanSql(contactSection)}',
        '${cleanSql(bookingSettings)}',
        '${cleanSql(policiesFaqInfo)}',
        '${cleanSql(seoSettings)}',
        '${cleanSql(footerSettings)}'
      );
    `);
  }

  // Seed announcements if empty
  const existingAnnouncements = db.exec("SELECT COUNT(*) FROM website_announcements");
  if (existingAnnouncements.length === 0 || Number(existingAnnouncements[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_announcements (id, salon_id, title, message, link_url, link_text, badge_text, display_position, is_active, display_order)
      VALUES 
      ('ann-1', '${salonId}', 'Festive Hair & Skin Glow Special', 'Enjoy 15% off Balayage & Keratin treatments this month at Subhanpura!', '#offers', 'View Offers', 'Limited Time', 'top_banner', 1, 1),
      ('ann-2', '${salonId}', 'Late Evening Hours Available', 'We are open every day until 10:00 PM for after-work bookings.', '#contact', 'Call Us', 'Open Daily', 'hero_bar', 1, 2);
    `);
  }

  // Seed offers if empty
  const existingOffers = db.exec("SELECT COUNT(*) FROM website_offers");
  if (existingOffers.length === 0 || Number(existingOffers[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_offers (id, salon_id, title, description, image_url, original_price, discounted_price, discount_percentage, terms_conditions, action_type, is_featured, is_active, display_order)
      VALUES
      ('off-1', '${salonId}', 'Balayage & Hair Spa Package', 'Complete artistic balayage color treatment with post-color deep nourishing conditioning spa.', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80', 4500, 3600, 20, 'Prior booking recommended. Applicable on all hair lengths.', 'book', 1, 1, 1),
      ('off-2', '${salonId}', 'Keratin Smoothing Silk Package', 'Frizz-free silk hair smoothing with intensive keratin restoration and blow-dry finish.', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80', 3500, 2800, 20, 'Valid throughout this season. Includes post-wash consultation.', 'book', 1, 1, 2),
      ('off-3', '${salonId}', 'Bridal Glow Deluxe Makeover', 'HD bridal makeup with pre-bridal cleanup, facial radiance, hair styling, and drape assistance.', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80', 6000, 4800, 20, 'Consultation required. Advance deposit of 30% required.', 'whatsapp', 1, 1, 3);
    `);
  }

  // Seed gallery if empty
  const existingGallery = db.exec("SELECT COUNT(*) FROM website_gallery");
  if (existingGallery.length === 0 || Number(existingGallery[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_gallery (id, salon_id, title, description, media_type, media_url, category, is_featured, is_active, display_order)
      VALUES
      ('gal-1', '${salonId}', 'Modern Precision Bob & Styling', 'Chic layered haircut with textured finish', 'image', 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80', 'Hair Styling', 1, 1, 1),
      ('gal-2', '${salonId}', 'Warm Caramel Balayage Highlights', 'Multi-tonal sun-kissed hair transformation', 'image', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80', 'Hair Colour', 1, 1, 2),
      ('gal-3', '${salonId}', 'A-One Salon Studio Ambience', 'Spacious, clean, hygienic styling floor at Platinum Complex G-1', 'image', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80', 'Ambience', 1, 1, 3),
      ('gal-4', '${salonId}', 'Silky Keratin Treatment Finish', 'Glossy mirror finish and frizz reduction', 'image', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80', 'Hair Styling', 0, 1, 4),
      ('gal-5', '${salonId}', 'Elegant Bridal & Festive Makeup', 'Subtle radiant glow with traditional finesse', 'image', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&auto=format&fit=crop&q=80', 'Bridal & Makeup', 1, 1, 5),
      ('gal-6', '${salonId}', 'Rejuvenating Herbal Facial & Cleanup', 'Deep pore cleansing and natural skin hydration', 'image', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80', 'Skin & Facials', 0, 1, 6);
    `);
  }

  // Seed testimonials if empty
  const existingTestimonials = db.exec("SELECT COUNT(*) FROM website_testimonials");
  if (existingTestimonials.length === 0 || Number(existingTestimonials[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_testimonials (id, salon_id, customer_name, rating, review_text, source, service_taken, review_date, has_permission, is_featured, is_active, display_order)
      VALUES
      ('test-1', '${salonId}', 'Pooja Patel', 5, 'Got a haircut and global hair color done here in Subhanpura. The stylist listened carefully to what I wanted and the results were even better than expected. Super clean salon and open till 10 PM!', 'Google Review', 'Haircut & Global Color', '2026-02-14', 1, 1, 1, 1),
      ('test-2', '${salonId}', 'Rahul Shah', 5, 'Been visiting A-One at Platinum Complex for regular grooming and beard shaping. Very professional team, zero waiting time when you book ahead, and polite reception staff.', 'Google Review', 'Haircut & Beard Styling', '2026-03-01', 1, 1, 1, 2),
      ('test-3', '${salonId}', 'Meera Joshi', 5, 'The Keratin smoothing treatment made my unmanageable frizzy hair so soft and silky. Reasonable pricing compared to other salons in Vadodara.', 'Google Review', 'Keratin Smoothing', '2026-03-18', 1, 1, 1, 3),
      ('test-4', '${salonId}', 'Sneha Dave', 5, 'Booked bridal makeup consultation and facial cleanup. They did a fabulous job! Everyone complimented my look. Highly recommend A-One Hair & Beauty Studio in Subhanpura.', 'Google Review', 'Bridal Makeup & Facial', '2026-04-02', 1, 1, 1, 4);
    `);
  }

  // Seed FAQs if empty
  const existingFaqs = db.exec("SELECT COUNT(*) FROM website_faqs");
  if (existingFaqs.length === 0 || Number(existingFaqs[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_faqs (id, salon_id, category, question, answer, is_active, display_order)
      VALUES
      ('faq-1', '${salonId}', 'Appointments', 'Do I need to book an appointment in advance, or do you take walk-ins?', 'Walk-ins are always warmly welcomed! However, to avoid waiting time during peak evening and weekend hours, we recommend booking online or calling 072030 91115 in advance.', 1, 1),
      ('faq-2', '${salonId}', 'Hours & Location', 'What are your studio opening and closing hours?', 'A-One Hair & Beauty Studio is open 7 days a week from 09:00 AM until 10:00 PM. We are conveniently situated on the Ground Floor G-1, Platinum Complex, Subhanpura, Vadodara.', 1, 2),
      ('faq-3', '${salonId}', 'Hair Care', 'How long does a Keratin or Balayage treatment usually take?', 'A Balayage color treatment typically takes 90 to 120 minutes depending on hair volume and length. A Keratin smoothing session takes approximately 90 minutes.', 1, 3),
      ('faq-4', '${salonId}', 'Payment & Loyalty', 'Which payment methods do you accept?', 'We accept Cash, UPI (Google Pay, PhonePe, Paytm, etc.), and Salon Custom UPI QR at the front desk. Plus, every visit earns points in our A-One Loyalty Club!', 1, 4),
      ('faq-5', '${salonId}', 'Cancellation', 'What is your cancellation and rescheduling policy?', 'You can easily reschedule or cancel your appointment up to 2 hours before the start time at zero charge.', 1, 5);
    `);
  }

  // Seed custom sections if empty
  const existingSections = db.exec("SELECT COUNT(*) FROM website_custom_sections");
  if (existingSections.length === 0 || Number(existingSections[0].values[0][0]) === 0) {
    db.run(`
      INSERT INTO website_custom_sections (id, salon_id, title, subtitle, description, layout_type, image_url, button_text, button_link, badge_text, is_active, display_order)
      VALUES
      ('sec-1', '${salonId}', 'Why Subhanpura Trusts A-One Studio', 'Local Excellence & High Standards', 'From personalized consultations to hygienic sanitized tools, our dedicated team ensures every visit leaves you feeling refreshed, stylish, and confident. Located conveniently on the ground floor of Platinum Complex with hassle-free parking.', 'split_left_image', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80', 'Book Your Visit', 'booking', 'Neighborhood Favorite', 1, 1);
    `);
  }
}


/**
 * Helper to execute SELECT queries and return plain objects
 */
export async function query<T = any>(sqlStr: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sqlStr);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Helper to fetch a single row
 */
export async function getRow<T = any>(sqlStr: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to execute INSERT/UPDATE/DELETE queries
 */
export async function run(sqlStr: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  if (params && params.length > 0) {
    db.run(sqlStr, params);
  } else {
    db.run(sqlStr);
  }
  saveDb();
}
