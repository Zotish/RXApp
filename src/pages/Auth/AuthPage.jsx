import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { t } from '../../i18n/translations';
import { supportedLanguages } from '../../data/medicalData';
import '../Teleconsultation/Teleconsultation.css';

export default function AuthPage({ language, setLanguage }) {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLang, setSelectedLang] = useState(language || 'en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceStep, setVoiceStep] = useState(null);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { voiceEnabled, speak, listenForResponse, setPageBusy, voiceLang } = useVoice();
  const isBangla = voiceLang.startsWith('bn');

  const handleVoiceResult = useCallback((text) => {
    if (!text || !text.trim()) return;
    const field = voiceStep;
    const clean = text.toLowerCase().trim();
    
    if (field === 'name') {
      setName(text.trim());
      setVoiceStep('email');
      return;
    }
    if (field === 'email') {
      const normalized = clean
        .replace(/\s+(at|অ্যাট)\s+/g, '@')
        .replace(/\s+(dot|ডট)\s+/g, '.')
        .replace(/\s+/g, '');
      setEmail(normalized);
      if (!normalized.includes('@')) {
        setError(isBangla ? 'ইমেইলটি ঠিকভাবে ধরা যায়নি। লিখে সংশোধন করুন।' : 'The email was not captured correctly. Please edit it.');
        setVoiceStep(null);
        setPageBusy(false);
        return;
      }
      setVoiceStep(mode === 'register' ? 'phone' : null);
      if (mode === 'login') {
        setPageBusy(false);
        speak(isBangla ? 'ইমেইল নেওয়া হয়েছে। নিরাপত্তার জন্য পাসওয়ার্ডটি টাইপ করুন।' : 'Email captured. For security, please type your password.');
      }
      return;
    }
    if (field === 'phone') {
      setPhone(clean.replace(/[^\d+]/g, ''));
      setVoiceStep(null);
      setPageBusy(false);
      speak(isBangla ? 'ফোন নম্বর নেওয়া হয়েছে। নিরাপত্তার জন্য পাসওয়ার্ডটি টাইপ করুন।' : 'Phone number captured. For security, please type your password.');
    }
  }, [voiceStep, mode, isBangla, setPageBusy, speak]);

  const askForField = useCallback((field) => {
    if (!voiceEnabled || !field) return;
    const prompts = isBangla
      ? { name: 'আপনার পুরো নাম বলুন।', email: 'আপনার ইমেইল বলুন। যেমন, নাম অ্যাট জিমেইল ডট কম।', phone: 'আপনার ফোন নম্বর বলুন।' }
      : { name: 'Please say your full name.', email: 'Please say your email address, including at and dot.', phone: 'Please say your phone number.' };
    listenForResponse(prompts[field], handleVoiceResult);
  }, [voiceEnabled, isBangla, listenForResponse, handleVoiceResult]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!voiceEnabled) {
        setVoiceStep(null);
        setPageBusy(false);
        return;
      }
      setPageBusy(true);
      setVoiceStep(mode === 'register' ? 'name' : 'email');
    }, 0);
    return () => clearTimeout(timer);
  }, [voiceEnabled, mode, setPageBusy]);

  useEffect(() => {
    if (!voiceStep) return;
    const timer = setTimeout(() => askForField(voiceStep), 250);
    return () => clearTimeout(timer);
  }, [voiceStep, askForField]);

  useEffect(() => {
    return () => setPageBusy(false);
  }, [setPageBusy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, name, phone, language: selectedLang });
      }
      // Set app language from user's choice
      if (setLanguage && mode === 'register') setLanguage(selectedLang);
      navigate(searchParams.get('redirect') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="auth-page">
      <div className="bg-radial-glow" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-logo">
          <div className="navbar-logo-icon" style={{ width: 48, height: 48, fontSize: 24 }}>✚</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>
              <span className="gradient-text">Veda</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Home Doctor</div>
          </div>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? t('loginTitle', language) : t('registerTitle', language)}
        </h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label>{t('name', language)}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  id="auth-name"
                />
              </div>
              <div className="auth-field">
                <label>{t('phone', language)}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+880 1XXX XXXXXX"
                  id="auth-phone"
                />
              </div>
              <div className="auth-field">
                <label><Globe size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {t('chooseLanguage', language)}
                </label>
                <select
                  value={selectedLang}
                  onChange={e => setSelectedLang(e.target.value)}
                  id="auth-language"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}
                >
                  {supportedLanguages.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.nativeName} ({l.name})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="auth-field">
            <label>{t('email', language)}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              id="auth-email"
            />
          </div>

          <div className="auth-field">
            <label>{t('password', language)}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              id="auth-password"
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
            id="auth-submit-btn"
          >
            {loading ? t('loading', language) : (mode === 'login' ? t('loginBtn', language) : t('registerBtn', language))}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <button onClick={() => { setMode('register'); setError(''); }}>
              {t('noAccount', language)}
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); }}>
              {t('hasAccount', language)}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
