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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile app, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow localhost, vercel deployments, and custom allowed origins
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('vercel.app') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// API Routes - Supports both /api/* and /* paths for Vercel serverless rewrites
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/public', '/public'], publicRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', app: 'Veda - Home Doctor', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server if not running in a serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n✚ ═══════════════════════════════════════════ ✚`);
    console.log(`  🏥 Veda - Home Doctor API Server`);
    console.log(`  🌐 Running on: http://localhost:${PORT}`);
    console.log(`  📊 Admin Panel: http://localhost:5173/admin`);
    console.log(`  🔑 Admin Login: ${process.env.ADMIN_EMAIL || 'admin@vedahome.com'}`);
    console.log(`✚ ═══════════════════════════════════════════ ✚\n`);
  });
}

export default app;
