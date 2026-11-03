import express, { Request, Response } from 'express';
import { query, getRow, run } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import {
  getSettings,
  notifyAppointmentBooking,
  notifyAppointmentCancellation,
  notifyAppointmentReminder,
  notifyLoyaltyPoints,
  logNotification,
  triggerUpcoming24hReminders
} from './notificationService.js';

export const apiRouter = express.Router();

// Helper: Normalize phone numbers (e.g. removes spaces, dashes)
function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  }
  return cleaned;
}

// ----------------------------------------------------
// SALON CONFIG & PUBLIC INFO
// ----------------------------------------------------
apiRouter.get('/salon', async (req: Request, res: Response) => {
  try {
    const salon = await getRow('SELECT * FROM salons LIMIT 1');
    res.json(salon);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/salon', async (req: Request, res: Response) => {
  try {
    const {
      name, tagline, phone, email, address, city, state, pincode,
      opening_time, closing_time, slot_interval_minutes,
      points_per_100_inr, inr_value_per_point, min_redeem_points, cancellation_notice_hours,
      website, google_rating, google_reviews,
      custom_upi_id, custom_upi_name, custom_upi_qr_url
    } = req.body;

    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    if (!salon) return res.status(404).json({ error: 'Salon not found' });

    await run(
      `UPDATE salons SET
        name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        opening_time = COALESCE(?, opening_time),
        closing_time = COALESCE(?, closing_time),
        slot_interval_minutes = COALESCE(?, slot_interval_minutes),
        points_per_100_inr = COALESCE(?, points_per_100_inr),
        inr_value_per_point = COALESCE(?, inr_value_per_point),
        min_redeem_points = COALESCE(?, min_redeem_points),
        cancellation_notice_hours = COALESCE(?, cancellation_notice_hours),
        website = COALESCE(?, website),
        google_rating = COALESCE(?, google_rating),
        google_reviews = COALESCE(?, google_reviews),
        custom_upi_id = COALESCE(?, custom_upi_id),
        custom_upi_name = COALESCE(?, custom_upi_name),
        custom_upi_qr_url = COALESCE(?, custom_upi_qr_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name, tagline, phone, email, address, city, state, pincode,
        opening_time, closing_time, slot_interval_minutes,
        points_per_100_inr, inr_value_per_point, min_redeem_points, cancellation_notice_hours,
        website, google_rating, google_reviews,
        custom_upi_id, custom_upi_name, custom_upi_qr_url,
        salon.id
      ]
    );

    const updated = await getRow('SELECT * FROM salons WHERE id = ?', [salon.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SERVICES
// ----------------------------------------------------
apiRouter.get('/services', async (req: Request, res: Response) => {
  try {
    const services = await query('SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC, category ASC, name ASC');
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/services', async (req: Request, res: Response) => {
  try {
    const services = await query('SELECT * FROM services ORDER BY display_order ASC, category ASC, name ASC');
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/services', async (req: Request, res: Response) => {
  try {
    const {
      category, name, description, price, duration_minutes,
      is_featured, image_url, discounted_price, display_order, show_price
    } = req.body;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const id = `srv-${uuidv4().slice(0, 8)}`;

    await run(
      `INSERT INTO services (
        id, salon_id, category, name, description, price, duration_minutes,
        is_featured, is_active, image_url, discounted_price, display_order, show_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        category, name, description || '', price, duration_minutes || 30,
        is_featured ? 1 : 0, image_url || '',
        discounted_price ? Number(discounted_price) : null,
        display_order ? Number(display_order) : 0,
        show_price !== undefined ? (show_price ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM services WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/services/:id', async (req: Request, res: Response) => {
  try {
    const {
      category, name, description, price, duration_minutes,
      is_featured, is_active, image_url, discounted_price, display_order, show_price
    } = req.body;
    await run(
      `UPDATE services SET
        category = ?, name = ?, description = ?, price = ?, duration_minutes = ?,
        is_featured = ?, is_active = ?, image_url = ?,
        discounted_price = ?, display_order = ?, show_price = ?
       WHERE id = ?`,
      [
        category, name, description, price, duration_minutes,
        is_featured ? 1 : 0, is_active ? 1 : 0, image_url,
        discounted_price ? Number(discounted_price) : null,
        display_order !== undefined ? Number(display_order) : 0,
        show_price !== undefined ? (show_price ? 1 : 0) : 1,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM services WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/services/:id', async (req: Request, res: Response) => {
  try {
    await run('UPDATE services SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// STAFF & WORKING HOURS
// ----------------------------------------------------
apiRouter.get('/staff', async (req: Request, res: Response) => {
  try {
    // Only public-safe fields for client
    const staff = await query(`
      SELECT id, salon_id, name, role, designation, specialties, bio, avatar_url,
             working_days, start_time, end_time, display_order, is_active
      FROM staff
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `);
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/staff', async (req: Request, res: Response) => {
  try {
    const staff = await query('SELECT * FROM staff ORDER BY display_order ASC, name ASC');
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/staff', async (req: Request, res: Response) => {
  try {
    const {
      name, email, phone, role, bio, avatar_url, working_days,
      start_time, end_time, break_start, break_end,
      designation, specialties, display_order
    } = req.body;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const id = `staff-${uuidv4().slice(0, 8)}`;

    await run(
      `INSERT INTO staff (
        id, salon_id, name, email, phone, role, bio, avatar_url,
        working_days, start_time, end_time, break_start, break_end, is_active,
        designation, specialties, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        name, email || '', normalizePhone(phone || '0000000000'), role || 'stylist', bio || '', avatar_url || '',
        JSON.stringify(working_days || ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]),
        start_time || '09:00', end_time || '20:00', break_start || '13:00', break_end || '14:00',
        designation || 'Senior Stylist', specialties || 'Hair & Beauty', display_order ? Number(display_order) : 0
      ]
    );

    const created = await getRow('SELECT * FROM staff WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/staff/:id', async (req: Request, res: Response) => {
  try {
    const {
      name, email, phone, role, bio, avatar_url, working_days,
      start_time, end_time, break_start, break_end, is_active,
      designation, specialties, display_order
    } = req.body;
    await run(
      `UPDATE staff SET
        name = ?, email = ?, phone = ?, role = ?, bio = ?, avatar_url = ?,
        working_days = ?, start_time = ?, end_time = ?, break_start = ?, break_end = ?, is_active = ?,
        designation = ?, specialties = ?, display_order = ?
       WHERE id = ?`,
      [
        name, email, phone ? normalizePhone(phone) : '', role, bio, avatar_url,
        typeof working_days === 'string' ? working_days : JSON.stringify(working_days),
        start_time, end_time, break_start, break_end, is_active ? 1 : 0,
        designation || 'Senior Stylist', specialties || 'Hair & Beauty',
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/staff/:id/time-off', async (req: Request, res: Response) => {
  try {
    const { date, reason } = req.body;
    const id = `to-${uuidv4().slice(0, 8)}`;
    await run('INSERT INTO staff_time_off (id, staff_id, date, reason) VALUES (?, ?, ?, ?)', [
      id, req.params.id, date, reason
    ]);
    res.status(201).json({ id, date, reason });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AVAILABILITY CALCULATION (CONFLICT PREVENTION)
// ----------------------------------------------------
apiRouter.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date, service_id, staff_id } = req.query as { date: string; service_id?: string; staff_id?: string };

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    const salon = await getRow<any>('SELECT * FROM salons LIMIT 1');
    const service = service_id ? await getRow<any>('SELECT * FROM services WHERE id = ?', [service_id]) : null;
    const duration = service ? service.duration_minutes : 45;

    // Determine target staff members
    let staffList: any[] = [];
    if (staff_id && staff_id !== 'any') {
      const s = await getRow<any>('SELECT * FROM staff WHERE id = ? AND is_active = 1', [staff_id]);
      if (s) staffList = [s];
    } else {
      staffList = await query('SELECT * FROM staff WHERE is_active = 1 AND role IN (\'stylist\', \'owner\', \'manager\')');
    }

    if (staffList.length === 0) {
      return res.json({ availableSlots: [], staffAvailable: [] });
    }

    // Fetch existing appointments on this date
    const existingAppointments = await query<any>(
      `SELECT staff_id, start_time, end_time FROM appointments
       WHERE appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`,
      [date]
    );

    // Fetch staff leaves on this date
    const leaves = await query<any>('SELECT staff_id FROM staff_time_off WHERE date = ?', [date]);
    const staffOnLeave = new Set(leaves.map(l => l.staff_id));

    // Calculate slots between salon opening and closing
    // Helper to convert "HH:MM" to minutes from midnight
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const toTimeStr = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const salonOpen = toMinutes(salon.opening_time || '09:00');
    const salonClose = toMinutes(salon.closing_time || '20:00');
    const interval = salon.slot_interval_minutes || 30;

    const availableSlots: { time: string; availableStaffIds: string[] }[] = [];

    // Current time check if date is today
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const isToday = (date === todayStr);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let slotMin = salonOpen; slotMin + duration <= salonClose; slotMin += interval) {
      // Don't allow past time slots today
      if (isToday && slotMin <= currentMinutes + 30) {
        continue;
      }

      const slotStartStr = toTimeStr(slotMin);
      const slotEndMin = slotMin + duration;
      const slotEndStr = toTimeStr(slotEndMin);

      const availableStaffForSlot: string[] = [];

      for (const st of staffList) {
        if (staffOnLeave.has(st.id)) continue;

        const staffStart = toMinutes(st.start_time || '09:00');
        const staffEnd = toMinutes(st.end_time || '20:00');
        const breakStart = toMinutes(st.break_start || '13:00');
        const breakEnd = toMinutes(st.break_end || '14:00');

        // Check if within staff working hours
        if (slotMin < staffStart || slotEndMin > staffEnd) continue;

        // Check if overlapping staff break
        if (!(slotEndMin <= breakStart || slotMin >= breakEnd)) continue;

        // Check if overlapping another appointment for this staff
        const hasConflict = existingAppointments.some(apt => {
          if (apt.staff_id !== st.id) return false;
          const aptStart = toMinutes(apt.start_time);
          const aptEnd = toMinutes(apt.end_time);
          return (slotMin < aptEnd && slotEndMin > aptStart);
        });

        if (!hasConflict) {
          availableStaffForSlot.push(st.id);
        }
      }

      if (availableStaffForSlot.length > 0) {
        availableSlots.push({
          time: slotStartStr,
          availableStaffIds: availableStaffForSlot
        });
      }
    }

    res.json({
      date,
      availableSlots,
      staffCount: staffList.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BOOK APPOINTMENT (CUSTOMER OR ADMIN)
// ----------------------------------------------------
apiRouter.post('/appointments/book', async (req: Request, res: Response) => {
  try {
    const {
      service_id, staff_id, appointment_date, start_time,
      customer_name, customer_phone, customer_email, notes, source
    } = req.body;

    if (!service_id || !appointment_date || !start_time || !customer_name || !customer_phone) {
      return res.status(400).json({ error: 'Missing required booking details.' });
    }

    const salon = await getRow<any>('SELECT * FROM salons LIMIT 1');
    const service = await getRow<any>('SELECT * FROM services WHERE id = ?', [service_id]);
    if (!service) return res.status(404).json({ error: 'Selected service not found.' });

    const duration = service.duration_minutes;
    const [h, m] = start_time.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Select specific staff or assign available staff
    let chosenStaffId = staff_id;
    if (!chosenStaffId || chosenStaffId === 'any') {
      // Find eligible available staff for this slot
      const existingAppointments = await query<any>(
        `SELECT staff_id, start_time, end_time FROM appointments
         WHERE appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`,
        [appointment_date]
      );
      const allStylists = await query<any>('SELECT * FROM staff WHERE is_active = 1 AND role IN (\'stylist\', \'owner\', \'manager\')');

      for (const st of allStylists) {
        const slotMin = h * 60 + m;
        const slotEnd = endMinutes;
        const conflict = existingAppointments.some(apt => {
          if (apt.staff_id !== st.id) return false;
          const [ah, am] = apt.start_time.split(':').map(Number);
          const [eh, em] = apt.end_time.split(':').map(Number);
          return (slotMin < (eh * 60 + em) && slotEnd > (ah * 60 + am));
        });
        if (!conflict) {
          chosenStaffId = st.id;
          break;
        }
      }
    }

    if (!chosenStaffId) {
      return res.status(409).json({ error: 'No staff available for the selected time slot.' });
    }

    // STRICT DOUBLE BOOKING CONFLICT CHECK
    const conflictCheck = await query<any>(
      `SELECT * FROM appointments
       WHERE appointment_date = ? AND staff_id = ? AND status NOT IN ('cancelled', 'no_show')`,
      [appointment_date, chosenStaffId]
    );

    const slotStartMin = h * 60 + m;
    const hasOverlap = conflictCheck.some(apt => {
      const [ah, am] = apt.start_time.split(':').map(Number);
      const [eh, em] = apt.end_time.split(':').map(Number);
      return (slotStartMin < (eh * 60 + em) && endMinutes > (ah * 60 + am));
    });

    if (hasOverlap) {
      return res.status(409).json({ error: 'This time slot is already booked for this staff member. Please choose another time.' });
    }

    // CUSTOMER DEDUPLICATION: Link to existing customer by normalized phone
    const cleanPhone = normalizePhone(customer_phone);
    let customer = await getRow<any>('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);

    if (!customer) {
      const custId = `cust-${uuidv4().slice(0, 8)}`;
      await run(
        `INSERT INTO customers (id, salon_id, full_name, phone, email, notes, total_visits, total_spent, loyalty_points, lifetime_points_earned, lifetime_points_redeemed)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0)`,
        [custId, salon.id, customer_name, cleanPhone, customer_email || null, 'Registered via online booking']
      );
      customer = await getRow<any>('SELECT * FROM customers WHERE id = ?', [custId]);
    } else {
      // Update name/email if provided
      if (customer_email && !customer.email) {
        await run('UPDATE customers SET email = ? WHERE id = ?', [customer_email, customer.id]);
      }
    }

    // Generate unique Booking Reference
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const booking_reference = `AL-${new Date().getFullYear()}-${randomDigits}`;
    const aptId = `apt-${uuidv4().slice(0, 8)}`;

    await run(
      `INSERT INTO appointments (
        id, booking_reference, salon_id, customer_id, staff_id, service_id,
        appointment_date, start_time, end_time, duration_minutes,
        status, payment_status, total_amount, discount_amount, points_redeemed, points_discount, final_amount,
        notes, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'unpaid', ?, 0, 0, 0, ?, ?, ?)`,
      [
        aptId, booking_reference, salon.id, customer.id, chosenStaffId, service.id,
        appointment_date, start_time, end_time, duration,
        service.price, service.price, notes || '', source || 'online'
      ]
    );

    // Trigger confirmation notification (Email & SMS)
    await notifyAppointmentBooking(aptId);

    const createdAppointment = await getRow<any>(
      `SELECT a.*, s.name as service_name, st.name as staff_name, c.full_name as customer_name, c.phone as customer_phone
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [aptId]
    );

    res.status(201).json(createdAppointment);
  } catch (err: any) {
    console.error('Error booking appointment:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// APPOINTMENTS LIST & STATUS UPDATES
// ----------------------------------------------------
apiRouter.get('/appointments', async (req: Request, res: Response) => {
  try {
    const { date, staff_id, status, search } = req.query as { date?: string; staff_id?: string; status?: string; search?: string };

    let sqlStr = `
      SELECT a.*, s.name as service_name, s.price as service_price, s.category as service_category,
             st.name as staff_name, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             c.loyalty_points as customer_loyalty_points
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff st ON a.staff_id = st.id
      JOIN customers c ON a.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      sqlStr += ' AND a.appointment_date = ?';
      params.push(date);
    }
    if (staff_id && staff_id !== 'all') {
      sqlStr += ' AND a.staff_id = ?';
      params.push(staff_id);
    }
    if (status && status !== 'all') {
      sqlStr += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      sqlStr += ' AND (a.booking_reference LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY a.appointment_date DESC, a.start_time DESC';

    const appointments = await query(sqlStr, params);
    res.json(appointments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/appointments/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const allowed = ['confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid appointment status.' });
    }

    await run('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

    if (status === 'cancelled') {
      await notifyAppointmentCancellation(req.params.id);
    }

    const updated = await getRow('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/appointments/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { appointment_date, start_time, staff_id } = req.body;
    const apt = await getRow<any>('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });

    const targetStaffId = staff_id || apt.staff_id;
    const [h, m] = start_time.split(':').map(Number);
    const endMinutes = h * 60 + m + apt.duration_minutes;
    const end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Conflict check
    const conflicts = await query<any>(
      `SELECT * FROM appointments
       WHERE appointment_date = ? AND staff_id = ? AND id != ? AND status NOT IN ('cancelled', 'no_show')`,
      [appointment_date, targetStaffId, apt.id]
    );

    const slotStartMin = h * 60 + m;
    const hasOverlap = conflicts.some(c => {
      const [ah, am] = c.start_time.split(':').map(Number);
      const [eh, em] = c.end_time.split(':').map(Number);
      return (slotStartMin < (eh * 60 + em) && endMinutes > (ah * 60 + am));
    });

    if (hasOverlap) {
      return res.status(409).json({ error: 'Staff member is already booked at that time. Please pick another slot.' });
    }

    await run(
      `UPDATE appointments SET
        appointment_date = ?, start_time = ?, end_time = ?, staff_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [appointment_date, start_time, end_time, targetStaffId, apt.id]
    );

    // Send confirmation/update notification
    await notifyAppointmentBooking(apt.id);

    const updated = await getRow('SELECT * FROM appointments WHERE id = ?', [apt.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CHECKOUT, PAYMENTS, RECEIPTS & LOYALTY AWARDING
// ----------------------------------------------------
apiRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    const {
      appointment_id,
      payment_method, // 'cash', 'upi', 'card', 'bank_transfer'
      transaction_reference,
      redeem_points = 0,
      discount_inr = 0,
      recorded_by = 'Front Desk'
    } = req.body;

    const apt = await getRow<any>(
      `SELECT a.*, c.full_name as customer_name, c.phone as customer_phone, c.loyalty_points as customer_balance,
              s.name as service_name, st.name as staff_name
       FROM appointments a
       JOIN customers c ON a.customer_id = c.id
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       WHERE a.id = ?`,
      [appointment_id]
    );

    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    if (apt.payment_status === 'paid') {
      return res.status(400).json({ error: 'Appointment is already paid.' });
    }

    const salon = await getRow<any>('SELECT * FROM salons LIMIT 1');
    const pointValue = salon.inr_value_per_point || 0.50; // e.g. 1 point = ₹0.50
    const pointsToRedeem = Number(redeem_points) || 0;

    // Validate points balance
    if (pointsToRedeem > 0) {
      if (pointsToRedeem > apt.customer_balance) {
        return res.status(400).json({
          error: `Insufficient loyalty points. Customer balance is ${apt.customer_balance} points.`
        });
      }
      if (pointsToRedeem < salon.min_redeem_points) {
        return res.status(400).json({
          error: `Minimum loyalty points redemption threshold is ${salon.min_redeem_points} points.`
        });
      }
    }

    const pointsDiscountRupees = Math.round(pointsToRedeem * pointValue);
    const totalDiscount = Number(discount_inr || 0) + pointsDiscountRupees;
    const finalPayable = Math.max(0, apt.total_amount - totalDiscount);

    // 1. Record payment
    const paymentId = `pay-${uuidv4().slice(0, 8)}`;
    const payRef = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await run(
      `INSERT INTO payments (
        id, payment_reference, appointment_id, customer_id, amount, payment_method, transaction_reference, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId, payRef, apt.id, apt.customer_id, finalPayable, payment_method,
        transaction_reference || '', `Settled via checkout. Points redeemed: ${pointsToRedeem}`, recorded_by
      ]
    );

    // 2. Generate Receipt
    const receiptId = `rec-${uuidv4().slice(0, 8)}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    await run(
      `INSERT INTO receipts (
        id, receipt_number, appointment_id, customer_id, customer_name, customer_phone,
        service_name, staff_name, appointment_date, subtotal, discount, points_redeemed, points_discount,
        tax_amount, total_paid, payment_method, transaction_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        receiptId, receiptNumber, apt.id, apt.customer_id, apt.customer_name, apt.customer_phone,
        apt.service_name, apt.staff_name, apt.appointment_date, apt.total_amount, Number(discount_inr || 0),
        pointsToRedeem, pointsDiscountRupees, finalPayable, payment_method, transaction_reference || ''
      ]
    );

    // 3. Handle Loyalty Points Deduction if redeemed (Ledger entry!)
    let currentBalance = apt.customer_balance;
    if (pointsToRedeem > 0) {
      const prevBal = currentBalance;
      currentBalance = currentBalance - pointsToRedeem;
      const ltRedeemId = `lt-${uuidv4().slice(0, 8)}`;

      await run(
        `INSERT INTO loyalty_transactions (
          id, customer_id, appointment_id, payment_id, transaction_type, points, previous_balance, new_balance, reason, performed_by
        ) VALUES (?, ?, ?, ?, 'redeemed', ?, ?, ?, ?, ?)`,
        [
          ltRedeemId, apt.customer_id, apt.id, paymentId, -pointsToRedeem,
          prevBal, currentBalance, `Redeemed ${pointsToRedeem} points for ₹${pointsDiscountRupees} discount at checkout`, recorded_by
        ]
      );

      await run(
        `UPDATE customers SET
          loyalty_points = ?,
          lifetime_points_redeemed = lifetime_points_redeemed + ?
         WHERE id = ?`,
        [currentBalance, pointsToRedeem, apt.customer_id]
      );
    }

    // 4. Calculate Points Earned for this paid transaction (e.g., 1 pt per ₹100 of net eligible payment)
    const earnRate = salon.points_per_100_inr || 1;
    const pointsEarned = Math.floor((finalPayable / 100) * earnRate);

    if (pointsEarned > 0) {
      const prevBal = currentBalance;
      currentBalance = currentBalance + pointsEarned;
      const ltEarnId = `lt-${uuidv4().slice(0, 8)}`;

      await run(
        `INSERT INTO loyalty_transactions (
          id, customer_id, appointment_id, payment_id, transaction_type, points, previous_balance, new_balance, reason, performed_by
        ) VALUES (?, ?, ?, ?, 'earned', ?, ?, ?, ?, ?)`,
        [
          ltEarnId, apt.customer_id, apt.id, paymentId, pointsEarned,
          prevBal, currentBalance, `Earned ${pointsEarned} loyalty points on appointment ${apt.booking_reference}`, 'System'
        ]
      );

      await run(
        `UPDATE customers SET
          loyalty_points = ?,
          lifetime_points_earned = lifetime_points_earned + ?,
          total_visits = total_visits + 1,
          total_spent = total_spent + ?
         WHERE id = ?`,
        [currentBalance, pointsEarned, finalPayable, apt.customer_id]
      );

      // Trigger loyalty points notification (Email & SMS)
      const rupeeValue = currentBalance * pointValue;
      await notifyLoyaltyPoints(apt.customer_id, pointsEarned, currentBalance, `Appointment ${apt.booking_reference}`, rupeeValue);
    } else {
      // Just increment visit and spent if no points
      await run(
        `UPDATE customers SET
          total_visits = total_visits + 1,
          total_spent = total_spent + ?
         WHERE id = ?`,
        [finalPayable, apt.customer_id]
      );
    }

    // 5. Update appointment status to 'completed' and 'paid'
    await run(
      `UPDATE appointments SET
        status = 'completed',
        payment_status = 'paid',
        discount_amount = ?,
        points_redeemed = ?,
        points_discount = ?,
        final_amount = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [Number(discount_inr || 0), pointsToRedeem, pointsDiscountRupees, finalPayable, apt.id]
    );

    const receipt = await getRow('SELECT * FROM receipts WHERE id = ?', [receiptId]);

    res.json({
      success: true,
      receipt,
      pointsEarned,
      pointsRedeemed: pointsToRedeem,
      newLoyaltyBalance: currentBalance
    });
  } catch (err: any) {
    console.error('Error during checkout:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/receipts/:id', async (req: Request, res: Response) => {
  try {
    const receipt = await getRow('SELECT * FROM receipts WHERE id = ? OR appointment_id = ?', [req.params.id, req.params.id]);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    const salon = await getRow('SELECT * FROM salons LIMIT 1');
    res.json({ receipt, salon });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REFUNDS
// ----------------------------------------------------
apiRouter.post('/refunds', async (req: Request, res: Response) => {
  try {
    const { appointment_id, amount, reason, recorded_by = 'Admin' } = req.body;
    const apt = await getRow<any>('SELECT * FROM appointments WHERE id = ?', [appointment_id]);
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });

    const payment = await getRow<any>('SELECT * FROM payments WHERE appointment_id = ?', [appointment_id]);
    if (!payment) return res.status(400).json({ error: 'No payment found for this appointment' });

    const refundAmount = Number(amount) || payment.amount;
    const refundId = `ref-${uuidv4().slice(0, 8)}`;

    // Reversal of points earned on this payment
    const earnedTx = await getRow<any>(
      `SELECT * FROM loyalty_transactions WHERE appointment_id = ? AND transaction_type = 'earned'`,
      [appointment_id]
    );

    let pointsToReverse = 0;
    if (earnedTx && earnedTx.points > 0) {
      pointsToReverse = earnedTx.points;
      const cust = await getRow<any>('SELECT loyalty_points FROM customers WHERE id = ?', [apt.customer_id]);
      const prevBal = cust.loyalty_points;
      const newBal = Math.max(0, prevBal - pointsToReverse);

      await run(
        `INSERT INTO loyalty_transactions (
          id, customer_id, appointment_id, payment_id, transaction_type, points, previous_balance, new_balance, reason, performed_by
        ) VALUES (?, ?, ?, ?, 'reversed', ?, ?, ?, ?, ?)`,
        [
          `lt-rev-${uuidv4().slice(0, 8)}`, apt.customer_id, appointment_id, payment.id, -pointsToReverse,
          prevBal, newBal, `Refund correction: ${reason}`, recorded_by
        ]
      );

      await run(
        'UPDATE customers SET loyalty_points = ?, lifetime_points_earned = MAX(0, lifetime_points_earned - ?) WHERE id = ?',
        [newBal, pointsToReverse, apt.customer_id]
      );
    }

    await run(
      `INSERT INTO refunds (id, payment_id, appointment_id, customer_id, amount, reason, points_reversed, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [refundId, payment.id, appointment_id, apt.customer_id, refundAmount, reason, pointsToReverse, recorded_by]
    );

    await run(`UPDATE appointments SET payment_status = 'refunded' WHERE id = ?`, [appointment_id]);

    res.json({ success: true, refundId, pointsReversed: pointsToReverse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOMERS CRM
// ----------------------------------------------------
apiRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const { search, sortBy = 'total_spent', order = 'DESC' } = req.query as { search?: string; sortBy?: string; order?: string };

    let sqlStr = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sqlStr += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const safeSort = ['total_spent', 'total_visits', 'loyalty_points', 'full_name', 'created_at'].includes(sortBy) ? sortBy : 'total_spent';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sqlStr += ` ORDER BY ${safeSort} ${safeOrder}`;

    const customers = await query(sqlStr, params);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await getRow('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const appointments = await query(
      `SELECT a.*, s.name as service_name, st.name as staff_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       WHERE a.customer_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [req.params.id]
    );

    const loyaltyTransactions = await query(
      'SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const payments = await query(
      'SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      customer,
      appointments,
      loyaltyTransactions,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/customers/:id/notes', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    await run('UPDATE customers SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [notes, req.params.id]);
    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { full_name, phone, email, birthday, notes } = req.body;
    await run(
      `UPDATE customers SET
        full_name = ?, phone = ?, email = ?, birthday = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [full_name, normalizePhone(phone), email, birthday, notes, req.params.id]
    );
    const updated = await getRow('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/customers/adjust-points', async (req: Request, res: Response) => {
  try {
    const { customer_id, points, reason, performed_by = 'Admin' } = req.body;
    if (!reason || !points) {
      return res.status(400).json({ error: 'Points and a clear audit reason are required.' });
    }

    const customer = await getRow<any>('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const prevBal = customer.loyalty_points;
    const pts = Number(points);
    const newBal = prevBal + pts;

    if (newBal < 0) {
      return res.status(400).json({ error: 'Points balance cannot be negative.' });
    }

    const id = `lt-${uuidv4().slice(0, 8)}`;
    await run(
      `INSERT INTO loyalty_transactions (
        id, customer_id, transaction_type, points, previous_balance, new_balance, reason, performed_by
      ) VALUES (?, ?, 'adjusted', ?, ?, ?, ?, ?)`,
      [id, customer_id, pts, prevBal, newBal, reason, performed_by]
    );

    await run('UPDATE customers SET loyalty_points = ? WHERE id = ?', [newBal, customer_id]);

    res.json({ success: true, previous_balance: prevBal, new_balance: newBal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/customers-export-csv', async (req: Request, res: Response) => {
  try {
    const customers = await query<any>('SELECT * FROM customers ORDER BY total_spent DESC');
    let csv = 'ID,Full Name,Phone,Email,Total Visits,Total Spent (INR),Loyalty Points,Lifetime Earned,Notes,Registered At\n';
    for (const c of customers) {
      csv += `"${c.id}","${c.full_name}","${c.phone}","${c.email || ''}",${c.total_visits},${c.total_spent},${c.loyalty_points},${c.lifetime_points_earned},"${(c.notes || '').replace(/"/g, '""')}","${c.created_at}"\n`;
    }
    res.header('Content-Type', 'text/csv');
    res.attachment('salon_customers.csv');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// LOYALTY REWARDS & CONFIG
// ----------------------------------------------------
apiRouter.get('/loyalty/rewards', async (req: Request, res: Response) => {
  try {
    const rewards = await query('SELECT * FROM loyalty_rewards WHERE is_active = 1 ORDER BY points_required ASC');
    res.json(rewards);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/loyalty/rewards', async (req: Request, res: Response) => {
  try {
    const { title, description, points_required, discount_inr } = req.body;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const id = `rew-${uuidv4().slice(0, 8)}`;

    await run(
      'INSERT INTO loyalty_rewards (id, salon_id, title, description, points_required, discount_inr) VALUES (?, ?, ?, ?, ?, ?)',
      [id, salon.id, title, description || '', points_required, discount_inr]
    );

    const created = await getRow('SELECT * FROM loyalty_rewards WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/loyalty/rewards/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, points_required, discount_inr, is_active } = req.body;
    await run(
      'UPDATE loyalty_rewards SET title = ?, description = ?, points_required = ?, discount_inr = ?, is_active = ? WHERE id = ?',
      [title, description, points_required, discount_inr, is_active ? 1 : 0, req.params.id]
    );
    const updated = await getRow('SELECT * FROM loyalty_rewards WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/loyalty/rewards/:id', async (req: Request, res: Response) => {
  try {
    await run('UPDATE loyalty_rewards SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/loyalty/ledger', async (req: Request, res: Response) => {
  try {
    const transactions = await query<any>(
      `SELECT lt.*, c.full_name as customer_name, c.phone as customer_phone
       FROM loyalty_transactions lt
       JOIN customers c ON lt.customer_id = c.id
       ORDER BY lt.created_at DESC LIMIT 100`
    );
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EXPENSES
// ----------------------------------------------------
apiRouter.get('/expenses', async (req: Request, res: Response) => {
  try {
    const expenses = await query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/expenses', async (req: Request, res: Response) => {
  try {
    const { category, description, amount, date, payment_method, vendor, notes } = req.body;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const id = `exp-${uuidv4().slice(0, 8)}`;

    await run(
      `INSERT INTO expenses (id, salon_id, category, description, amount, date, payment_method, vendor, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, salon.id, category, description, amount, date, payment_method || 'upi', vendor || '', notes || '']
    );

    const created = await getRow('SELECT * FROM expenses WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// NOTIFICATION SETTINGS & LOGS (ADMIN)
// ----------------------------------------------------
apiRouter.get('/notifications/settings', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/notifications/settings', async (req: Request, res: Response) => {
  try {
    const {
      email_enabled, sms_enabled, whatsapp_enabled,
      email_provider, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, resend_api_key,
      sms_provider, twilio_account_sid, twilio_auth_token, twilio_phone_number,
      whatsapp_provider, whatsapp_api_token, whatsapp_phone_number_id,
      notify_on_booking, notify_on_cancellation, notify_on_reminder, notify_on_loyalty,
      template_booking_subject, template_booking_body, template_reminder_body,
      template_cancellation_body, template_loyalty_body
    } = req.body;

    const current = await getRow<any>('SELECT id FROM notification_settings LIMIT 1');

    await run(
      `UPDATE notification_settings SET
        email_enabled = ?, sms_enabled = ?, whatsapp_enabled = ?,
        email_provider = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, from_email = ?, resend_api_key = ?,
        sms_provider = ?, twilio_account_sid = ?, twilio_auth_token = ?, twilio_phone_number = ?,
        whatsapp_provider = ?, whatsapp_api_token = ?, whatsapp_phone_number_id = ?,
        notify_on_booking = ?, notify_on_cancellation = ?, notify_on_reminder = ?, notify_on_loyalty = ?,
        template_booking_subject = ?, template_booking_body = ?, template_reminder_body = ?,
        template_cancellation_body = ?, template_loyalty_body = ?
       WHERE id = ?`,
      [
        email_enabled ? 1 : 0, sms_enabled ? 1 : 0, whatsapp_enabled ? 1 : 0,
        email_provider, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, resend_api_key,
        sms_provider, twilio_account_sid, twilio_auth_token, twilio_phone_number,
        whatsapp_provider, whatsapp_api_token, whatsapp_phone_number_id,
        notify_on_booking ? 1 : 0, notify_on_cancellation ? 1 : 0, notify_on_reminder ? 1 : 0, notify_on_loyalty ? 1 : 0,
        template_booking_subject, template_booking_body, template_reminder_body,
        template_cancellation_body, template_loyalty_body,
        current.id
      ]
    );

    const updated = await getSettings();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/notifications/logs', async (req: Request, res: Response) => {
  try {
    const logs = await query('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notifications/send-test', async (req: Request, res: Response) => {
  try {
    const { channel, recipient, recipient_name = 'Test Recipient', message = 'This is an A-One Hair & Beauty Studio test notification.' } = req.body;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const settings = await getSettings();

    let status: 'delivered' | 'simulated_log' = 'simulated_log';
    let detail = '';

    if (channel === 'email') {
      const hasCreds = (settings.email_provider === 'smtp' && settings.smtp_host) || (settings.email_provider === 'resend' && settings.resend_api_key);
      status = hasCreds ? 'delivered' : 'simulated_log';
      detail = hasCreds ? `Dispatched via ${settings.email_provider.toUpperCase()}` : 'Simulated log: Provide SMTP / Resend keys in Admin Settings to deliver to inbox';
    } else if (channel === 'sms') {
      const hasCreds = settings.sms_provider === 'twilio' && settings.twilio_account_sid;
      status = hasCreds ? 'delivered' : 'simulated_log';
      detail = hasCreds ? 'Dispatched via Twilio SMS' : 'Simulated log: Provide Twilio SID & Token in Admin Settings to send live SMS';
    } else {
      status = 'simulated_log';
      detail = 'Simulated log: Provide WhatsApp Business token in Admin Settings';
    }

    await logNotification(
      salon.id,
      recipient,
      recipient_name,
      channel,
      'test',
      'Test Notification from A-One Hair & Beauty Studio',
      message,
      status,
      detail
    );

    res.json({ success: true, channel, recipient, status, detail });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notifications/trigger-reminders', async (req: Request, res: Response) => {
  try {
    const result = await triggerUpcoming24hReminders();
    res.json({ success: true, count: result.sent, appointments: result.appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DASHBOARD OVERVIEW & ANALYTICS
// ----------------------------------------------------
apiRouter.get('/admin/overview', async (req: Request, res: Response) => {
  try {
    const { range = '30days' } = req.query as { range?: string };

    const todayStr = new Date().toISOString().slice(0, 10);

    // Today's metrics
    const todayApts = await query<any>(
      'SELECT status, payment_status, final_amount FROM appointments WHERE appointment_date = ?',
      [todayStr]
    );

    const todayPayments = await query<any>(
      `SELECT SUM(amount) as total FROM payments WHERE created_at LIKE ?`,
      [`${todayStr}%`]
    );

    const todayRevenue = todayPayments[0]?.total || 0;
    const todayCompletedCount = todayApts.filter(a => a.status === 'completed').length;
    const todayTotalCount = todayApts.length;

    // Total registered customers
    const totalCustomersRow = await getRow<any>('SELECT COUNT(*) as cnt FROM customers');
    const totalCustomers = totalCustomersRow?.cnt || 0;

    // Loyalty points total issued vs redeemed
    const loyaltyStats = await getRow<any>(
      `SELECT
        SUM(lifetime_points_earned) as total_issued,
        SUM(lifetime_points_redeemed) as total_redeemed,
        SUM(loyalty_points) as active_balance
       FROM customers`
    );

    // Expenses total
    const totalExpensesRow = await getRow<any>('SELECT SUM(amount) as total FROM expenses');
    const totalExpenses = totalExpensesRow?.total || 0;

    // All payments collected
    const allPaymentsRow = await getRow<any>('SELECT SUM(amount) as total FROM payments');
    const totalCollectedRevenue = allPaymentsRow?.total || 0;

    // Popular services
    const popularServices = await query<any>(
      `SELECT s.name, COUNT(a.id) as count, SUM(a.final_amount) as total_volume
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.status != 'cancelled'
       GROUP BY s.name
       ORDER BY count DESC LIMIT 5`
    );

    // Staff performance
    const staffWorkload = await query<any>(
      `SELECT st.name, COUNT(a.id) as appointments_count, SUM(CASE WHEN a.status = 'completed' THEN a.final_amount ELSE 0 END) as revenue_generated
       FROM staff st
       LEFT JOIN appointments a ON st.id = a.staff_id AND a.status != 'cancelled'
       WHERE st.is_active = 1
       GROUP BY st.name
       ORDER BY appointments_count DESC`
    );

    // Payment methods distribution
    const paymentMethods = await query<any>(
      `SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
       FROM payments
       GROUP BY payment_method`
    );

    // Daily revenue last 7 days
    const dailyRevenue: { date: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayPay = await getRow<any>('SELECT SUM(amount) as total, COUNT(*) as count FROM payments WHERE created_at LIKE ?', [`${d}%`]);
      dailyRevenue.push({
        date: d,
        amount: dayPay?.total || 0,
        count: dayPay?.count || 0
      });
    }

    res.json({
      today: {
        date: todayStr,
        appointmentsCount: todayTotalCount,
        completedCount: todayCompletedCount,
        revenue: todayRevenue
      },
      lifetime: {
        totalCustomers,
        totalCollectedRevenue,
        totalExpenses,
        estimatedSurplus: totalCollectedRevenue - totalExpenses,
        pointsIssued: loyaltyStats?.total_issued || 0,
        pointsRedeemed: loyaltyStats?.total_redeemed || 0,
        activeLoyaltyPoints: loyaltyStats?.active_balance || 0
      },
      popularServices,
      staffWorkload,
      paymentMethods,
      dailyRevenue
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOMER PORTAL AUTH & DATA
// ----------------------------------------------------
apiRouter.post('/auth/customer/login', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const cleanPhone = normalizePhone(phone);
    const customer = await getRow<any>('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);

    if (!customer) {
      return res.status(404).json({ error: 'No account found with this phone number. Please book an appointment or register.' });
    }

    res.json({ success: true, customer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/customer/register', async (req: Request, res: Response) => {
  try {
    const { full_name, phone, email, birthday } = req.body;
    if (!full_name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });

    const cleanPhone = normalizePhone(phone);
    let customer = await getRow<any>('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);

    if (customer) {
      return res.status(409).json({ error: 'An account already exists for this phone number. Please log in.' });
    }

    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const id = `cust-${uuidv4().slice(0, 8)}`;

    await run(
      `INSERT INTO customers (id, salon_id, full_name, phone, email, birthday, total_visits, total_spent, loyalty_points, lifetime_points_earned, lifetime_points_redeemed)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 50, 50, 0)`,
      [id, salon.id, full_name, cleanPhone, email || null, birthday || null]
    );

    // Welcome bonus 50 points ledger
    await run(
      `INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, previous_balance, new_balance, reason, performed_by)
       VALUES (?, ?, 'earned', 50, 0, 50, 'Welcome bonus loyalty reward', 'System')`,
      [`lt-welcome-${uuidv4().slice(0, 8)}`, id]
    );

    const created = await getRow('SELECT * FROM customers WHERE id = ?', [id]);
    res.status(201).json({ success: true, customer: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/customer/portal-data', async (req: Request, res: Response) => {
  try {
    const { phone } = req.query as { phone?: string };
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    const cleanPhone = normalizePhone(phone);
    const customer = await getRow<any>('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const appointments = await query(
      `SELECT a.*, s.name as service_name, s.price as service_price, st.name as staff_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       WHERE a.customer_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [customer.id]
    );

    const loyaltyTransactions = await query(
      'SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC',
      [customer.id]
    );

    const salon = await getRow('SELECT * FROM salons LIMIT 1');
    const availableRewards = await query('SELECT * FROM loyalty_rewards WHERE is_active = 1 ORDER BY points_required ASC');

    res.json({
      customer,
      appointments,
      loyaltyTransactions,
      salon,
      availableRewards
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// RECEPTIONIST ENTRY & CUSTOMER VISIT RECORDING
// ----------------------------------------------------

/**
 * Search customer by phone number and return profile with visit history
 */
apiRouter.get('/receptionist/search-customer', async (req: Request, res: Response) => {
  try {
    const { phone } = req.query as { phone?: string };
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const cleanPhone = normalizePhone(phone);
    const rawDigits = phone.replace(/[^\d]/g, '');

    // Search exact normalized or matching last 10 digits
    let customer = await getRow<any>(
      'SELECT * FROM customers WHERE phone = ? OR phone LIKE ? LIMIT 1',
      [cleanPhone, `%${rawDigits.slice(-10)}`]
    );

    if (!customer) {
      return res.json({ exists: false, customer: null, visits: [] });
    }

    // Retrieve previous visits and payment history
    const visits = await query<any>(
      `SELECT v.*, p.payment_method, p.payment_reference, p.amount as recorded_payment_amount
       FROM customer_visits v
       LEFT JOIN payments p ON p.appointment_id = v.id
       WHERE v.customer_id = ?
       ORDER BY v.visit_date DESC, v.visit_time DESC`,
      [customer.id]
    );

    res.json({
      exists: true,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email,
        total_visits: customer.total_visits,
        total_spent: customer.total_spent,
        loyalty_points: customer.loyalty_points,
        created_at: customer.created_at
      },
      visits
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Record a new customer visit and payment
 */
apiRouter.post('/receptionist/save-visit', async (req: Request, res: Response) => {
  try {
    const {
      customer_name,
      phone,
      services, // Array of { id?: string, name: string, amount: number }
      amount_paid,
      payment_mode, // 'cash' | 'upi' | 'custom_upi_qr'
      appointment_id,
      staff_id,
      staff_name,
      discount = 0,
      notes = '',
      transaction_reference = '',
      receptionist_id = 'receptionist-subhanpura',
      receptionist_name = 'Front Desk Receptionist'
    } = req.body;

    // Validation
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.replace(/[^\d]/g, '').length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'At least one service must be selected or entered' });
    }

    if (amount_paid === undefined || amount_paid === null || isNaN(Number(amount_paid))) {
      return res.status(400).json({ error: 'Amount paid is required' });
    }

    const numericAmountPaid = Number(amount_paid);
    if (numericAmountPaid < 0) {
      return res.status(400).json({ error: 'Amount paid cannot be negative' });
    }

    const validPaymentModes = ['cash', 'upi', 'custom_upi_qr'];
    if (!validPaymentModes.includes(payment_mode)) {
      return res.status(400).json({ error: 'Payment mode must be Cash, UPI, or Custom UPI QR' });
    }

    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');
    const salonId = salon?.id || 'salon-aura-luxe-01';

    // 1. Resolve or create customer profile
    let customer = await getRow<any>(
      'SELECT * FROM customers WHERE phone = ? OR phone LIKE ? LIMIT 1',
      [cleanPhone, `%${cleanPhone.slice(-10)}`]
    );

    let isNewCustomer = false;
    let customerId = '';

    if (!customer) {
      isNewCustomer = true;
      customerId = `cust-${uuidv4().slice(0, 8)}`;
      await run(
        `INSERT INTO customers (id, salon_id, full_name, phone, total_visits, total_spent, loyalty_points, lifetime_points_earned, lifetime_points_redeemed)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0)`,
        [customerId, salonId, customer_name.trim(), cleanPhone]
      );
      customer = await getRow<any>('SELECT * FROM customers WHERE id = ?', [customerId]);
    } else {
      customerId = customer.id;
      // If customer updated their name in the form, maintain it
      if (customer_name.trim() && customer.full_name !== customer_name.trim()) {
        await run('UPDATE customers SET full_name = ? WHERE id = ?', [customer_name.trim(), customerId]);
      }
    }

    // Current backend date & time
    const now = new Date();
    const visitDate = now.toISOString().slice(0, 10);
    const visitTime = now.toTimeString().slice(0, 8);
    const visitId = `vst-${uuidv4().slice(0, 8)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const visitCode = `VIS-${visitDate.replace(/-/g, '')}-${randomSuffix}`;

    // Compute service breakdown
    const servicesSummary = services.map(s => s.name).join(', ');
    const totalServiceCharges = services.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const numericDiscount = Number(discount) || 0;

    let paymentStatus = 'completed';
    if (numericAmountPaid === 0) {
      paymentStatus = 'complimentary';
    } else if (numericAmountPaid < (totalServiceCharges - numericDiscount)) {
      paymentStatus = 'partially_paid';
    }

    // 2. Save customer visit record
    await run(
      `INSERT INTO customer_visits (
        id, visit_code, salon_id, customer_id, appointment_id, staff_id, staff_name,
        services_summary, amount_charged, amount_paid, discount_amount, payment_mode,
        payment_status, transaction_reference, notes, receptionist_id, receptionist_name,
        visit_date, visit_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visitId,
        visitCode,
        salonId,
        customerId,
        appointment_id || null,
        staff_id || null,
        staff_name || null,
        servicesSummary,
        totalServiceCharges,
        numericAmountPaid,
        numericDiscount,
        payment_mode,
        paymentStatus,
        transaction_reference ? transaction_reference.trim() : null,
        notes ? notes.trim() : null,
        receptionist_id,
        receptionist_name,
        visitDate,
        visitTime
      ]
    );

    // 3. Save each service to customer_visit_services
    for (const s of services) {
      await run(
        `INSERT INTO customer_visit_services (id, visit_id, service_id, service_name, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [`vss-${uuidv4().slice(0, 8)}`, visitId, s.id || null, s.name, Number(s.amount) || 0]
      );
    }

    // 4. Save payment record if amount_paid > 0
    let paymentTransactionId = '';
    if (numericAmountPaid > 0) {
      paymentTransactionId = `pay-${uuidv4().slice(0, 8)}`;
      const paymentRef = `PAY-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
      await run(
        `INSERT INTO payments (id, payment_reference, appointment_id, customer_id, amount, payment_method, transaction_reference, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentTransactionId,
          paymentRef,
          visitId, // link to visit
          customerId,
          Math.round(numericAmountPaid),
          payment_mode,
          transaction_reference || null,
          `Receptionist visit entry: ${servicesSummary}`,
          receptionist_name
        ]
      );
    }

    // 5. Update customer's total visits and total spent
    const newTotalVisits = (customer.total_visits || 0) + 1;
    const newTotalSpent = (customer.total_spent || 0) + Math.round(numericAmountPaid);

    // Loyalty points calculation (1 point per 100 INR by default)
    const pointsAwarded = Math.floor(numericAmountPaid / 100);
    const updatedLoyaltyPoints = (customer.loyalty_points || 0) + pointsAwarded;
    const updatedLifetimePoints = (customer.lifetime_points_earned || 0) + pointsAwarded;

    await run(
      `UPDATE customers SET
        total_visits = ?,
        total_spent = ?,
        loyalty_points = ?,
        lifetime_points_earned = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newTotalVisits, newTotalSpent, updatedLoyaltyPoints, updatedLifetimePoints, customerId]
    );

    if (pointsAwarded > 0) {
      await run(
        `INSERT INTO loyalty_transactions (id, customer_id, appointment_id, payment_id, transaction_type, points, previous_balance, new_balance, reason, performed_by)
         VALUES (?, ?, ?, ?, 'earned', ?, ?, ?, ?, ?)`,
        [
          `lt-${uuidv4().slice(0, 8)}`,
          customerId,
          visitId,
          paymentTransactionId || null,
          pointsAwarded,
          customer.loyalty_points || 0,
          updatedLoyaltyPoints,
          `Earned on salon visit ${visitCode}`,
          receptionist_name
        ]
      );
    }

    const savedVisit = await getRow<any>('SELECT * FROM customer_visits WHERE id = ?', [visitId]);
    const updatedCustomer = await getRow<any>('SELECT * FROM customers WHERE id = ?', [customerId]);

    res.status(201).json({
      success: true,
      message: 'Customer visit saved successfully!',
      visit: savedVisit,
      paymentId: paymentTransactionId,
      customer: updatedCustomer,
      isNewCustomer
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Real-time Admin Dashboard receptionist metrics:
 * - Total visits today
 * - Unique customers served today
 * - Total amount collected today
 * - Cash payments today
 * - UPI payments today
 * - Custom UPI QR payments today
 * - Total visits this month
 * - Total collected payments this month
 * - Number of new customers (first visit this month/today)
 * - Number of returning customers
 */
apiRouter.get('/admin/receptionist/today-metrics', async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

    // Today's visits
    const todayVisits = await query<any>(
      'SELECT * FROM customer_visits WHERE visit_date = ?',
      [todayStr]
    );

    const totalVisitsToday = todayVisits.length;
    const uniqueCustomersTodaySet = new Set(todayVisits.map(v => v.customer_id));
    const uniqueCustomersToday = uniqueCustomersTodaySet.size;

    // Payments today (calculated from recorded payments and visits)
    let totalAmountCollectedToday = 0;
    let cashPaymentsToday = 0;
    let upiPaymentsToday = 0;
    let customUpiQrPaymentsToday = 0;

    for (const v of todayVisits) {
      const amt = Number(v.amount_paid) || 0;
      totalAmountCollectedToday += amt;
      if (v.payment_mode === 'cash') cashPaymentsToday += amt;
      else if (v.payment_mode === 'upi') upiPaymentsToday += amt;
      else if (v.payment_mode === 'custom_upi_qr') customUpiQrPaymentsToday += amt;
    }

    // Month's visits
    const monthVisits = await query<any>(
      'SELECT * FROM customer_visits WHERE visit_date LIKE ?',
      [`${currentMonthStr}%`]
    );

    const totalVisitsMonth = monthVisits.length;
    const totalCollectedMonth = monthVisits.reduce((acc, v) => acc + (Number(v.amount_paid) || 0), 0);

    // New vs Returning customers
    // A customer is new if their created_at starts with todayStr (or this month for monthly overview)
    const newCustomersTodayRow = await getRow<any>(
      'SELECT COUNT(*) as cnt FROM customers WHERE created_at LIKE ?',
      [`${todayStr}%`]
    );
    const newCustomersToday = newCustomersTodayRow?.cnt || 0;
    const returningCustomersToday = Math.max(0, uniqueCustomersToday - newCustomersToday);

    const newCustomersMonthRow = await getRow<any>(
      'SELECT COUNT(*) as cnt FROM customers WHERE created_at LIKE ?',
      [`${currentMonthStr}%`]
    );
    const newCustomersMonth = newCustomersMonthRow?.cnt || 0;

    // Recent 10 visits for quick view
    const recentVisits = await query<any>(
      `SELECT v.*, c.full_name as customer_name, c.phone as customer_phone
       FROM customer_visits v
       JOIN customers c ON v.customer_id = c.id
       ORDER BY v.visit_date DESC, v.visit_time DESC LIMIT 10`
    );

    res.json({
      today: {
        date: todayStr,
        totalVisits: totalVisitsToday,
        uniqueCustomers: uniqueCustomersToday,
        totalCollected: totalAmountCollectedToday,
        cashPayments: cashPaymentsToday,
        upiPayments: upiPaymentsToday,
        customUpiQrPayments: customUpiQrPaymentsToday,
        newCustomers: newCustomersToday,
        returningCustomers: returningCustomersToday
      },
      month: {
        month: currentMonthStr,
        totalVisits: totalVisitsMonth,
        totalCollected: totalCollectedMonth,
        newCustomers: newCustomersMonth
      },
      recentVisits
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Monthly Business Report:
 * Select month & year, returns comprehensive aggregated stats and table of records with filters
 */
apiRouter.get('/admin/receptionist/monthly-report', async (req: Request, res: Response) => {
  try {
    const {
      year = new Date().getFullYear().toString(),
      month = String(new Date().getMonth() + 1).padStart(2, '0'),
      search = '',
      payment_mode = 'all',
      start_date,
      end_date,
      sort_by = 'date',
      sort_order = 'DESC',
      page = '1',
      limit = '25'
    } = req.query as Record<string, string>;

    const monthStr = `${year}-${month.padStart(2, '0')}`;

    // Base query for the specified month or date range
    let dateFilterSql = 'v.visit_date LIKE ?';
    let params: any[] = [`${monthStr}%`];

    if (start_date && end_date) {
      dateFilterSql = 'v.visit_date BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    // Overall aggregated metrics for the month/period
    const allPeriodVisits = await query<any>(
      `SELECT v.*, c.full_name as customer_name, c.phone as customer_phone, c.created_at as customer_created_at
       FROM customer_visits v
       JOIN customers c ON v.customer_id = c.id
       WHERE ${dateFilterSql}`,
      params
    );

    const totalVisits = allPeriodVisits.length;
    const uniqueCustomerIds = new Set(allPeriodVisits.map(v => v.customer_id));
    const totalUniqueCustomers = uniqueCustomerIds.size;

    let totalAmountCollected = 0;
    let totalCashCollected = 0;
    let totalUpiCollected = 0;
    let totalCustomUpiQrCollected = 0;
    let totalDiscounts = 0;

    let newCustomersCount = 0;
    const seenCustForNewCount = new Set();

    // Service-wise breakdown
    const serviceCounts: Record<string, { count: number; revenue: number }> = {};
    // Daily collection summary
    const dailyCollections: Record<string, { visits: number; revenue: number; cash: number; upi: number; custom_upi_qr: number }> = {};

    for (const v of allPeriodVisits) {
      const paid = Number(v.amount_paid) || 0;
      const disc = Number(v.discount_amount) || 0;

      totalAmountCollected += paid;
      totalDiscounts += disc;

      if (v.payment_mode === 'cash') totalCashCollected += paid;
      else if (v.payment_mode === 'upi') totalUpiCollected += paid;
      else if (v.payment_mode === 'custom_upi_qr') totalCustomUpiQrCollected += paid;

      // New vs returning: customer created within this month/period
      if (!seenCustForNewCount.has(v.customer_id)) {
        seenCustForNewCount.add(v.customer_id);
        if (v.customer_created_at && v.customer_created_at.startsWith(monthStr)) {
          newCustomersCount++;
        }
      }

      // Daily breakdown
      if (!dailyCollections[v.visit_date]) {
        dailyCollections[v.visit_date] = { visits: 0, revenue: 0, cash: 0, upi: 0, custom_upi_qr: 0 };
      }
      dailyCollections[v.visit_date].visits += 1;
      dailyCollections[v.visit_date].revenue += paid;
      if (v.payment_mode === 'cash') dailyCollections[v.visit_date].cash += paid;
      if (v.payment_mode === 'upi') dailyCollections[v.visit_date].upi += paid;
      if (v.payment_mode === 'custom_upi_qr') dailyCollections[v.visit_date].custom_upi_qr += paid;
    }

    // Query service revenue breakdown from customer_visit_services
    const serviceRevenueRows = await query<any>(
      `SELECT vs.service_name, COUNT(vs.id) as service_count, SUM(vs.amount) as total_revenue
       FROM customer_visit_services vs
       JOIN customer_visits v ON vs.visit_id = v.id
       WHERE ${dateFilterSql}
       GROUP BY vs.service_name
       ORDER BY total_revenue DESC`,
      params
    );

    const returningCustomersCount = Math.max(0, totalUniqueCustomers - newCustomersCount);
    const averagePaymentPerVisit = totalVisits > 0 ? Math.round(totalAmountCollected / totalVisits) : 0;

    // Filtered & Paginated records table
    let filterSql = `WHERE ${dateFilterSql}`;
    const tableParams: any[] = [...params];

    if (search && search.trim()) {
      filterSql += ' AND (c.full_name LIKE ? OR c.phone LIKE ? OR v.visit_code LIKE ?)';
      tableParams.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (payment_mode && payment_mode !== 'all') {
      filterSql += ' AND v.payment_mode = ?';
      tableParams.push(payment_mode);
    }

    // Count matching
    const countRow = await getRow<any>(
      `SELECT COUNT(*) as cnt
       FROM customer_visits v
       JOIN customers c ON v.customer_id = c.id
       ${filterSql}`,
      tableParams
    );
    const filteredCount = countRow?.cnt || 0;

    // Sorting
    let orderClause = 'ORDER BY v.visit_date DESC, v.visit_time DESC';
    if (sort_by === 'amount') {
      orderClause = `ORDER BY v.amount_paid ${sort_order === 'ASC' ? 'ASC' : 'DESC'}`;
    } else if (sort_by === 'date') {
      orderClause = `ORDER BY v.visit_date ${sort_order === 'ASC' ? 'ASC' : 'DESC'}, v.visit_time ${sort_order === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const pagedRecords = await query<any>(
      `SELECT v.*, c.full_name as customer_name, c.phone as customer_phone
       FROM customer_visits v
       JOIN customers c ON v.customer_id = c.id
       ${filterSql}
       ${orderClause}
       LIMIT ${pageSize} OFFSET ${offset}`,
      tableParams
    );

    res.json({
      monthStr,
      metrics: {
        totalVisits,
        totalUniqueCustomers,
        newCustomers: newCustomersCount,
        returningCustomers: returningCustomersCount,
        totalAmountCollected,
        totalCashCollected,
        totalUpiCollected,
        totalCustomUpiQrCollected,
        totalDiscounts,
        averagePaymentPerVisit
      },
      serviceWiseRevenue: serviceRevenueRows,
      dailyCollections: Object.entries(dailyCollections).map(([date, data]) => ({ date, ...data })).sort((a, b) => b.date.localeCompare(a.date)),
      table: {
        records: pagedRecords,
        totalRecords: filteredCount,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(filteredCount / pageSize)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Monthly Business Report CSV export
 */
apiRouter.get('/admin/receptionist/export-csv', async (req: Request, res: Response) => {
  try {
    const {
      year = new Date().getFullYear().toString(),
      month = String(new Date().getMonth() + 1).padStart(2, '0'),
      search = '',
      payment_mode = 'all'
    } = req.query as Record<string, string>;

    const monthStr = `${year}-${month.padStart(2, '0')}`;
    let filterSql = 'WHERE v.visit_date LIKE ?';
    const params: any[] = [`${monthStr}%`];

    if (search && search.trim()) {
      filterSql += ' AND (c.full_name LIKE ? OR c.phone LIKE ? OR v.visit_code LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (payment_mode && payment_mode !== 'all') {
      filterSql += ' AND v.payment_mode = ?';
      params.push(payment_mode);
    }

    const records = await query<any>(
      `SELECT v.*, c.full_name as customer_name, c.phone as customer_phone
       FROM customer_visits v
       JOIN customers c ON v.customer_id = c.id
       ${filterSql}
       ORDER BY v.visit_date DESC, v.visit_time DESC`,
      params
    );

    let csv = 'Visit ID,Date,Time,Customer Name,Phone Number,Services,Amount Charged,Amount Paid,Discount,Payment Mode,Status,Transaction Ref,Receptionist\n';

    for (const r of records) {
      csv += `"${r.visit_code}","${r.visit_date}","${r.visit_time}","${(r.customer_name || '').replace(/"/g, '""')}","${r.customer_phone}","${(r.services_summary || '').replace(/"/g, '""')}",${r.amount_charged},${r.amount_paid},${r.discount_amount},"${r.payment_mode}","${r.payment_status}","${(r.transaction_reference || '').replace(/"/g, '""')}","${(r.receptionist_name || '').replace(/"/g, '""')}"\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`A-One_Monthly_Report_${monthStr}.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// WEBSITE CONTENT MANAGEMENT API
// ====================================================

function safeJson(str: any, fallback: any = {}) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return fallback;
  }
}

async function getFormattedWebsiteConfig() {
  const configRow = await getRow<any>("SELECT * FROM website_config WHERE id = 'main' LIMIT 1");
  if (!configRow) return null;

  return {
    id: configRow.id,
    salon_id: configRow.salon_id,
    status: configRow.status || 'published',
    business_info: safeJson(configRow.business_info, {}),
    hero_section: safeJson(configRow.hero_section, {}),
    about_section: safeJson(configRow.about_section, {}),
    section_order: safeJson(configRow.section_order, [
      'announcements', 'hero', 'offers', 'services', 'about', 'staff', 'gallery', 'testimonials', 'faqs', 'custom_sections', 'contact'
    ]),
    section_visibility: safeJson(configRow.section_visibility, {}),
    contact_section: safeJson(configRow.contact_section, {}),
    booking_settings: safeJson(configRow.booking_settings, {}),
    policies_faq_info: safeJson(configRow.policies_faq_info, {}),
    seo_settings: safeJson(configRow.seo_settings, {}),
    footer_settings: safeJson(configRow.footer_settings, {}),
    updated_at: configRow.updated_at
  };
}

/**
 * Public website content endpoint (only active & published content)
 */
apiRouter.get('/website/content', async (req: Request, res: Response) => {
  try {
    const config = await getFormattedWebsiteConfig();
    const today = new Date().toISOString().slice(0, 10);

    // Announcements that are active and within date range if set
    const announcements = await query<any>(`
      SELECT * FROM website_announcements
      WHERE is_active = 1
        AND (start_date IS NULL OR start_date = '' OR start_date <= '${today}')
        AND (end_date IS NULL OR end_date = '' OR end_date >= '${today}')
      ORDER BY display_order ASC, created_at DESC
    `);

    // Offers that are active and not expired
    const offers = await query<any>(`
      SELECT * FROM website_offers
      WHERE is_active = 1
        AND (end_date IS NULL OR end_date = '' OR end_date >= '${today}')
      ORDER BY display_order ASC, created_at DESC
    `);

    // Active Gallery
    const gallery = await query<any>(`
      SELECT * FROM website_gallery
      WHERE is_active = 1
      ORDER BY display_order ASC, created_at DESC
    `);

    // Active Testimonials
    const testimonials = await query<any>(`
      SELECT * FROM website_testimonials
      WHERE is_active = 1
      ORDER BY display_order ASC, created_at DESC
    `);

    // Active FAQs
    const faqs = await query<any>(`
      SELECT * FROM website_faqs
      WHERE is_active = 1
      ORDER BY display_order ASC, created_at ASC
    `);

    // Active Custom Sections
    const customSections = await query<any>(`
      SELECT * FROM website_custom_sections
      WHERE is_active = 1
      ORDER BY display_order ASC, created_at ASC
    `);

    // Public active Services
    const services = await query<any>(`
      SELECT * FROM services
      WHERE is_active = 1
      ORDER BY display_order ASC, category ASC, name ASC
    `);

    // Public active Staff
    const staff = await query<any>(`
      SELECT id, salon_id, name, role, designation, specialties, bio, avatar_url,
             working_days, start_time, end_time, display_order, is_active
      FROM staff
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `);

    res.json({
      config,
      announcements,
      offers,
      gallery,
      testimonials,
      faqs,
      customSections,
      services,
      staff
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin website content endpoint (all items including hidden/draft)
 */
apiRouter.get('/admin/website/content', async (req: Request, res: Response) => {
  try {
    const config = await getFormattedWebsiteConfig();
    const announcements = await query<any>('SELECT * FROM website_announcements ORDER BY display_order ASC, created_at DESC');
    const offers = await query<any>('SELECT * FROM website_offers ORDER BY display_order ASC, created_at DESC');
    const gallery = await query<any>('SELECT * FROM website_gallery ORDER BY display_order ASC, created_at DESC');
    const testimonials = await query<any>('SELECT * FROM website_testimonials ORDER BY display_order ASC, created_at DESC');
    const faqs = await query<any>('SELECT * FROM website_faqs ORDER BY display_order ASC, created_at ASC');
    const customSections = await query<any>('SELECT * FROM website_custom_sections ORDER BY display_order ASC, created_at ASC');
    const services = await query<any>('SELECT * FROM services ORDER BY display_order ASC, category ASC, name ASC');
    const staff = await query<any>('SELECT * FROM staff ORDER BY display_order ASC, name ASC');

    res.json({
      config,
      announcements,
      offers,
      gallery,
      testimonials,
      faqs,
      customSections,
      services,
      staff
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Save/Update Website Configuration
 */
apiRouter.put('/admin/website/config', async (req: Request, res: Response) => {
  try {
    const {
      business_info, hero_section, about_section, section_order,
      section_visibility, contact_section, booking_settings,
      policies_faq_info, seo_settings, footer_settings, status
    } = req.body;

    const bInfoStr = typeof business_info === 'string' ? business_info : JSON.stringify(business_info || {});
    const heroStr = typeof hero_section === 'string' ? hero_section : JSON.stringify(hero_section || {});
    const aboutStr = typeof about_section === 'string' ? about_section : JSON.stringify(about_section || {});
    const orderStr = typeof section_order === 'string' ? section_order : JSON.stringify(section_order || []);
    const visStr = typeof section_visibility === 'string' ? section_visibility : JSON.stringify(section_visibility || {});
    const contactStr = typeof contact_section === 'string' ? contact_section : JSON.stringify(contact_section || {});
    const bookStr = typeof booking_settings === 'string' ? booking_settings : JSON.stringify(booking_settings || {});
    const polStr = typeof policies_faq_info === 'string' ? policies_faq_info : JSON.stringify(policies_faq_info || {});
    const seoStr = typeof seo_settings === 'string' ? seo_settings : JSON.stringify(seo_settings || {});
    const footerStr = typeof footer_settings === 'string' ? footer_settings : JSON.stringify(footer_settings || {});

    await run(
      `UPDATE website_config SET
        business_info = ?,
        hero_section = ?,
        about_section = ?,
        section_order = ?,
        section_visibility = ?,
        contact_section = ?,
        booking_settings = ?,
        policies_faq_info = ?,
        seo_settings = ?,
        footer_settings = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 'main'`,
      [
        bInfoStr, heroStr, aboutStr, orderStr, visStr, contactStr,
        bookStr, polStr, seoStr, footerStr, status || 'published'
      ]
    );

    // Sync essential business fields back into salons table if updated
    if (business_info && typeof business_info === 'object') {
      const b = business_info;
      await run(
        `UPDATE salons SET
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          website = COALESCE(?, website),
          address = COALESCE(?, address),
          updated_at = CURRENT_TIMESTAMP
         WHERE 1=1`,
        [b.salon_name || null, b.phone || null, b.email || null, b.website_url || null, b.address || null]
      );
    }

    const updated = await getFormattedWebsiteConfig();
    res.json({ success: true, message: 'Website configuration updated successfully!', config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Publish Website changes directly
 */
apiRouter.post('/admin/website/publish', async (req: Request, res: Response) => {
  try {
    await run("UPDATE website_config SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = 'main'");
    const config = await getFormattedWebsiteConfig();
    res.json({ success: true, message: 'All website edits are now published and live!', config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Universal toggle active (Hide / Restore) endpoint
 */
apiRouter.patch('/admin/website/toggle-active/:type/:id', async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const tableMap: Record<string, string> = {
      announcements: 'website_announcements',
      offers: 'website_offers',
      gallery: 'website_gallery',
      testimonials: 'website_testimonials',
      faqs: 'website_faqs',
      custom_sections: 'website_custom_sections',
      services: 'services',
      staff: 'staff'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      return res.status(400).json({ error: `Invalid content type: ${type}` });
    }

    const item = await getRow<any>(`SELECT id, is_active FROM ${tableName} WHERE id = ?`, [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const newActive = item.is_active === 1 ? 0 : 1;
    await run(`UPDATE ${tableName} SET is_active = ? WHERE id = ?`, [newActive, id]);

    res.json({
      success: true,
      id,
      is_active: newActive,
      message: newActive === 1 ? 'Item restored and visible.' : 'Item hidden successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Universal reordering endpoint
 */
apiRouter.post('/admin/website/reorder/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { order } = req.body; // Array of IDs in desired order
    const tableMap: Record<string, string> = {
      announcements: 'website_announcements',
      offers: 'website_offers',
      gallery: 'website_gallery',
      testimonials: 'website_testimonials',
      faqs: 'website_faqs',
      custom_sections: 'website_custom_sections',
      services: 'services',
      staff: 'staff'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      return res.status(400).json({ error: `Invalid content type: ${type}` });
    }

    if (Array.isArray(order)) {
      for (let i = 0; i < order.length; i++) {
        await run(`UPDATE ${tableName} SET display_order = ? WHERE id = ?`, [i, order[i]]);
      }
    }

    res.json({ success: true, message: 'Display order updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Announcements
apiRouter.post('/admin/website/announcements', async (req: Request, res: Response) => {
  try {
    const { title, message, link_url, link_text, badge_text, display_position, start_date, end_date, is_active } = req.body;
    const id = `ann-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_announcements (
        id, salon_id, title, message, link_url, link_text, badge_text,
        display_position, start_date, end_date, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        title, message, link_url || '', link_text || '', badge_text || '',
        display_position || 'top_banner', start_date || null, end_date || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_announcements WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/announcements/:id', async (req: Request, res: Response) => {
  try {
    const { title, message, link_url, link_text, badge_text, display_position, start_date, end_date, is_active, display_order } = req.body;
    await run(
      `UPDATE website_announcements SET
        title = ?, message = ?, link_url = ?, link_text = ?, badge_text = ?,
        display_position = ?, start_date = ?, end_date = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        title, message, link_url || '', link_text || '', badge_text || '',
        display_position || 'top_banner', start_date || null, end_date || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM website_announcements WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/announcements/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Offers
apiRouter.post('/admin/website/offers', async (req: Request, res: Response) => {
  try {
    const {
      title, description, image_url, original_price, discounted_price,
      discount_percentage, start_date, end_date, terms_conditions,
      action_type, service_id, is_featured, is_active
    } = req.body;
    const id = `off-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_offers (
        id, salon_id, title, description, image_url, original_price,
        discounted_price, discount_percentage, start_date, end_date,
        terms_conditions, action_type, service_id, is_featured, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        title, description || '', image_url || '',
        original_price ? Number(original_price) : 0,
        discounted_price ? Number(discounted_price) : 0,
        discount_percentage ? Number(discount_percentage) : 0,
        start_date || null, end_date || null,
        terms_conditions || '', action_type || 'book', service_id || null,
        is_featured ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_offers WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/offers/:id', async (req: Request, res: Response) => {
  try {
    const {
      title, description, image_url, original_price, discounted_price,
      discount_percentage, start_date, end_date, terms_conditions,
      action_type, service_id, is_featured, is_active, display_order
    } = req.body;

    await run(
      `UPDATE website_offers SET
        title = ?, description = ?, image_url = ?, original_price = ?,
        discounted_price = ?, discount_percentage = ?, start_date = ?, end_date = ?,
        terms_conditions = ?, action_type = ?, service_id = ?,
        is_featured = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        title, description || '', image_url || '',
        original_price ? Number(original_price) : 0,
        discounted_price ? Number(discounted_price) : 0,
        discount_percentage ? Number(discount_percentage) : 0,
        start_date || null, end_date || null,
        terms_conditions || '', action_type || 'book', service_id || null,
        is_featured ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );

    const updated = await getRow('SELECT * FROM website_offers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/offers/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_offers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Offer deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Gallery
apiRouter.post('/admin/website/gallery', async (req: Request, res: Response) => {
  try {
    const { title, description, media_type, media_url, category, is_featured, is_active } = req.body;
    const id = `gal-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_gallery (
        id, salon_id, title, description, media_type, media_url,
        category, is_featured, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        title, description || '', media_type || 'image', media_url,
        category || 'Hair Styling', is_featured ? 1 : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_gallery WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/gallery/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, media_type, media_url, category, is_featured, is_active, display_order } = req.body;
    await run(
      `UPDATE website_gallery SET
        title = ?, description = ?, media_type = ?, media_url = ?,
        category = ?, is_featured = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        title, description || '', media_type || 'image', media_url,
        category || 'Hair Styling', is_featured ? 1 : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM website_gallery WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/gallery/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_gallery WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Gallery item deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Testimonials
apiRouter.post('/admin/website/testimonials', async (req: Request, res: Response) => {
  try {
    const { customer_name, avatar_url, rating, review_text, source, service_taken, review_date, has_permission, is_featured, is_active } = req.body;
    const id = `test-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_testimonials (
        id, salon_id, customer_name, avatar_url, rating, review_text,
        source, service_taken, review_date, has_permission, is_featured, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        customer_name, avatar_url || '', rating ? Number(rating) : 5, review_text,
        source || 'Google Review', service_taken || '', review_date || new Date().toISOString().slice(0, 10),
        has_permission !== undefined ? (has_permission ? 1 : 0) : 1,
        is_featured !== undefined ? (is_featured ? 1 : 0) : 1,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_testimonials WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/testimonials/:id', async (req: Request, res: Response) => {
  try {
    const { customer_name, avatar_url, rating, review_text, source, service_taken, review_date, has_permission, is_featured, is_active, display_order } = req.body;
    await run(
      `UPDATE website_testimonials SET
        customer_name = ?, avatar_url = ?, rating = ?, review_text = ?,
        source = ?, service_taken = ?, review_date = ?, has_permission = ?,
        is_featured = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        customer_name, avatar_url || '', rating ? Number(rating) : 5, review_text,
        source || 'Google Review', service_taken || '', review_date || '',
        has_permission !== undefined ? (has_permission ? 1 : 0) : 1,
        is_featured !== undefined ? (is_featured ? 1 : 0) : 1,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM website_testimonials WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/testimonials/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_testimonials WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Testimonial deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: FAQs
apiRouter.post('/admin/website/faqs', async (req: Request, res: Response) => {
  try {
    const { category, question, answer, is_active } = req.body;
    const id = `faq-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_faqs (
        id, salon_id, category, question, answer, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        category || 'General', question, answer,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_faqs WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/faqs/:id', async (req: Request, res: Response) => {
  try {
    const { category, question, answer, is_active, display_order } = req.body;
    await run(
      `UPDATE website_faqs SET
        category = ?, question = ?, answer = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        category || 'General', question, answer,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM website_faqs WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/faqs/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_faqs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'FAQ deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Custom Sections
apiRouter.post('/admin/website/custom-sections', async (req: Request, res: Response) => {
  try {
    const { title, subtitle, description, layout_type, image_url, button_text, button_link, badge_text, is_active } = req.body;
    const id = `sec-${uuidv4().slice(0, 8)}`;
    const salon = await getRow<any>('SELECT id FROM salons LIMIT 1');

    await run(
      `INSERT INTO website_custom_sections (
        id, salon_id, title, subtitle, description, layout_type,
        image_url, button_text, button_link, badge_text, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, salon?.id || 'salon-a-one-subhanpura',
        title, subtitle || '', description, layout_type || 'card_grid',
        image_url || '', button_text || '', button_link || '', badge_text || '',
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const created = await getRow('SELECT * FROM website_custom_sections WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/website/custom-sections/:id', async (req: Request, res: Response) => {
  try {
    const { title, subtitle, description, layout_type, image_url, button_text, button_link, badge_text, is_active, display_order } = req.body;
    await run(
      `UPDATE website_custom_sections SET
        title = ?, subtitle = ?, description = ?, layout_type = ?,
        image_url = ?, button_text = ?, button_link = ?, badge_text = ?,
        is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        title, subtitle || '', description, layout_type || 'card_grid',
        image_url || '', button_text || '', button_link || '', badge_text || '',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        display_order !== undefined ? Number(display_order) : 0,
        req.params.id
      ]
    );
    const updated = await getRow('SELECT * FROM website_custom_sections WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/website/custom-sections/:id', async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM website_custom_sections WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Custom section deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

