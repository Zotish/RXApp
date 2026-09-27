/* =============================================
   VEDA - Home Doctor | Backend Server
   ============================================= */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './db.js'; // Initialize database
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Veda - Home Doctor', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✚ ═══════════════════════════════════════════ ✚`);
  console.log(`  🏥 Veda - Home Doctor API Server`);
  console.log(`  🌐 Running on: http://localhost:${PORT}`);
  console.log(`  📊 Admin Panel: http://localhost:5173/admin`);
  console.log(`  🔑 Admin Login: ${process.env.ADMIN_EMAIL || 'admin@vedahome.com'}`);
  console.log(`✚ ═══════════════════════════════════════════ ✚\n`);
});
