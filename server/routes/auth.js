/* =============================================
   VEDA - Auth Routes
   ============================================= */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, password, name, phone, language } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password, name, phone, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email, hashedPassword, name, phone || null, language || 'en');

    const user = db.prepare('SELECT id, email, name, role, language, subscription_plan, age_group FROM users WHERE id = ?').get(id);
    const token = generateToken(user);

    // Track analytics
    db.prepare('INSERT INTO analytics (event_type, event_data, user_id) VALUES (?, ?, ?)').run(
      'user_registered', JSON.stringify({ email }), id
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeUser = { ...user };
    delete safeUser.password;
    const token = generateToken(safeUser);

    // Track analytics
    db.prepare('INSERT INTO analytics (event_type, event_data, user_id) VALUES (?, ?, ?)').run(
      'user_login', JSON.stringify({ email }), user.id
    );

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, phone, avatar, role, language, subscription_plan, subscription_expiry, age_group, two_factor_phone, two_factor_totp, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, phone, language, email, avatar } = req.body;

    if (email && email.trim() !== '') {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim(), req.user.id);
      if (existing) {
        return res.status(409).json({ error: 'This email is already in use by another account' });
      }
    }

    db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name), 
        phone = COALESCE(?, phone), 
        language = COALESCE(?, language),
        email = COALESCE(?, email),
        avatar = CASE WHEN ? = '__REMOVE__' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE avatar END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || null,
      phone || null,
      language || null,
      email ? email.trim() : null,
      avatar || null,
      avatar || null,
      avatar || null,
      req.user.id
    );

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, language, subscription_plan, subscription_expiry, age_group, two_factor_phone, two_factor_totp, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hashed, req.user.id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/auth/plan
router.put('/plan', authenticate, (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'premium'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const expiry = plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE users SET subscription_plan = ?, subscription_expiry = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(plan, expiry, req.user.id);

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, language, subscription_plan, subscription_expiry, age_group, two_factor_phone, two_factor_totp, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user, message: `Subscription plan updated to ${plan}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/auth/2fa
router.post('/2fa', authenticate, (req, res) => {
  try {
    const { type, enabled } = req.body; // type: 'phone' | 'totp'
    if (type === 'phone') {
      db.prepare('UPDATE users SET two_factor_phone = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(enabled ? 1 : 0, req.user.id);
    } else if (type === 'totp') {
      db.prepare('UPDATE users SET two_factor_totp = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(enabled ? 1 : 0, req.user.id);
    } else {
      return res.status(400).json({ error: 'Invalid 2FA type' });
    }

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, language, subscription_plan, subscription_expiry, age_group, two_factor_phone, two_factor_totp, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user, message: `${type === 'totp' ? 'Google Authenticator' : 'Mobile SMS'} 2FA ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/auth/age-group
router.put('/age-group', authenticate, (req, res) => {
  try {
    const { age_group } = req.body;
    const valid = ['infant', 'child_s', 'child', 'teen', 'adult'];
    if (!valid.includes(age_group)) {
      return res.status(400).json({ error: 'Invalid age group' });
    }
    db.prepare(`UPDATE users SET age_group = ?, updated_at = datetime('now') WHERE id = ?`).run(age_group, req.user.id);
    const user = db.prepare('SELECT id, email, name, phone, role, language, subscription_plan, age_group FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
