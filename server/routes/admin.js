/* =============================================
   VEDA - Admin Routes (Full CRUD)
   ============================================= */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { translateObject } from '../utils/translator.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ============= DASHBOARD STATS =============
router.get('/dashboard', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalConditions = db.prepare('SELECT COUNT(*) as count FROM conditions WHERE is_active = 1').get().count;
    const totalSymptoms = db.prepare('SELECT COUNT(*) as count FROM symptoms WHERE is_active = 1').get().count;
    const totalMedicines = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE is_active = 1').get().count;
    const totalDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE is_active = 1').get().count;
    const totalConsultations = db.prepare('SELECT COUNT(*) as count FROM consultations').get().count;
    const pendingConsultations = db.prepare("SELECT COUNT(*) as count FROM consultations WHERE status = 'pending'").get().count;
    const totalChecks = db.prepare('SELECT COUNT(*) as count FROM symptom_history').get().count;

    // Recent analytics
    const recentEvents = db.prepare(`
      SELECT event_type, COUNT(*) as count 
      FROM analytics 
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY event_type
    `).all();

    // Recent users
    const recentUsers = db.prepare(`
      SELECT id, name, email, role, subscription_plan, created_at 
      FROM users ORDER BY created_at DESC LIMIT 10
    `).all();

    // Subscription breakdown
    const subscriptionStats = db.prepare(`
      SELECT subscription_plan, COUNT(*) as count FROM users GROUP BY subscription_plan
    `).all();

    res.json({
      stats: {
        totalUsers,
        totalConditions,
        totalSymptoms,
        totalMedicines,
        totalDoctors,
        totalConsultations,
        pendingConsultations,
        totalChecks,
      },
      recentEvents,
      recentUsers,
      subscriptionStats,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= CONDITIONS CRUD =============
router.get('/conditions', (req, res) => {
  const conditions = db.prepare('SELECT * FROM conditions ORDER BY created_at DESC').all();
  // Parse JSON fields
  const parsed = conditions.map(c => ({
    ...c,
    primary_care: c.primary_care ? JSON.parse(c.primary_care) : [],
    when_to_see_doctor: c.when_to_see_doctor ? JSON.parse(c.when_to_see_doctor) : [],
    prevention_tips: c.prevention_tips ? JSON.parse(c.prevention_tips) : [],
    match_symptoms: c.match_symptoms ? JSON.parse(c.match_symptoms) : [],
  }));
  res.json({ conditions: parsed });
});

router.post('/conditions', async (req, res) => {
  try {
    const { name, severity, category, description, primary_care, when_to_see_doctor, prevention_tips, match_symptoms, min_match } = req.body;

    const id = req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    // Dynamically translate all textual fields
    const translatedFields = await translateObject({
      name,
      description,
      primary_care: Array.isArray(primary_care) ? primary_care.join('|') : primary_care,
      when_to_see_doctor: Array.isArray(when_to_see_doctor) ? when_to_see_doctor.join('|') : when_to_see_doctor,
      prevention_tips: Array.isArray(prevention_tips) ? prevention_tips.join('|') : prevention_tips
    });

    db.prepare(`
      INSERT INTO conditions (id, name, severity, category, description, primary_care, when_to_see_doctor, prevention_tips, match_symptoms, min_match, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, severity || 'mild', category, description,
      JSON.stringify(primary_care || []),
      JSON.stringify(when_to_see_doctor || []),
      JSON.stringify(prevention_tips || []),
      JSON.stringify(match_symptoms || []), min_match || 2,
      JSON.stringify(translatedFields)
    );

    res.status(201).json({ message: 'Condition created & translated', id });
  } catch (err) {
    console.error('Create condition error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/conditions/:id', (req, res) => {
  try {
    const { name, name_bn, name_hi, severity, category, description, description_bn, description_hi,
      primary_care, primary_care_bn, primary_care_hi, when_to_see_doctor, when_to_see_doctor_bn, when_to_see_doctor_hi,
      prevention_tips, prevention_tips_bn, prevention_tips_hi, match_symptoms, min_match, is_active } = req.body;

    db.prepare(`
      UPDATE conditions SET 
        name = COALESCE(?, name), name_bn = COALESCE(?, name_bn), name_hi = COALESCE(?, name_hi),
        severity = COALESCE(?, severity), category = COALESCE(?, category),
        description = COALESCE(?, description), description_bn = COALESCE(?, description_bn), description_hi = COALESCE(?, description_hi),
        primary_care = COALESCE(?, primary_care), primary_care_bn = COALESCE(?, primary_care_bn), primary_care_hi = COALESCE(?, primary_care_hi),
        when_to_see_doctor = COALESCE(?, when_to_see_doctor), when_to_see_doctor_bn = COALESCE(?, when_to_see_doctor_bn), when_to_see_doctor_hi = COALESCE(?, when_to_see_doctor_hi),
        prevention_tips = COALESCE(?, prevention_tips), prevention_tips_bn = COALESCE(?, prevention_tips_bn), prevention_tips_hi = COALESCE(?, prevention_tips_hi),
        match_symptoms = COALESCE(?, match_symptoms), min_match = COALESCE(?, min_match),
        is_active = COALESCE(?, is_active), updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name, name_bn, name_hi, severity, category,
      description, description_bn, description_hi,
      primary_care ? JSON.stringify(primary_care) : null, primary_care_bn ? JSON.stringify(primary_care_bn) : null, primary_care_hi ? JSON.stringify(primary_care_hi) : null,
      when_to_see_doctor ? JSON.stringify(when_to_see_doctor) : null, when_to_see_doctor_bn ? JSON.stringify(when_to_see_doctor_bn) : null, when_to_see_doctor_hi ? JSON.stringify(when_to_see_doctor_hi) : null,
      prevention_tips ? JSON.stringify(prevention_tips) : null, prevention_tips_bn ? JSON.stringify(prevention_tips_bn) : null, prevention_tips_hi ? JSON.stringify(prevention_tips_hi) : null,
      match_symptoms ? JSON.stringify(match_symptoms) : null, min_match, is_active, req.params.id
    );

    res.json({ message: 'Condition updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conditions/:id', (req, res) => {
  db.prepare('UPDATE conditions SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Condition deactivated' });
});

// ============= SYMPTOMS CRUD =============
router.get('/symptoms', (req, res) => {
  const symptoms = db.prepare('SELECT * FROM symptoms ORDER BY created_at DESC').all();
  res.json({ symptoms });
});

router.post('/symptoms', async (req, res) => {
  try {
    const { id, label, category, icon, body_region, is_emergency } = req.body;
    const symptomId = id || label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Dynamically translate the symptom label
    const translatedFields = await translateObject({ label });

    db.prepare(`
      INSERT INTO symptoms (id, label, category, icon, body_region, is_emergency, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(symptomId, label, category, icon, body_region, is_emergency ? 1 : 0, JSON.stringify(translatedFields));

    res.status(201).json({ message: 'Symptom created & translated', id: symptomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/symptoms/:id', (req, res) => {
  const { label, label_bn, label_hi, category, icon, body_region, is_emergency, is_active } = req.body;
  db.prepare(`
    UPDATE symptoms SET label = COALESCE(?, label), label_bn = COALESCE(?, label_bn), label_hi = COALESCE(?, label_hi),
    category = COALESCE(?, category), icon = COALESCE(?, icon), body_region = COALESCE(?, body_region),
    is_emergency = COALESCE(?, is_emergency), is_active = COALESCE(?, is_active) WHERE id = ?
  `).run(label, label_bn, label_hi, category, icon, body_region, is_emergency, is_active, req.params.id);
  res.json({ message: 'Symptom updated' });
});

router.delete('/symptoms/:id', (req, res) => {
  db.prepare('UPDATE symptoms SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Symptom deactivated' });
});

// ============= MEDICINES CRUD =============
router.get('/medicines', (req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY created_at DESC').all();
  res.json({ medicines });
});

router.post('/medicines', async (req, res) => {
  try {
    const { name, generic_name, category, dosage_adults, dosage_children,
      side_effects, contraindications, description, is_otc } = req.body;
    const id = uuidv4();

    // Dynamically translate medicine details
    const translatedFields = await translateObject({
      name,
      generic_name,
      dosage_adults,
      dosage_children,
      side_effects,
      contraindications,
      description
    });

    db.prepare(`
      INSERT INTO medicines (id, name, generic_name, category, dosage_adults, dosage_children,
        side_effects, contraindications, description, translations, is_otc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, generic_name, category, dosage_adults, dosage_children,
      side_effects, contraindications, description, JSON.stringify(translatedFields), is_otc ? 1 : 0);

    res.status(201).json({ message: 'Medicine created & translated', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/medicines/:id', (req, res) => {
  const { name, generic_name, category, dosage_adults, dosage_children,
    side_effects, contraindications, description, description_bn, description_hi, is_otc, is_active } = req.body;
  db.prepare(`
    UPDATE medicines SET name = COALESCE(?, name), generic_name = COALESCE(?, generic_name),
    category = COALESCE(?, category), dosage_adults = COALESCE(?, dosage_adults), dosage_children = COALESCE(?, dosage_children),
    side_effects = COALESCE(?, side_effects), contraindications = COALESCE(?, contraindications),
    description = COALESCE(?, description), description_bn = COALESCE(?, description_bn), description_hi = COALESCE(?, description_hi),
    is_otc = COALESCE(?, is_otc), is_active = COALESCE(?, is_active) WHERE id = ?
  `).run(name, generic_name, category, dosage_adults, dosage_children,
    side_effects, contraindications, description, description_bn, description_hi, is_otc, is_active, req.params.id);
  res.json({ message: 'Medicine updated' });
});

router.delete('/medicines/:id', (req, res) => {
  db.prepare('UPDATE medicines SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Medicine deactivated' });
});

// ============= DOCTORS MANAGEMENT =============
router.get('/doctors', (req, res) => {
  const doctors = db.prepare(`
    SELECT d.*, u.email, u.name as user_name FROM doctors d 
    LEFT JOIN users u ON d.user_id = u.id 
    ORDER BY d.created_at DESC
  `).all();
  res.json({ doctors });
});

router.post('/doctors', (req, res) => {
  try {
    const { email, password, name, specialization, qualification, experience_years, bio, consultation_fee,
      available_days, available_hours } = req.body;

    // Create user account for doctor
    const userId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password || 'Doctor@123', 10);
    db.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, 'doctor')
    `).run(userId, email, hashedPassword, name);

    // Create doctor profile
    const doctorId = uuidv4();
    db.prepare(`
      INSERT INTO doctors (id, user_id, name, specialization, qualification, experience_years, bio,
        consultation_fee, available_days, available_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(doctorId, userId, name, specialization, qualification, experience_years, bio,
      consultation_fee || 0, available_days, available_hours);

    res.status(201).json({ message: 'Doctor created', id: doctorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/doctors/:id', (req, res) => {
  const { name, specialization, qualification, experience_years, bio, consultation_fee,
    available_days, available_hours, is_active } = req.body;
  db.prepare(`
    UPDATE doctors SET name = COALESCE(?, name), specialization = COALESCE(?, specialization),
    qualification = COALESCE(?, qualification), experience_years = COALESCE(?, experience_years),
    bio = COALESCE(?, bio), consultation_fee = COALESCE(?, consultation_fee),
    available_days = COALESCE(?, available_days), available_hours = COALESCE(?, available_hours),
    is_active = COALESCE(?, is_active) WHERE id = ?
  `).run(name, specialization, qualification, experience_years, bio, consultation_fee,
    available_days, available_hours, is_active, req.params.id);
  res.json({ message: 'Doctor updated' });
});

// ============= USERS MANAGEMENT =============
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, phone, role, language, subscription_plan, subscription_expiry, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json({ users });
});

router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'User role updated' });
});

// ============= CONSULTATIONS MANAGEMENT =============
router.get('/consultations', (req, res) => {
  const consultations = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, d.name as doctor_name, d.specialization
    FROM consultations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN doctors d ON c.doctor_id = d.id
    ORDER BY c.created_at DESC
  `).all();
  res.json({ consultations });
});

router.put('/consultations/:id/status', (req, res) => {
  const { status, meeting_link } = req.body;
  db.prepare(`
    UPDATE consultations SET status = ?, meeting_link = COALESCE(?, meeting_link), updated_at = datetime('now')
    WHERE id = ?
  `).run(status, meeting_link, req.params.id);
  res.json({ message: 'Consultation updated' });
});

// ============= ANALYTICS =============
router.get('/analytics', (req, res) => {
  const { days = 30 } = req.query;

  const eventCounts = db.prepare(`
    SELECT event_type, COUNT(*) as count, DATE(created_at) as date
    FROM analytics
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY event_type, DATE(created_at)
    ORDER BY date DESC
  `).all(days);

  const topSymptoms = db.prepare(`
    SELECT symptoms, COUNT(*) as count FROM symptom_history
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY symptoms ORDER BY count DESC LIMIT 20
  `).all(days);

  const dailyUsers = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count FROM users
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all(days);

  res.json({ eventCounts, topSymptoms, dailyUsers });
});

// ============= FIRST AID CRUD =============
router.get('/first-aid', (req, res) => {
  const guides = db.prepare('SELECT * FROM first_aid_guides ORDER BY created_at DESC').all();
  const parsed = guides.map(g => ({
    ...g,
    steps: g.steps ? JSON.parse(g.steps) : [],
    steps_bn: g.steps_bn ? JSON.parse(g.steps_bn) : [],
    steps_hi: g.steps_hi ? JSON.parse(g.steps_hi) : [],
  }));
  res.json({ guides: parsed });
});

router.post('/first-aid', async (req, res) => {
  try {
    const { title, icon, urgency, steps } = req.body;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Dynamically translate title and steps
    const translatedFields = await translateObject({
      title,
      steps: Array.isArray(steps) ? steps.join('|') : steps
    });

    db.prepare(`
      INSERT INTO first_aid_guides (id, title, icon, urgency, steps, translations)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, icon, urgency,
      JSON.stringify(steps || []), JSON.stringify(translatedFields));

    res.status(201).json({ message: 'First aid guide created & translated', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/first-aid/:id', (req, res) => {
  const { title, title_bn, title_hi, icon, urgency, steps, steps_bn, steps_hi, is_active } = req.body;
  db.prepare(`
    UPDATE first_aid_guides SET title = COALESCE(?, title), title_bn = COALESCE(?, title_bn), title_hi = COALESCE(?, title_hi),
    icon = COALESCE(?, icon), urgency = COALESCE(?, urgency),
    steps = COALESCE(?, steps), steps_bn = COALESCE(?, steps_bn), steps_hi = COALESCE(?, steps_hi),
    is_active = COALESCE(?, is_active) WHERE id = ?
  `).run(title, title_bn, title_hi, icon, urgency,
    steps ? JSON.stringify(steps) : null, steps_bn ? JSON.stringify(steps_bn) : null, steps_hi ? JSON.stringify(steps_hi) : null,
    is_active, req.params.id);
  res.json({ message: 'Guide updated' });
});

export default router;
