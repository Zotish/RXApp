import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), "veda.db")
json_path = os.path.join(os.path.dirname(__file__), "notebook_prescriptions.json")

with open(json_path, "r", encoding="utf-8") as f:
    protocols = json.load(f)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enable WAL mode and foreign keys
cursor.execute("PRAGMA journal_mode = WAL;")
cursor.execute("PRAGMA foreign_keys = ON;")

# Baseline tables matching server/db.js
cursor.executescript("""
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
    age_group TEXT,
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
    translations TEXT,
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
    translations TEXT,
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
    translations TEXT,
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
    translations TEXT,
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
""")

# Clear any previous treatment protocols to make sure no duplicate or obsolete data exists
cursor.execute("DELETE FROM protocol_medicines;")
cursor.execute("DELETE FROM treatment_protocols;")

# Insert protocols
total_medicines = 0
for proto in protocols:
    cursor.execute("""
        INSERT INTO treatment_protocols (
            photo_num, photo_name, condition_bn, condition_en, age_group, protocol_variant, medicines_json, general_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        proto["photo_num"],
        proto["photo_name"],
        proto["condition_bn"],
        proto["condition_en"],
        proto["age_group"],
        proto.get("protocol_variant", ""),
        json.dumps(proto["medicines"], ensure_ascii=False),
        proto.get("general_instructions", "")
    ))
    protocol_id = cursor.lastrowid

    for med in proto["medicines"]:
        cursor.execute("""
            INSERT INTO protocol_medicines (
                protocol_id, photo_num, photo_name, condition_bn, condition_en, age_group,
                form, name, strength, dosage, duration, instructions, is_sos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            protocol_id,
            proto["photo_num"],
            proto["photo_name"],
            proto["condition_bn"],
            proto["condition_en"],
            proto["age_group"],
            med["form"],
            med["name"],
            med.get("strength", ""),
            med["dosage"],
            med.get("duration", ""),
            med.get("instructions", ""),
            med.get("is_sos", 0)
        ))
        total_medicines += 1

conn.commit()

# Run verification queries
cursor.execute("SELECT COUNT(DISTINCT photo_name) FROM treatment_protocols;")
distinct_photos = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM treatment_protocols;")
total_protocols = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM protocol_medicines;")
total_med_count = cursor.fetchone()[0]

cursor.execute("SELECT DISTINCT condition_en, condition_bn FROM treatment_protocols ORDER BY condition_en;")
conditions = cursor.fetchall()

print("="*60)
print("DATABASE SEEDING SUCCESSFUL!")
print("="*60)
print(f"Distinct Photos Seeded   : {distinct_photos}")
print(f"Total Treatment Protocols: {total_protocols}")
print(f"Total Protocol Medicines : {total_med_count}")
print(f"Distinct Conditions ({len(conditions)}):")
for c_en, c_bn in conditions:
    cursor.execute("SELECT COUNT(*) FROM treatment_protocols WHERE condition_en = ?", (c_en,))
    cnt = cursor.fetchone()[0]
    print(f"  • {c_bn} ({c_en}): {cnt} age protocols")
print("="*60)

conn.close()
