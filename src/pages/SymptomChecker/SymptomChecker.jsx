import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, MicOff, X, Sparkles, Pill, ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { conditionDatabase, commonSymptoms, getLocalized, resolveConditionForAge, agesAvailableFor } from '../../data/medicalData';
import { publicAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { t } from '../../i18n/translations';
import './SymptomChecker.css';

const AGE_GROUPS = [
  { id: 'infant',  icon: '👶', labelKey: 'sc_age_infant',  color: '#567b69' },
  { id: 'child_s', icon: '🧒', labelKey: 'sc_age_child_s', color: '#6f8f70' },
  { id: 'child',   icon: '🧒', labelKey: 'sc_age_child',   color: '#7f966f' },
  { id: 'teen',    icon: '🧑', labelKey: 'sc_age_teen',    color: '#6b8178' },
  { id: 'adult',   icon: '🧑‍💼', labelKey: 'sc_age_adult', color: '#826f65' },
];

export default function SymptomChecker({ language = 'en' }) {
  const L = (key) => t(key, language);
  const { user } = useAuth();
  const { speaking, listening, startListening } = useVoice();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showDropdown, setShowDropdown] = useState(Boolean(initialQuery));
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedAge, setSelectedAge] = useState(null);
  const [output, setOutput] = useState(null);
  const [reminderModal, setReminderModal] = useState(null);
  const [reminderTimes, setReminderTimes] = useState({ morning: true, afternoon: false, night: true });
  const [reminderSaved, setReminderSaved] = useState({});

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filter conditions by search (Strict Pattern Matching) ──
  const filteredConditions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    const nameExact = [];
    const namePrefix = [];
    const nameContains = [];
    const aliasExact = [];
    const aliasPrefix = [];
    const aliasContains = [];

    conditionDatabase.forEach((c) => {
      if (c.family && !c.familyPrimary) return;
      const en = (c.name || '').toLowerCase();
      const bn = (c.translations?.bn?.name || '').toLowerCase();
      const aliases = (c.matchSymptoms || []).map((s) => s.toLowerCase());

      if (en === q || bn === q) {
        nameExact.push(c);
      } else if (en.startsWith(q) || bn.startsWith(q)) {
        namePrefix.push(c);
      } else if (en.includes(q) || bn.includes(q)) {
        nameContains.push(c);
      } else if (aliases.some((a) => a === q)) {
        aliasExact.push(c);
      } else if (aliases.some((a) => a.startsWith(q))) {
        aliasPrefix.push(c);
      } else if (aliases.some((a) => a.includes(q))) {
        aliasContains.push(c);
      }
    });

    // Tier 1: Exact disease name in English or Bengali
    if (nameExact.length > 0) return nameExact;
    // Tier 2: Prefix match on disease name
    if (namePrefix.length > 0) return namePrefix;
    // Tier 3: Exact match on condition alias/synonym
    if (aliasExact.length > 0) return aliasExact;
    // Tier 4: Disease name contains query
    if (nameContains.length > 0) return nameContains;
    // Tier 5: Alias prefix match
    if (aliasPrefix.length > 0) return aliasPrefix;
    // Tier 6: Alias contains query
    if (aliasContains.length > 0) return aliasContains;

    return [];
  }, [searchQuery, language]);

  const ageOptions = useMemo(
    () => (selectedCondition ? agesAvailableFor(selectedCondition) : []),
    [selectedCondition]
  );

  // ── Voice input ──
  const handleVoice = () => {
    startListening((transcript) => {
      if (transcript && transcript.trim()) {
        setSearchQuery(transcript);
        setShowDropdown(true);
      }
    });
  };

  // ── Select condition ──
  const handleSelectCondition = useCallback((condition) => {
    setSelectedCondition(condition);
    setSelectedAge(null);
    setOutput(null);
    setSearchQuery(getLocalized(condition, 'name', language) || condition.name);
    setShowDropdown(false);
  }, [language]);

  // Auto-select condition if id or exact match passed in URL
  const initialId = searchParams.get('id') || '';
  useEffect(() => {
    if (initialId) {
      const match = conditionDatabase.find(c => c.id === initialId);
      if (match) {
        handleSelectCondition(match);
      }
    } else if (initialQuery) {
      const exact = conditionDatabase.find(c => {
        const en = (c.name || '').toLowerCase();
        const bn = (c.translations?.bn?.name || '').toLowerCase();
        const q = initialQuery.toLowerCase().trim();
        return en === q || bn === q;
      });
      if (exact) {
        handleSelectCondition(exact);
      }
    }
  }, [initialId, initialQuery, handleSelectCondition]);

  // ── Clear selection ──
  const handleClearSelection = () => {
    setSelectedCondition(null);
    setSelectedAge(null);
    setOutput(null);
    setSearchQuery('');
  };

  const asList = (value) => (Array.isArray(value) ? value : []);

  // ── Select age and generate output ──
  const handleSelectAge = useCallback((ageId) => {
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

    const conditionName = getLocalized(resolved, 'name', language) || resolved.name;
    publicAPI.logSymptomCheck({
      symptoms: resolved.matchSymptoms || [resolved.id],
      matched_conditions: [conditionName],
      follow_up_answers: { age_group: ageId },
      condition_id: resolved.id,
      condition_name: conditionName,
      age_group: ageId,
    }).catch(() => { /* ignore */ });
    try {
      const prev = JSON.parse(localStorage.getItem('veda_local_history') || '[]');
      prev.unshift({
        id: Date.now(),
        condition_id: resolved.id,
        condition_name: conditionName,
        symptoms: resolved.matchSymptoms || [conditionName],
        matched_conditions: [conditionName],
        age_group: ageId,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('veda_local_history', JSON.stringify(prev.slice(0, 50)));
    } catch { /* ignore */ }
  }, [selectedCondition, language]);

  const gc = (condition, field) => getLocalized(condition, field, language);

  // ── Dialog System Events (Hybrid Voice Control) ──
  useEffect(() => {
    const handleSymptomsSelected = (e) => {
      const { symptoms } = e.detail;
      if (symptoms && symptoms.length > 0) {
        // Auto-select first matched condition from symptoms
        const matched = conditionDatabase.find(c => {
          if (c.family && !c.familyPrimary) return false;
          const matchSyms = c.matchSymptoms || [];
          return symptoms.some(s => matchSyms.includes(s));
        });
        if (matched) {
          handleSelectCondition(matched);
        } else {
          // Try searching for first symptom
          const firstSym = commonSymptoms.find(s => s.id === symptoms[0]);
          if (firstSym) {
            const label = getLocalized(firstSym, 'label', language) || firstSym.label;
            setSearchQuery(label);
            setShowDropdown(true);
          }
        }
      }
    };

    const handleSymptomComplete = (e) => {
      const { ageGroup } = e.detail;
      if (selectedCondition) {
        const userAge = ageGroup || user?.age_group || 'adult';
        const available = agesAvailableFor(selectedCondition);
        const ageId = available.includes(userAge) ? userAge : (available[available.length - 1] || 'adult');
        handleSelectAge(ageId);
      }
    };

    const handleAgeSelected = (e) => {
      if (selectedCondition && e.detail?.ageGroup) setSelectedAge(e.detail.ageGroup);
    };

    const handleSymptomSearch = (e) => {
      const { query } = e.detail;
      if (query) {
        setSearchQuery(query);
        setShowDropdown(true);
        const matched = conditionDatabase.find(c => {
          if (c.family && !c.familyPrimary) return false;
          const name = (getLocalized(c, 'name', language) || c.name).toLowerCase();
          const bn = (c.translations?.bn?.name || '').toLowerCase();
          const q = query.toLowerCase();
          return name.includes(q) || bn.includes(q);
        });
        if (matched) handleSelectCondition(matched);
      }
    };

    const handleSetReminder = () => {
      if (output?.condition) setReminderModal(output.condition);
      else if (selectedCondition) setReminderModal(selectedCondition);
    };

    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('নবজাতক') || lower.includes('infant')) handleSelectAge('infant');
      else if (lower.includes('ছোট বাচ্চা') || lower.includes('young child')) handleSelectAge('child_s');
      else if (lower.includes('কিশোর') || lower.includes('teen')) handleSelectAge('teen');
      else if (lower.includes('প্রাপ্তবয়স্ক') || lower.includes('adult')) handleSelectAge('adult');
      else if (lower.includes('শিশু') || lower.includes('child')) handleSelectAge('child');
      else if (lower.includes('রিমাইন্ডার') || lower.includes('reminder')) handleSetReminder();
    };

    window.addEventListener('voice-symptoms-selected', handleSymptomsSelected);
    window.addEventListener('voice-symptom-complete', handleSymptomComplete);
    window.addEventListener('voice-age-selected', handleAgeSelected);
    window.addEventListener('voice-symptom-search', handleSymptomSearch);
    window.addEventListener('voice-set-reminder', handleSetReminder);
    window.addEventListener('voice-page-command', handlePageCommand);

    return () => {
      window.removeEventListener('voice-symptoms-selected', handleSymptomsSelected);
      window.removeEventListener('voice-symptom-complete', handleSymptomComplete);
      window.removeEventListener('voice-age-selected', handleAgeSelected);
      window.removeEventListener('voice-symptom-search', handleSymptomSearch);
      window.removeEventListener('voice-set-reminder', handleSetReminder);
      window.removeEventListener('voice-page-command', handlePageCommand);
    };
  }, [user, selectedCondition, language, output, handleSelectAge, handleSelectCondition]);

  useEffect(() => {
    if (!reminderModal) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setReminderModal(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [reminderModal]);

  // ── Medicine Reminder ──
  const openReminder = (med, conditionName) => {
    setReminderModal({ medicine: med.name, condition: conditionName });
    setReminderTimes({ morning: true, afternoon: false, night: true });
  };

  const saveReminder = async () => {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert(language === 'bn' ? 'নোটিফিকেশনের অনুমতি দিন' : 'Please allow notifications in browser settings');
        return;
      }
    }
    const times = [];
    if (reminderTimes.morning)   times.push('08:00');
    if (reminderTimes.afternoon) times.push('14:00');
    if (reminderTimes.night)     times.push('20:00');
    if (!times.length) { alert(language === 'bn' ? 'অন্তত একটি সময় বেছে নিন' : 'Pick at least one time'); return; }
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

  return (
    <div className="symptom-page" id="symptom-checker-page">
      <div className="bg-radial-glow" />
      <div className="symptom-container">

        {/* ── Step 1: Search Box ── */}
        {!output && (
          <motion.div
            className="sc-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="sc-step-indicator">
              <span className="sc-step-badge active">1</span>
              <span className="sc-step-label">{language === 'bn' ? 'কী সমস্যা হচ্ছে?' : 'What are you feeling?'}</span>
              {selectedCondition && <span className="sc-step-check">✓</span>}
            </div>

            <div className="search-wrapper" ref={searchRef}>
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={language === 'bn' ? 'যেমন: জ্বর বা মাথাব্যথা' : 'Try: fever or headache'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedCondition) {
                    setSelectedCondition(null);
                    setSelectedAge(null);
                    setOutput(null);
                  }
                }}
                onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                id="symptom-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSelection}
                  aria-label={language === 'bn' ? 'লেখা মুছুন' : 'Clear search'}
                >
                  <X size={16} />
                </button>
              )}
              <button
                className={`voice-btn ${listening ? 'listening' : ''}`}
                onClick={handleVoice}
                disabled={speaking}
                title={L('voiceSearch')}
                id="voice-input-btn"
                style={searchQuery ? { right: '52px' } : {}}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* ── Dropdown ── */}
              <AnimatePresence>
                {showDropdown && filteredConditions.length > 0 && !selectedCondition && (
                  <motion.div
                    className="search-dropdown"
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="dropdown-header">
                      {L('sc_foundConditions')}: {filteredConditions.length}
                    </div>
                    {filteredConditions.map((condition) => (
                      <button
                        key={condition.id}
                        className="dropdown-item"
                        onClick={() => handleSelectCondition(condition)}
                      >
                        <div className="dropdown-item-left">
                          <span className="dropdown-item-name">
                            {gc(condition, 'name') || condition.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── No results ── */}
              <AnimatePresence>
                {showDropdown && searchQuery.trim() && filteredConditions.length === 0 && !selectedCondition && (
                  <motion.div
                    className="search-dropdown empty"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <span className="dropdown-empty-icon">🔍</span>
                    <span>{L('noConditionsFound')}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Selected Condition Chip ── */}
            <AnimatePresence>
              {selectedCondition && !output && (
                <motion.div
                  className="selected-condition-chip"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="selected-chip-info">
                    <span className="selected-chip-name">{gc(selectedCondition, 'name') || selectedCondition.name}</span>
                  </div>
                  <button
                    type="button"
                    className="selected-chip-remove"
                    onClick={handleClearSelection}
                    aria-label={language === 'bn' ? 'নির্বাচন সরান' : 'Remove selection'}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
              </AnimatePresence>
          </motion.div>
        )}

        {/* ── Step 2: Age Selection ── */}
        <AnimatePresence>
          {selectedCondition && !output && (
            <motion.div
              className="sc-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="sc-step-indicator">
                <span className="sc-step-badge active">2</span>
                <span className="sc-step-label">{L('sc_step2')}</span>
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
                      title={enabled ? undefined : (language === 'bn' ? 'এই বয়সের জন্য নোট নেই' : 'No notebook protocol for this age')}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      whileHover={enabled ? { y: -3 } : undefined}
                      whileTap={enabled ? { scale: 0.97 } : undefined}
                    >
                      <span className="age-card-icon">{group.icon}</span>
                      <span className="age-card-label">{L(group.labelKey)}</span>
                      {selectedAge === group.id && (
                        <motion.span
                          className="age-card-check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >✓</motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 3: Output ── */}
        <AnimatePresence>
          {output?.condition && (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              id="results-section"
            >
              {/* ── Back & header ── */}
              <div className="output-header">
                <button className="output-back-btn" onClick={handleClearSelection}>
                  ← {L('backToAll')}
                </button>
                <span className="output-age-badge">
                  {AGE_GROUPS.find(g => g.id === selectedAge)?.icon} {L(AGE_GROUPS.find(g => g.id === selectedAge)?.labelKey)}
                </span>
              </div>

              <div className="result-card" id={`result-${output.condition?.id || 'unknown'}`}>
                <div className="result-header">
                  <h3 className="result-name">
                    {gc(output.condition, 'name') || output.condition.name}
                  </h3>
                </div>

                {/* ── Medicines ── */}
                {output.condition.medicines && output.condition.medicines.length > 0 && (
                  <>
                    <h4 className="result-section-title">
                      <Pill size={16} style={{ color: 'var(--color-accent-primary)' }} />
                      {L('recommendedMedicines')}
                    </h4>
                    <div className="medicines-table">
                      <div className="medicine-header">
                        <span>{L('recommendedMedicines').split(' ')[0]}</span>
                        <span>{L('medDose')}</span>
                        <span>{L('medTiming')}</span>
                        <span>{L('medDuration')}</span>
                      </div>
                      {output.condition.medicines.map((med, j) => {
                        const mt = med.translations?.[language];
                        return (
                          <div key={j} className="medicine-row">
                            <span className="med-name">{med.name}</span>
                            <span className="med-dose">{med.dose}</span>
                            <span className="med-timing">{mt?.timing || med.timing}</span>
                            <span className="med-duration">{mt?.duration || med.duration}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Notebook Notes (if any present in photo) ── */}
                {output.condition.general_instructions && (
                  <div className="notebook-notes" style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--color-surface-subtle)', borderRadius: '8px', borderLeft: '4px solid var(--color-accent-primary)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--color-accent-primary)' }} />
                      {language === 'bn' ? 'নোটবুক নির্দেশনা' : 'Prescription Notes'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                      {output.condition.general_instructions}
                    </p>
                  </div>
                )}
              </div>

              <div className="disclaimer-bar" id="disclaimer">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p>{L('disclaimer')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                <span id="reminder-modal-title">🔔 {language === 'bn' ? 'ওষুধ রিমাইন্ডার' : 'Medicine Reminder'}</span>
                <button onClick={() => setReminderModal(null)} className="reminder-close" aria-label={L('cancel')}><X size={16}/></button>
              </div>
              <p className="reminder-med-label">💊 {reminderModal.medicine}</p>
              <p className="reminder-sub">{language === 'bn' ? 'কখন মনে করিয়ে দেব?' : 'When should we remind you?'}</p>
              <div className="reminder-slots">
                {[
                  { key: 'morning',   label: language === 'bn' ? '🌅 সকাল ৮টা'   : '🌅 8:00 AM'  },
                  { key: 'afternoon', label: language === 'bn' ? '☀️ দুপুর ২টা'  : '☀️ 2:00 PM'  },
                  { key: 'night',     label: language === 'bn' ? '🌙 রাত ৮টা'      : '🌙 8:00 PM'  },
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
                {language === 'bn' ? 'নোটিফিকেশনের জন্য Veda অ্যাপটি খোলা রাখুন।' : 'Keep Veda open to receive these browser reminders.'}
              </p>
              <button className="reminder-save-btn" onClick={saveReminder}>
                {language === 'bn' ? '✅ রিমাইন্ডার সেভ করুন' : '✅ Save Reminder'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
