import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Phone } from 'lucide-react';
import { firstAidActions, getLocalized } from '../../data/medicalData';
import { t } from '../../i18n/translations';
import { useVoice } from '../../context/VoiceContext';
import './FirstAid.css';

export default function FirstAid({ language = 'en' }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [voiceStepIndex, setVoiceStepIndex] = useState(-1);
  const L = (key) => t(key, language);

  const g = (action, field) => getLocalized(action, field, language);
  const { setPageBusy, speak } = useVoice();

  // ── Hybrid Dialog System: Listen for voice-first-aid-select & step events ──
  useEffect(() => {
    const handleFirstAidSelect = (e) => {
      const { type } = e.detail;
      if (!type) return;
      
      const typeMap = {
        choking: 'choking',
        bleeding: 'bleeding',
        fainting: 'fainting',
        heatstroke: 'heatstroke',
        snake_bite: 'snake_bite',
        electric_shock: 'electric_shock',
      };
      
      const actionId = typeMap[type] || type;
      const match = firstAidActions.find(a => a.id === actionId);
      if (match) {
        setSelectedAction(match);
        setVoiceStepIndex(-1);
        setPageBusy(false);
      }
    };

    const handleFirstAidStep = (e) => {
      const { action } = e.detail;
      if (action === 'emergency') {
        window.location.href = 'tel:999';
      } else if ((action === 'next' || action === 'prev') && selectedAction) {
        const steps = getLocalized(selectedAction, 'steps', language) || selectedAction.steps || [];
        setVoiceStepIndex(previous => {
          const next = action === 'next'
            ? Math.min(previous + 1, steps.length - 1)
            : Math.max(previous - 1, 0);
          const step = steps[next];
          if (step) {
            speak(language === 'bn' ? `ধাপ ${next + 1}: ${step}` : `Step ${next + 1}: ${step}`);
            requestAnimationFrame(() => document.getElementById(`firstaid-step-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          }
          return next;
        });
      }
    };

    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('ফিরে') || lower.includes('back') || lower.includes('বন্ধ')) {
        setSelectedAction(null);
        setVoiceStepIndex(-1);
      } else if (lower.includes('৯৯৯') || lower.includes('999') || lower.includes('জরুরী')) {
        window.location.href = 'tel:999';
      } else {
        const match = firstAidActions.find(a => {
          const title = (getLocalized(a, 'title', language) || a.title).toLowerCase();
          return title.includes(lower) || lower.includes(title.substring(0, 4));
        });
        if (match) setSelectedAction(match);
      }
    };

    window.addEventListener('voice-first-aid-select', handleFirstAidSelect);
    window.addEventListener('voice-first-aid-step', handleFirstAidStep);
    window.addEventListener('voice-page-command', handlePageCommand);

    return () => {
      window.removeEventListener('voice-first-aid-select', handleFirstAidSelect);
      window.removeEventListener('voice-first-aid-step', handleFirstAidStep);
      window.removeEventListener('voice-page-command', handlePageCommand);
      setPageBusy(false);
    };
  }, [language, selectedAction, setPageBusy, speak]);

  return (
    <div className="firstaid-page" id="first-aid-page">
      <div className="bg-radial-glow" />
      <div className="firstaid-container">
        <h1 className="sr-only">{L('faTitle')}</h1>

        <AnimatePresence mode="wait">
          {!selectedAction ? (
            <motion.div key="grid" className="firstaid-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} id="firstaid-grid">
              {firstAidActions.map((action, i) => (
                <motion.button key={action.id} type="button" className="firstaid-card" onClick={() => { setSelectedAction(action); setVoiceStepIndex(-1); }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} id={`firstaid-${action.id}`}>
                  <div className="firstaid-card-icon">{action.icon}</div>
                  <div className="firstaid-card-copy">
                    <h3 className="firstaid-card-title">{g(action, 'title') || action.title}</h3>
                    <span className={`firstaid-card-urgency urgency-${action.urgency}`}>{L(`urgency_${action.urgency}`) || action.urgency}</span>
                  </div>
                  <ChevronRight size={19} className="firstaid-card-arrow" />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key="detail" className="firstaid-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} id="firstaid-detail-view">
              <button className="detail-back-btn" onClick={() => { setSelectedAction(null); setVoiceStepIndex(-1); }} id="firstaid-back-btn">
                <ArrowLeft size={16} />{L('backToAll')}
              </button>
              <div className="detail-header">
                <span className="detail-icon">{selectedAction.icon}</span>
                <div>
                  <h2 className="detail-title">{g(selectedAction, 'title') || selectedAction.title}</h2>
                  <span className={`firstaid-card-urgency urgency-${selectedAction.urgency} detail-urgency`}>
                    {L(`urgency_${selectedAction.urgency}`) || selectedAction.urgency} — {L('actQuickly')}
                  </span>
                </div>
              </div>
              <ol className="steps-list" id="firstaid-steps">
                {(g(selectedAction, 'steps') || selectedAction.steps || []).map((step, i) => (
                  <motion.li key={i} id={`firstaid-step-${i}`} className={`step-item${voiceStepIndex === i ? ' active' : ''}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    {step}
                  </motion.li>
                ))}
              </ol>
              <div className="disclaimer-bar" style={{ marginTop: '32px' }}>
                <p style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>
                  ⚠️ {L('faDisclaimer')}
                </p>
              </div>
              <a href="tel:999" className="emergency-btn" style={{ marginTop: '16px', display: 'inline-flex' }}>
                <Phone size={18} /> {language === 'bn' ? 'জরুরি কল ৯৯৯' : 'Call emergency 999'}
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
