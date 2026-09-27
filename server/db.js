/* =============================================
   VEDA - Database Setup (SQLite)
   ============================================= */
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'veda.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Add age_group and 2FA columns if not present (safe migration)
try { db.exec("ALTER TABLE users ADD COLUMN age_group TEXT"); } catch { /* Column already exists. */ }
try { db.exec("ALTER TABLE users ADD COLUMN two_factor_phone INTEGER DEFAULT 0"); } catch { /* Column already exists. */ }
try { db.exec("ALTER TABLE users ADD COLUMN two_factor_totp INTEGER DEFAULT 0"); } catch { /* Column already exists. */ }
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT"); } catch { /* Column already exists. */ }

// --- Create Tables ---
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'doctor')),
    language TEXT DEFAULT 'en',
    subscription_plan TEXT DEFAULT 'free' CHECK(subscription_plan IN ('free', 'basic', 'premium')),
    subscription_expiry TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Conditions/Diseases table
  CREATE TABLE IF NOT EXISTS conditions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_bn TEXT,
    name_hi TEXT,
    severity TEXT DEFAULT 'mild' CHECK(severity IN ('mild', 'moderate', 'severe', 'critical')),
    category TEXT,
    description TEXT,
    description_bn TEXT,
    description_hi TEXT,
    primary_care TEXT,
    primary_care_bn TEXT,
    primary_care_hi TEXT,
    when_to_see_doctor TEXT,
    when_to_see_doctor_bn TEXT,
    when_to_see_doctor_hi TEXT,
    prevention_tips TEXT,
    prevention_tips_bn TEXT,
    prevention_tips_hi TEXT,
    match_symptoms TEXT,
    min_match INTEGER DEFAULT 2,
    translations TEXT, -- stores JSON of all 12 languages
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Symptoms table
  CREATE TABLE IF NOT EXISTS symptoms (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    label_bn TEXT,
    label_hi TEXT,
    category TEXT,
    icon TEXT,
    body_region TEXT,
    is_emergency INTEGER DEFAULT 0,
    translations TEXT, -- stores JSON of all 12 languages
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Medicines table
  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT,
    dosage_adults TEXT,
    dosage_children TEXT,
    side_effects TEXT,
    contraindications TEXT,
    description TEXT,
    description_bn TEXT,
    description_hi TEXT,
    translations TEXT, -- stores JSON of all 12 languages
    is_otc INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Condition-Medicine mapping
  CREATE TABLE IF NOT EXISTS condition_medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condition_id TEXT REFERENCES conditions(id),
    medicine_id TEXT REFERENCES medicines(id),
    usage_notes TEXT,
    UNIQUE(condition_id, medicine_id)
  );

  -- Doctors table
  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    specialization TEXT,
    qualification TEXT,
    experience_years INTEGER,
    bio TEXT,
    consultation_fee REAL DEFAULT 0,
    available_days TEXT,
    available_hours TEXT,
    rating REAL DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Consultations/Appointments table
  CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    doctor_id TEXT REFERENCES doctors(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    scheduled_at TEXT,
    duration_minutes INTEGER DEFAULT 15,
    notes TEXT,
    prescription TEXT,
    meeting_link TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Symptom check history
  CREATE TABLE IF NOT EXISTS symptom_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    symptoms TEXT,
    matched_conditions TEXT,
    follow_up_answers TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Analytics events
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    user_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Subscription plans
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    duration_days INTEGER,
    features TEXT,
    is_active INTEGER DEFAULT 1
  );

  -- First Aid guides
  CREATE TABLE IF NOT EXISTS first_aid_guides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_bn TEXT,
    title_hi TEXT,
    icon TEXT,
    urgency TEXT DEFAULT 'moderate',
    steps TEXT,
    steps_bn TEXT,
    steps_hi TEXT,
    translations TEXT, -- stores JSON of all 12 languages
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Treatment Protocols from Prescription Notebook
  CREATE TABLE IF NOT EXISTS treatment_protocols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_num INTEGER NOT NULL,
    photo_name TEXT NOT NULL,
    condition_bn TEXT NOT NULL,
    condition_en TEXT NOT NULL,
    age_group TEXT NOT NULL,
    protocol_variant TEXT,
    medicines_json TEXT NOT NULL,
    general_instructions TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Normalized Protocol Medicines
  CREATE TABLE IF NOT EXISTS protocol_medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER REFERENCES treatment_protocols(id) ON DELETE CASCADE,
    photo_num INTEGER NOT NULL,
    photo_name TEXT NOT NULL,
    condition_bn TEXT NOT NULL,
    condition_en TEXT NOT NULL,
    age_group TEXT NOT NULL,
    form TEXT NOT NULL,
    name TEXT NOT NULL,
    strength TEXT,
    dosage TEXT NOT NULL,
    duration TEXT,
    instructions TEXT,
    is_sos INTEGER DEFAULT 0
  );
`);

// --- Seed Default Admin ---
function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vedahome.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('⚠️  ADMIN_PASSWORD not set in .env — skipping admin seed. Set it to create the admin account.');
    return;
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin-001', adminEmail, hashedPassword, 'Veda Admin', 'admin');
    console.log('✅ Default admin created:', adminEmail);
  }
}

// --- Seed Subscription Plans ---
function seedPlans() {
  const plans = [
    { id: 'free', name: 'Free', price: 0, duration_days: 36500, features: JSON.stringify(['planFeat_symptomChecker', 'planFeat_firstAid', 'planFeat_bodyMap', 'planFeat_3langs']) },
    { id: 'basic', name: 'Basic', price: 4.99, duration_days: 30, features: JSON.stringify(['planFeat_everythingFree', 'planFeat_5consults', 'planFeat_medicineDB', 'planFeat_allLangs', 'planFeat_history']) },
    { id: 'premium', name: 'Premium', price: 14.99, duration_days: 30, features: JSON.stringify(['planFeat_everythingBasic', 'planFeat_unlimited', 'planFeat_priority', 'planFeat_family', 'planFeat_offline', 'planFeat_aiReports']) },
  ];

  const upsert = db.prepare(`
    INSERT INTO subscription_plans (id, name, price, duration_days, features)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET features = excluded.features
  `);
  plans.forEach(p => upsert.run(p.id, p.name, p.price, p.duration_days, p.features));
}

seedAdmin();
seedPlans();

export default db;
