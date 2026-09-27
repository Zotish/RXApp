import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Activity, Calendar, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { publicAPI, authAPI } from '../../services/api';
import { t } from '../../i18n/translations';
import { supportedLanguages, commonSymptoms } from '../../data/medicalData';
import './Dashboard.css';

const getHistorySymptoms = (entry) => {
  if (Array.isArray(entry?.symptoms)) return entry.symptoms;
  if (typeof entry?.symptoms === 'string') {
    try {
      const parsed = JSON.parse(entry.symptoms);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return entry.symptoms ? [entry.symptoms] : [];
    }
  }
  return entry?.condition_name ? [entry.condition_name] : [];
};

export default function Dashboard({ language, setLanguage }) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { voiceEnabled, speakAndListen, setPageBusy, voiceLang } = useVoice();
  const isBangla = voiceLang.startsWith('bn');
  const saidRef = useRef(false);
  const [history, setHistory] = useState([]);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    if (user && location.search.includes('settings=true')) {
      navigate('/settings', { replace: true });
    }
  }, [location.search, user, navigate]);

  async function loadData() {
    try {
      const [histRes, consRes] = await Promise.allSettled([
        publicAPI.getMyHistory(),
        publicAPI.getMyConsultations(),
      ]);
      let apiHistory = histRes.status === 'fulfilled' ? (histRes.value.history || []) : [];
      // Merge localStorage history as fallback for offline / anonymous-synced entries
      try {
        const local = JSON.parse(localStorage.getItem('veda_local_history') || '[]');
        if (apiHistory.length === 0 && local.length > 0) apiHistory = local;
      } catch { /* Ignore malformed local history. */ }
      setHistory(apiHistory);
      if (consRes.status === 'fulfilled') setConsultations(consRes.value.consultations || []);
    } catch { /* API failures fall back to empty dashboard sections. */ }
  }

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => {
      if (!user) { navigate('/login'); return; }
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [user, authLoading, navigate]);

  const stats = useMemo(() => {
    const totalChecks = history.length;
    const allSymptoms = history.flatMap(getHistorySymptoms);
    const freq = {};
    allSymptoms.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    const topSymptomId = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
    const topSymptom = topSymptomId ? (commonSymptoms.find(s => s.id === topSymptomId)?.label || topSymptomId) : '—';
    const allConditions = new Set(history.flatMap(h =>
      Array.isArray(h.matched_conditions) ? h.matched_conditions : h.condition_name ? [h.condition_name] : []
    ));
    const activeDays = history.length > 0
      ? new Set(history.map(h => new Date(h.created_at).toDateString())).size
      : 0;
    return { totalChecks, topSymptom, conditionsFound: allConditions.size, activeDays };
  }, [history]);

  useEffect(() => {
    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('হিস্ট্রি') || lower.includes('history')) {
        document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (lower.includes('প্রোফাইল') || lower.includes('profile')) {
        document.getElementById('edit-profile-btn')?.click();
      } else if (lower.includes('নতুন') || lower.includes('new check')) {
        navigate('/symptom-checker');
      } else if (lower.includes('রিপোর্ট') || lower.includes('report')) {
        navigate('/settings');
      }
    };

    window.addEventListener('voice-page-command', handlePageCommand);
    return () => {
      window.removeEventListener('voice-page-command', handlePageCommand);
      setPageBusy(false);
      saidRef.current = false;
    };
  }, [navigate, setPageBusy]);

  useEffect(() => {
    if (!voiceEnabled || !user || saidRef.current) return;
    saidRef.current = true;
    setPageBusy(true);
    const t = setTimeout(() => {
      let msg;
      if (isBangla) {
        msg = `আপনার ড্যাশবোর্ডে স্বাগতম, ${user.name}। আপনার মোট ${stats.totalChecks}টি লক্ষণ পরীক্ষা হয়েছে। `;
        if (stats.topSymptom && stats.topSymptom !== '—') msg += `সবচেয়ে বেশি লক্ষণ: ${stats.topSymptom}। `;
        msg += 'নতুন চেক করতে "নতুন চেক" বলুন, রিপোর্ট ডাউনলোড করতে "রিপোর্ট" বলুন, প্রোফাইল এডিট করতে "প্রোফাইল" বলুন।';
      } else {
        msg = `Welcome to your dashboard, ${user.name}. You have ${stats.totalChecks} total symptom checks. `;
        if (stats.topSymptom && stats.topSymptom !== '—') msg += `Top symptom: ${stats.topSymptom}. `;
        msg += 'Say "new check" to start, "report" to download, or "profile" to edit.';
      }
      speakAndListen(msg).then(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [voiceEnabled, stats, isBangla, setPageBusy, speakAndListen, user]);

  useEffect(() => {
    return () => { setPageBusy(false); saidRef.current = false; };
  }, [setPageBusy]);

  if (authLoading) {
    return <div className="dashboard-page"><div className="loader-spinner" aria-label="Loading profile" /></div>;
  }
  if (!user) return null;

  const lang = language || user.language || 'en';
  const currentLang = supportedLanguages.find(l => l.code === lang);
  const planClass = user.subscription_plan === 'premium' ? 'plan-premium' : user.subscription_plan === 'basic' ? 'plan-basic' : 'plan-free';

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="bg-radial-glow" />
      <div className="dashboard-container">

        {/* User Headline on Left Side */}
        <div className="dash-user-headline">
          <div className="dash-user-avatar-wrap">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="dash-user-avatar-img"
              />
            ) : (
              <div className="dash-user-avatar-placeholder" aria-label="User avatar">
                <UserRound size={19} />
              </div>
            )}
          </div>
          <h1 className="dash-user-name">
            <span>{user.name}</span>
            {user.subscription_plan === 'premium' && (
              <span className="twitter-badge-wrapper" title={lang === 'bn' ? 'ভেরিফায়েড প্রিমিয়াম অ্যাকাউন্ট' : 'Verified Premium Account'}>
                <svg viewBox="0 0 24 24" width="20" height="20" className="blue-tick-svg" aria-label="Verified">
                  <path
                    fill="#1d9bf0"
                    d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                  />
                  <path
                    fill="#ffffff"
                    d="M10.54 16.2l-3.74-3.74 1.41-1.42 2.33 2.33 5.34-5.34 1.41 1.41-6.75 6.76z"
                  />
                </svg>
              </span>
            )}
          </h1>
        </div>

        {/* Stats Bar */}
        <motion.div className="dash-stats-bar" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {[
            { value: stats.totalChecks, label: lang === 'bn' ? 'মোট চেক' : 'Total Checks' },
            { value: stats.topSymptom, label: lang === 'bn' ? 'সবচেয়ে বেশি লক্ষণ' : 'Top Symptom' },
            { value: stats.conditionsFound, label: lang === 'bn' ? 'রোগ শনাক্ত' : 'Conditions Found' },
            { value: stats.activeDays, label: lang === 'bn' ? 'সক্রিয় দিন' : 'Active Days' },
          ].map((s, i) => (
            <motion.div key={i} className="dash-stat-item" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.07 + i * 0.05 }}>
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-value">{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Grid */}
        <div className="dash-grid">

          {/* Recent Consultations */}
          <motion.div className="dash-card dash-card-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="dash-card-header">
              <span className="dash-card-title"><Calendar size={18} /> {t('recentConsults', lang)}</span>
              <button className="dash-card-link" onClick={() => navigate('/teleconsultation')}>{t('viewAll', lang)}</button>
            </div>
            {consultations.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">📞</div>
                <p>{t('noConsultsYet', lang)}</p>
              </div>
            ) : (
              consultations.slice(0, 4).map(c => (
                <div key={c.id} className="consult-item">
                  <div className="consult-info">
                    <h4>👨‍⚕️ {c.doctor_name || 'Doctor'}</h4>
                    <p>{c.specialization} • {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <span className={`consultation-status status-${c.status}`}>{c.status}</span>
                </div>
              ))
            )}
          </motion.div>

          {/* Symptom Check History */}
          <motion.div className="dash-card dash-card-full" id="history-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="dash-card-header">
              <span className="dash-card-title"><Activity size={18} /> {t('symptomCheckHistory', lang)}</span>
              <button className="dash-card-link" onClick={() => navigate('/symptom-checker')}>{t('newCheck', lang)}</button>
            </div>
            {history.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">🔍</div>
                <p>{t('noHistoryYet', lang)}</p>
              </div>
            ) : (
              <div className="history-list">
                {history.slice(0, 8).map(h => (
                  <div key={h.id} className="history-item">
                    <div className="history-symptoms">
                      {getHistorySymptoms(h).slice(0, 5).map((s, i) => (
                        <span key={i} className="history-symptom-tag">{s}</span>
                      ))}
                      {getHistorySymptoms(h).length > 5 && <span className="history-symptom-tag">+{getHistorySymptoms(h).length - 5}</span>}
                    </div>
                    <span className="history-date"><Clock size={12} /> {new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
