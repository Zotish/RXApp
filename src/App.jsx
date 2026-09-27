import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import VoiceAssistant from './components/VoiceAssistant/VoiceAssistant';
import Navbar from './components/Navbar/Navbar';
import BottomNav from './components/BottomNav/BottomNav';
import Home from './pages/Home/Home';
import SymptomChecker from './pages/SymptomChecker/SymptomChecker';
import FirstAid from './pages/FirstAid/FirstAid';
import BodyMap from './pages/BodyMap/BodyMap';
import About from './pages/About/About';
import Teleconsultation from './pages/Teleconsultation/Teleconsultation';
import AuthPage from './pages/Auth/AuthPage';
import AdminPanel from './pages/Admin/AdminPanel';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';
import Nearby from './pages/Nearby/Nearby';

import './App.css';
import './redesign.css';

// ── Global medicine reminder checker — fires every 60s ──
function ReminderChecker() {
  useEffect(() => {
    const check = () => {
      if (Notification.permission !== 'granted') return;
      try {
        const reminders = JSON.parse(localStorage.getItem('veda_reminders') || '[]');
        const now     = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        reminders.filter(r => r.active).forEach(r => {
          if (r.times.includes(timeStr)) {
            new Notification('💊 Veda Medicine Reminder', {
              body:  `Time to take: ${r.medicine}${r.condition ? ` — ${r.condition}` : ''}`,
              icon:  '/veda-icon.svg',
              badge: '/veda-icon.svg',
            });
          }
        });
      } catch { /* Ignore malformed local reminder data. */ }
    };
    check();
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
  }, []);
  return null;
}

// Syncs app language from logged-in user's profile on initial login
function LanguageSync({ setLanguage }) {
  const { user } = useAuth();
  const syncedUserId = useRef(null);

  useEffect(() => {
    if (user?.id && user.id !== syncedUserId.current) {
      syncedUserId.current = user.id;
      if (user.language) setLanguage(user.language);
    } else if (!user) {
      syncedUserId.current = null;
    }
  }, [user?.id, user?.language, setLanguage]);

  return null;
}

export default function App() {
  const [language, setLanguageState] = useState(() => localStorage.getItem('veda_language') || 'en');
  const setLanguage = useCallback((lang) => {
    const next = lang === 'bn' ? 'bn' : 'en';
    localStorage.setItem('veda_language', next);
    setLanguageState(next);
  }, []);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);
  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <AuthProvider>
      <VoiceProvider>
        <LanguageSync setLanguage={setLanguage} />
        <ReminderChecker />
        <div className="app-wrapper bg-grid" id="app-root">
          <Navbar language={language} setLanguage={setLanguage} />
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} className="page-wrapper"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <Routes location={location}>
                <Route path="/" element={<Home language={language} />} />
                <Route path="/symptom-checker" element={<SymptomChecker language={language} />} />
                <Route path="/first-aid" element={<FirstAid language={language} />} />
                <Route path="/body-map" element={<BodyMap language={language} />} />
                <Route path="/about" element={<About language={language} />} />
                <Route path="/teleconsultation" element={<Teleconsultation language={language} />} />
                <Route path="/nearby" element={<Nearby language={language} />} />
                <Route path="/login" element={<AuthPage language={language} setLanguage={setLanguage} />} />
                <Route path="/dashboard" element={<Dashboard language={language} setLanguage={setLanguage} />} />
                <Route path="/settings" element={<Settings language={language} setLanguage={setLanguage} />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
          <button className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top" id="scroll-top-btn">
            <ArrowUp size={20} />
          </button>
          <BottomNav language={language} />
        </div>
        <VoiceAssistant language={language} />
      </VoiceProvider>
    </AuthProvider>
  );
}
