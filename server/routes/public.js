/* =============================================
   VEDA - Public API Routes (Symptom Check, etc.)
   ============================================= */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/public/conditions - Get all active conditions
router.get('/conditions', (req, res) => {
  const conditions = db.prepare('SELECT * FROM conditions WHERE is_active = 1').all();
  const parsed = conditions.map(c => ({
    ...c,
    primary_care: c.primary_care ? JSON.parse(c.primary_care) : [],
    when_to_see_doctor: c.when_to_see_doctor ? JSON.parse(c.when_to_see_doctor) : [],
    prevention_tips: c.prevention_tips ? JSON.parse(c.prevention_tips) : [],
    match_symptoms: c.match_symptoms ? JSON.parse(c.match_symptoms) : [],
  }));
  res.json({ conditions: parsed });
});

// GET /api/public/protocols - Get all prescription treatment protocols
router.get('/protocols', (req, res) => {
  const { condition, age_group } = req.query;
  let query = 'SELECT * FROM treatment_protocols WHERE 1=1';
  const params = [];
  if (condition) {
    query += ' AND (condition_en LIKE ? OR condition_bn LIKE ?)';
    params.push(`%${condition}%`, `%${condition}%`);
  }
  if (age_group) {
    query += ' AND age_group = ?';
    params.push(age_group);
  }
  query += ' ORDER BY photo_num ASC';
  const protocols = db.prepare(query).all(...params);
  const parsed = protocols.map(p => ({
    ...p,
    medicines: JSON.parse(p.medicines_json)
  }));
  res.json({ protocols: parsed });
});

// GET /api/public/symptoms - Get all active symptoms
router.get('/symptoms', (req, res) => {
  const symptoms = db.prepare('SELECT * FROM symptoms WHERE is_active = 1').all();
  res.json({ symptoms });
});

// GET /api/public/first-aid - Get all first aid guides
router.get('/first-aid', (req, res) => {
  const guides = db.prepare('SELECT * FROM first_aid_guides WHERE is_active = 1').all();
  const parsed = guides.map(g => ({
    ...g,
    steps: g.steps ? JSON.parse(g.steps) : [],
    steps_bn: g.steps_bn ? JSON.parse(g.steps_bn) : [],
    steps_hi: g.steps_hi ? JSON.parse(g.steps_hi) : [],
  }));
  res.json({ guides: parsed });
});

// POST /api/public/symptom-check - Log a symptom check (anonymous or authenticated)
router.post('/symptom-check', optionalAuthenticate, (req, res) => {
  try {
    const { symptoms, matched_conditions, follow_up_answers, session_id } = req.body;
    const id = uuidv4();
    const userId = req.user?.id || null;

    db.prepare(`
      INSERT INTO symptom_history (id, user_id, session_id, symptoms, matched_conditions, follow_up_answers)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, session_id || uuidv4(), JSON.stringify(symptoms), JSON.stringify(matched_conditions), JSON.stringify(follow_up_answers));

    // Track analytics
    db.prepare('INSERT INTO analytics (event_type, event_data, session_id) VALUES (?, ?, ?)').run(
      'symptom_check', JSON.stringify({ symptom_count: symptoms?.length }), session_id
    );

    res.json({ message: 'Check logged', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/doctors - List available doctors
router.get('/doctors', (req, res) => {
  const doctors = db.prepare(`
    SELECT id, name, specialization, qualification, experience_years, bio, 
    consultation_fee, available_days, available_hours, rating, total_consultations
    FROM doctors WHERE is_active = 1
  `).all();
  res.json({ doctors });
});

// GET /api/public/subscription-plans
router.get('/subscription-plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1').all();
  const parsed = plans.map(p => ({ ...p, features: JSON.parse(p.features) }));
  res.json({ plans: parsed });
});

// POST /api/public/analytics - Track frontend event
router.post('/analytics', (req, res) => {
  try {
    const { event_type, event_data, session_id } = req.body;
    db.prepare('INSERT INTO analytics (event_type, event_data, session_id) VALUES (?, ?, ?)').run(
      event_type, JSON.stringify(event_data), session_id
    );
    res.json({ message: 'Event tracked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= CONSULTATION ROUTES (Authenticated) =============

// POST /api/public/consultations - Book a consultation
router.post('/consultations', authenticate, (req, res) => {
  try {
    const { doctor_id, scheduled_at, notes } = req.body;

    // Check subscription
    const user = db.prepare('SELECT subscription_plan FROM users WHERE id = ?').get(req.user.id);
    if (user.subscription_plan === 'free') {
      return res.status(403).json({ error: 'Upgrade to Basic or Premium plan to book consultations' });
    }

    const id = uuidv4();
    const meetingLink = `https://meet.jit.si/veda-${id.substring(0, 12)}`;

    db.prepare(`
      INSERT INTO consultations (id, user_id, doctor_id, scheduled_at, notes, meeting_link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, doctor_id, scheduled_at, notes, meetingLink);

    // Track
    db.prepare('INSERT INTO analytics (event_type, event_data, user_id) VALUES (?, ?, ?)').run(
      'consultation_booked', JSON.stringify({ doctor_id }), req.user.id
    );

    res.status(201).json({ message: 'Consultation booked', id, meetingLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/consultations/my - Get user's consultations
router.get('/consultations/my', authenticate, (req, res) => {
  const consultations = db.prepare(`
    SELECT c.*, d.name as doctor_name, d.specialization
    FROM consultations c
    LEFT JOIN doctors d ON c.doctor_id = d.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json({ consultations });
});

// GET /api/public/history - Get user's symptom check history
router.get('/history', authenticate, (req, res) => {
  const history = db.prepare(`
    SELECT * FROM symptom_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const parsed = history.map(h => ({
    ...h,
    symptoms: JSON.parse(h.symptoms || '[]'),
    matched_conditions: JSON.parse(h.matched_conditions || '[]'),
    follow_up_answers: JSON.parse(h.follow_up_answers || '{}'),
  }));
  res.json({ history: parsed });
});

export default router;
