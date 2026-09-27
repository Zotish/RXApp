import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Mic,
  MicOff,
  X,
  Pill,
} from 'lucide-react';
import { conditionDatabase, getLocalized, resolveConditionForAge, agesAvailableFor } from '../../data/medicalData';
import { useVoice } from '../../context/VoiceContext';
import { t } from '../../i18n/translations';
import '../SymptomChecker/SymptomChecker.css';
import './Home.css';

const AGE_GROUPS = [
  { id: 'infant',  icon: '👶', labelKey: 'sc_age_infant',  color: '#567b69' },
  { id: 'child_s', icon: '🧒', labelKey: 'sc_age_child_s', color: '#6f8f70' },
  { id: 'child',   icon: '🧒', labelKey: 'sc_age_child',   color: '#7f966f' },
  { id: 'teen',    icon: '🧑', labelKey: 'sc_age_teen',    color: '#6b8178' },
  { id: 'adult',   icon: '🧑‍💼', labelKey: 'sc_age_adult', color: '#826f65' },
];

export default function Home({ language = 'en' }) {
  const navigate = useNavigate();
  const bn = language === 'bn';
  const { speaking, listening, startListening, transcript } = useVoice();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedAge, setSelectedAge] = useState(null);
  const [output, setOutput] = useState(null);
  const [reminderModal, setReminderModal] = useState(null);
  const [reminderTimes, setReminderTimes] = useState({ morning: true, afternoon: false, night: true });
  const [reminderSaved, setReminderSaved] = useState({});
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync real-time transcript when voice is listening
  useEffect(() => {
    if (listening && transcript && transcript.trim()) {
      setQuery(transcript);
      setShowDropdown(true);
    }
  }, [listening, transcript]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchRef.current && !searchRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const copy = bn ? {
    eyebrow: 'ব্যক্তিগত স্বাস্থ্য সহায়তা • বাংলা ও ইংরেজি',
    title: 'শরীর খারাপ?',
    accent: 'চলুন, পরের পদক্ষেপ দেখি।',
    subtitle: 'আপনার রোগের নাম লিখুন',
    inputLabel: 'আপনার লক্ষণ',
    inputPlaceholder: 'যেমন: জ্বর বা মাথাব্যথা',
    primaryCta: 'পরীক্ষা করুন',
    common: 'সাধারণ',
    suggestions: ['জ্বর', 'মাথাব্যথা', 'কাশি'],
    emergency: 'জরুরি সহায়তা',
    bodyMap: 'শরীরের অংশ থেকে খুঁজুন',
    private: 'আপনার তথ্য ব্যক্তিগত',
    bilingual: 'বাংলা + English',
    panelKicker: 'শুরু করুন',
    panelTitle: 'আপনার কী দরকার?',
    panelNote: 'একটি পথ বেছে নিন',
    symptomTitle: 'লক্ষণ পরীক্ষা',
    symptomDesc: 'আপনার সমস্যা লিখুন',
    firstAidTitle: 'প্রাথমিক চিকিৎসা',
    firstAidDesc: 'ধাপে ধাপে করণীয়',
    hospitalTitle: 'কাছের হাসপাতাল',
    hospitalDesc: 'নিকটবর্তী সেবা খুঁজুন',
    consultTitle: 'ডাক্তারের পরামর্শ',
    consultDesc: 'অনলাইনে অ্যাপয়েন্টমেন্ট',
    panelSafety: 'গুরুতর অবস্থায় সরাসরি ৯৯৯-এ কল করুন',
    howLabel: 'কীভাবে কাজ করে',
    howTitle: 'কীভাবে Veda কাজ করে',
    howDesc: '',
    steps: [
      ['১', 'সমস্যা জানান', 'লক্ষণ লিখুন বা শরীরের অংশ বেছে নিন।'],
      ['২', 'নির্দেশনা দেখুন', 'সহজ ভাষায় প্রাসঙ্গিক করণীয় বুঝুন।'],
      ['৩', 'সঠিক পদক্ষেপ নিন', 'নিজে যত্ন নিন, হাসপাতাল খুঁজুন বা ডাক্তার দেখান।'],
    ],
    careLabel: 'বিশেষজ্ঞ সহায়তা',
    careTitle: 'আরও সহায়তা দরকার?',
    careDesc: 'যাচাইকৃত স্বাস্থ্যকর্মীর সঙ্গে অনলাইন পরামর্শ বুক করুন।',
    careCta: 'ডাক্তার দেখুন',
    emergencyText: 'বুকে ব্যথা, শ্বাসকষ্ট বা গুরুতর রক্তপাত হলে',
    emergencyCta: '৯৯৯-এ কল করুন',
    footerNote: 'Veda প্রাথমিক তথ্য দেয়, চিকিৎসকের বিকল্প নয়।',
    about: 'আমাদের সম্পর্কে',
  } : {
    eyebrow: 'Private health support • Bangla & English',
    title: 'Not feeling well?',
    accent: "Let's find the next step.",
    subtitle: "Ask your disease",
    inputLabel: 'Your symptom',
    inputPlaceholder: 'Try: fever or headache',
    primaryCta: 'Check',
    common: 'Common',
    suggestions: ['Fever', 'Headache', 'Cough'],
    emergency: 'Emergency help',
    bodyMap: 'Choose from the body map',
    private: 'Your data stays private',
    bilingual: 'বাংলা + English',
    panelKicker: 'Start here',
    panelTitle: 'What do you need?',
    panelNote: 'Choose one clear path',
    symptomTitle: 'Check symptoms',
    symptomDesc: 'Describe what feels wrong',
    firstAidTitle: 'First aid',
    firstAidDesc: 'Follow step-by-step care',
    hospitalTitle: 'Nearby hospitals',
    hospitalDesc: 'Find care close to you',
    consultTitle: 'Talk to a doctor',
    consultDesc: 'Book an online consultation',
    panelSafety: 'For a serious emergency, call 999 directly',
    howLabel: 'How it works',
    howTitle: 'How Veda works',
    howDesc: '',
    steps: [
      ['1', 'Tell us what is wrong', 'Describe a symptom or choose an area of the body.'],
      ['2', 'See practical guidance', 'Understand the relevant next steps in plain language.'],
      ['3', 'Choose the right care', 'Self-care, a nearby hospital, or a clinician when needed.'],
    ],
    careLabel: 'Professional support',
    careTitle: 'Need more help?',
    careDesc: 'Book an online consultation with a verified healthcare professional.',
    careCta: 'Find a doctor',
    emergencyText: 'For chest pain, trouble breathing, or severe bleeding',
    emergencyCta: 'Call 999',
    footerNote: 'Veda provides early guidance and does not replace a clinician.',
    about: 'About Veda',
  };


  const ageOptions = useMemo(
    () => (selectedCondition ? agesAvailableFor(selectedCondition) : []),
    [selectedCondition]
  );

  const handleSelectCondition = (condition) => {
    setSelectedCondition(condition);
    setSelectedAge(null);
    setOutput(null);
    setShowDropdown(false);
    setQuery(getLocalized(condition, 'name', language) || condition.name);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedCondition(null);
    setSelectedAge(null);
    setOutput(null);
    setShowDropdown(false);
  };

  const handleSelectAge = (ageId) => {
    if (!selectedCondition) return;
    const available = agesAvailableFor(selectedCondition);
    if (available.length && !available.includes(ageId)) return;

    const resolved = resolveConditionForAge(selectedCondition, ageId);
    if (!resolved) return;

    setSelectedAge(ageId);
    setOutput({
      condition: resolved,
      ageGroup: ageId,
    });
  };

  const openReminder = (med, conditionName) => {
    setReminderModal({ medicine: med.name, condition: conditionName });
    setReminderTimes({ morning: true, afternoon: false, night: true });
  };

  const saveReminder = async () => {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert(bn ? 'নোটিফিকেশনের অনুমতি দিন' : 'Please allow notifications in browser settings');
        return;
      }
    }
    const times = [];
    if (reminderTimes.morning)   times.push('08:00');
    if (reminderTimes.afternoon) times.push('14:00');
    if (reminderTimes.night)     times.push('20:00');
    if (!times.length) {
      alert(bn ? 'অন্তত একটি সময় বেছে নিন' : 'Pick at least one time');
      return;
    }
    try {
      const prev = JSON.parse(localStorage.getItem('veda_reminders') || '[]');
      const idx  = prev.findIndex(r => r.medicine === reminderModal.medicine);
      const entry = { medicine: reminderModal.medicine, condition: reminderModal.condition, times, active: true };
      if (idx >= 0) prev[idx] = entry; else prev.push(entry);
      localStorage.setItem('veda_reminders', JSON.stringify(prev));
    } catch { /* ignore */ }
    setReminderSaved(p => ({ ...p, [reminderModal.medicine]: true }));
    setReminderModal(null);
  };

  const handleVoice = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startListening((res) => {
      if (res && res.trim()) {
        setQuery(res);
        setShowDropdown(true);
        const q = res.toLowerCase().trim();
        const directMatch = conditionDatabase.find(c => {
          if (c.family && !c.familyPrimary) return false;
          const en = (c.name || '').toLowerCase();
          const bnName = (c.translations?.bn?.name || '').toLowerCase();
          const aliases = (c.matchSymptoms || []).map(s => s.toLowerCase());
          return en === q || bnName === q || aliases.includes(q);
        });
        if (directMatch) {
          handleSelectCondition(directMatch);
        }
      }
    });
  };

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const nameExact = [];
    const namePrefix = [];
    const nameContains = [];
    const aliasExact = [];
    const aliasPrefix = [];
    const aliasContains = [];

    conditionDatabase.forEach((c) => {
      if (c.family && !c.familyPrimary) return;
      const en = (c.name || '').toLowerCase();
      const bnName = (c.translations?.bn?.name || '').toLowerCase();
      const aliases = (c.matchSymptoms || []).map((s) => s.toLowerCase());

      if (en === q || bnName === q) {
        nameExact.push(c);
      } else if (en.startsWith(q) || bnName.startsWith(q)) {
        namePrefix.push(c);
      } else if (en.includes(q) || bnName.includes(q)) {
        nameContains.push(c);
      } else if (aliases.some((a) => a === q)) {
        aliasExact.push(c);
      } else if (aliases.some((a) => a.startsWith(q))) {
        aliasPrefix.push(c);
      } else if (aliases.some((a) => a.includes(q))) {
        aliasContains.push(c);
      }
    });

    if (nameExact.length > 0) return nameExact.slice(0, 8);
    if (namePrefix.length > 0) return namePrefix.slice(0, 8);
    if (aliasExact.length > 0) return aliasExact.slice(0, 8);
    if (nameContains.length > 0) return nameContains.slice(0, 8);
    if (aliasPrefix.length > 0) return aliasPrefix.slice(0, 8);
    if (aliasContains.length > 0) return aliasContains.slice(0, 8);

    return [];
  }, [query]);

  const handleFormSubmit = (event) => {
    event?.preventDefault();
    const value = query.trim();
    if (!value) return;
    if (suggestions.length > 0) {
      handleSelectCondition(suggestions[0]);
    } else {
      const q = value.toLowerCase();
      const directMatch = conditionDatabase.find(c => {
        if (c.family && !c.familyPrimary) return false;
        const en = (c.name || '').toLowerCase();
        const bnName = (c.translations?.bn?.name || '').toLowerCase();
        const aliases = (c.matchSymptoms || []).map(s => s.toLowerCase());
        return en === q || bnName === q || aliases.includes(q);
      });
      if (directMatch) {
        handleSelectCondition(directMatch);
      }
    }
  };

  return (
    <main className="home-page" id="home-page">
      <section className="home-hero" id="hero-section">
        <div className="home-shell hero-layout">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .45 }}
          >
            <h1 className="sr-only">Veda</h1>
            <p className="hero-subtitle">{copy.subtitle}</p>

            <div className="home-search-wrapper" ref={searchRef}>
              <form className="health-search" onSubmit={handleFormSubmit}>
                <label className="sr-only" htmlFor="home-symptom-input">{copy.inputLabel}</label>
                <Search size={20} aria-hidden="true" className="home-search-icon" />
                <input
                  id="home-symptom-input"
                  className="home-search-input"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => query.trim() && setShowDropdown(true)}
                  placeholder={copy.inputPlaceholder}
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    className="home-search-clear"
                    onClick={handleClear}
                    aria-label={bn ? 'মুছুন' : 'Clear search'}
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={`home-voice-btn ${listening ? 'listening' : ''}`}
                  onClick={handleVoice}
                  disabled={speaking}
                  title={listening ? (bn ? 'শুনছি... কথা বলুন' : 'Listening... Speak now') : (bn ? 'ভয়েসে বলুন' : 'Speak with Voice')}
                  aria-label={listening ? (bn ? 'শুনছি... কথা বলুন' : 'Listening... Speak now') : (bn ? 'ভয়েসে বলুন' : 'Speak with Voice')}
                >
                  {listening ? <MicOff size={19} /> : <Mic size={19} />}
                </button>
              </form>

              {/* ── Auto Suggestions Dropdown ── */}
              <AnimatePresence>
                {showDropdown && suggestions.length > 0 && !selectedCondition && (
                  <motion.div
                    className="home-suggestions-dropdown"
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.99 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="suggestions-header">
                      <span>{bn ? 'রোগের তালিকা' : 'Suggested Conditions'}</span>
                      <small>{suggestions.length} {bn ? 'টি পাওয়া গেছে' : 'found'}</small>
                    </div>
                    <div className="suggestions-list" role="listbox">
                      {suggestions.map((condition) => {
                        const name = getLocalized(condition, 'name', language) || condition.name;
                        const altName = language === 'bn' ? condition.name : (condition.translations?.bn?.name || '');
                        return (
                          <button
                            key={condition.id}
                            type="button"
                            className="suggestion-item"
                            onClick={() => handleSelectCondition(condition)}
                          >
                            <div className="suggestion-item-icon">
                              <Search size={15} />
                            </div>
                            <div className="suggestion-item-text">
                              <span className="suggestion-name">{name}</span>
                              {altName && altName !== name && (
                                <span className="suggestion-subname">{altName}</span>
                              )}
                            </div>
                            <ArrowRight size={14} className="suggestion-item-arrow" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Step 1: Selected Condition Chip ── */}
            <AnimatePresence>
              {selectedCondition && !output && (
                <motion.div
                  className="selected-condition-chip"
                  style={{ width: '100%', maxWidth: '620px', marginTop: '16px' }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <div className="selected-chip-info">
                    <span className="selected-chip-name">
                      🩺 {getLocalized(selectedCondition, 'name', language) || selectedCondition.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="selected-chip-remove"
                    onClick={handleClear}
                    aria-label={bn ? 'নির্বাচন সরান' : 'Remove selection'}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Step 2: Age Selection Cards ── */}
            <AnimatePresence>
              {selectedCondition && !output && (
                <motion.div
                  className="sc-step"
                  style={{ width: '100%', maxWidth: '620px', marginTop: '18px', textAlign: 'left' }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="sc-step-indicator">
                    <span className="sc-step-badge active">2</span>
                    <span className="sc-step-label">{bn ? 'বয়স নির্বাচন করুন' : 'Select Age Group'}</span>
                  </div>

                  <div className="age-grid">
                    {AGE_GROUPS.map((group, i) => {
                      const enabled = ageOptions.includes(group.id);
                      return (
                        <motion.button
                          key={group.id}
                          className={`age-card ${selectedAge === group.id ? 'selected' : ''} ${enabled ? '' : 'disabled'}`}
                          style={{ '--card-color': group.color }}
                          onClick={() => enabled && handleSelectAge(group.id)}
                          disabled={!enabled}
                          title={enabled ? undefined : (bn ? 'এই বয়সের জন্য নোট নেই' : 'No notebook protocol for this age')}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          whileHover={enabled ? { y: -2 } : undefined}
                          whileTap={enabled ? { scale: 0.98 } : undefined}
                        >
                          <span className="age-card-icon">{group.icon}</span>
                          <span className="age-card-label">{t(group.labelKey, language)}</span>
                          {selectedAge === group.id && (
                            <span className="age-card-check">✓</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Step 3: Exact Solution Result Card ── */}
            <AnimatePresence>
              {output?.condition && (
                <motion.div
                  className="results-section"
                  style={{ width: '100%', maxWidth: '680px', marginTop: '22px', textAlign: 'left' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="output-header">
                    <button className="output-back-btn" onClick={() => { setOutput(null); setSelectedAge(null); }}>
                      ← {bn ? 'বয়স পরিবর্তন করুন' : 'Back to Age Selection'}
                    </button>
                    <span className="output-age-badge">
                      {AGE_GROUPS.find(g => g.id === selectedAge)?.icon} {t(AGE_GROUPS.find(g => g.id === selectedAge)?.labelKey, language)}
                    </span>
                  </div>

                  <div className="result-card">
                    <div className="result-header">
                      <h3 className="result-name">
                        {getLocalized(output.condition, 'name', language) || output.condition.name}
                      </h3>
                    </div>

                    {/* Recommended Medicines */}
                    {output.condition.medicines && output.condition.medicines.length > 0 && (
                      <>
                        <h4 className="result-section-title">
                          <Pill size={16} style={{ color: 'var(--color-accent-primary)' }} />
                          {bn ? 'নির্ধারিত ওষুধসমূহ' : 'Prescribed Medicines'}
                        </h4>
                        <div className="medicines-table">
                          <div className="medicine-header">
                            <span>{bn ? 'ওষুধ' : 'Medicine'}</span>
                            <span>{bn ? 'মাত্রা' : 'Dose'}</span>
                            <span>{bn ? 'খাওয়ার নিয়ম' : 'Timing'}</span>
                            <span>{bn ? 'মেয়াদ' : 'Duration'}</span>
                          </div>
                          {output.condition.medicines.map((med, j) => {
                            const mt = med.translations?.[language];
                            return (
                              <div key={j} className="medicine-row">
                                <span className="med-name">{med.name}</span>
                                <span className="med-dose">{med.dose || '—'}</span>
                                <span className="med-timing">{mt?.timing || med.timing || '—'}</span>
                                <span className="med-duration">{mt?.duration || med.duration || '—'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Notebook Notes */}
                    {output.condition.general_instructions && (
                      <div className="notebook-notes" style={{ marginTop: '1.25rem', padding: '1rem', background: '#fbfbf6', borderRadius: '8px', borderLeft: '4px solid var(--color-accent-primary)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
                          📋 {bn ? 'নোটবুক নির্দেশিকা:' : 'Notebook Instructions:'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {output.condition.general_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </section>

      <section className="path-section" aria-labelledby="path-title">
        <div className="home-shell">
          <div className="path-heading">
            <h2 id="path-title">{copy.howTitle}</h2>
          </div>
          <div className="path-grid">
            {copy.steps.map(([number, title, desc], index) => (
              <motion.article
                className="path-step"
                key={number}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: .4 }}
                transition={{ delay: index * .07 }}
              >
                <span>{number}</span>
                <div><h3>{title}</h3><p>{desc}</p></div>
                <CheckCircle2 size={19} />
              </motion.article>
            ))}
          </div>
        </div>
      </section>


      <footer className="home-footer" id="main-footer">
        <div className="home-shell footer-row">
          <button className="footer-brand-line" onClick={() => navigate('/')}>
            <span>✚</span><strong>Veda</strong><em>Home Doctor</em>
          </button>
          <button className="footer-about" onClick={() => navigate('/about')}>{copy.about}</button>
        </div>
      </footer>

      {/* ── Medicine Reminder Modal ── */}
      <AnimatePresence>
        {reminderModal && (
          <div className="reminder-overlay" onClick={() => setReminderModal(null)}>
            <motion.div
              className="reminder-modal"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reminder-modal-title"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="reminder-modal-header">
                <span id="reminder-modal-title">🔔 {bn ? 'ওষুধ রিমাইন্ডার' : 'Medicine Reminder'}</span>
                <button onClick={() => setReminderModal(null)} className="reminder-close" aria-label={bn ? 'বাতিল' : 'Cancel'}><X size={16}/></button>
              </div>
              <p className="reminder-med-label">💊 {reminderModal.medicine}</p>
              <p className="reminder-sub">{bn ? 'কখন মনে করিয়ে দেব?' : 'When should we remind you?'}</p>
              <div className="reminder-slots">
                {[
                  { key: 'morning',   label: bn ? '🌅 সকাল ৮টা'   : '🌅 8:00 AM'  },
                  { key: 'afternoon', label: bn ? '☀️ দুপুর ২টা'  : '☀️ 2:00 PM'  },
                  { key: 'night',     label: bn ? '🌙 রাত ৮টা'      : '🌙 8:00 PM'  },
                ].map(slot => (
                  <label key={slot.key} className={`reminder-slot-label ${reminderTimes[slot.key] ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={reminderTimes[slot.key]}
                      onChange={e => setReminderTimes(p => ({ ...p, [slot.key]: e.target.checked }))}
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
              <p className="reminder-sub">
                {bn ? 'নোটিফিকেশনের জন্য Veda অ্যাপটি খোলা রাখুন।' : 'Keep Veda open to receive these browser reminders.'}
              </p>
              <button className="reminder-save-btn" onClick={saveReminder}>
                {bn ? '✅ রিমাইন্ডার সেভ করুন' : '✅ Save Reminder'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
