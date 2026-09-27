import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../i18n/translations';
import './AgeSelect.css';

const AGE_GROUPS = [
  { id: 'infant',   icon: '👶', titleKey: 'ageSelect_infant',   rangeKey: 'ageSelect_infantRange', color: '#567b69' },
  { id: 'child_s',  icon: '🧒', titleKey: 'ageSelect_child_s',  rangeKey: 'ageSelect_child_sRange', color: '#6f8f70' },
  { id: 'child',    icon: '🧒', titleKey: 'ageSelect_child',    rangeKey: 'ageSelect_childRange', color: '#7f966f' },
  { id: 'teen',     icon: '🧑', titleKey: 'ageSelect_teen',     rangeKey: 'ageSelect_teenRange', color: '#6b8178' },
  { id: 'adult',    icon: '🧑‍💼', titleKey: 'ageSelect_adult',  rangeKey: 'ageSelect_adultRange', color: '#826f65' },
];

export default function AgeSelect({ language = 'en', onSelect }) {
  const L = (key) => t(key, language);
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (selected) onSelect(selected);
  };

  const handleSkip = () => {
    onSelect('adult');
  };

  return (
    <AnimatePresence>
      <motion.div
        className="age-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="age-bg-radial" />
        <motion.div
          className="age-modal"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="age-header">
            <div className="age-logo">🏥</div>
            <h1 className="age-title">{L('ageSelect_title')}</h1>
            <p className="age-subtitle">{L('ageSelect_subtitle')}</p>
          </div>

          <div className="age-grid">
            {AGE_GROUPS.map((group, i) => (
              <motion.button
                key={group.id}
                className={`age-card ${selected === group.id ? 'selected' : ''}`}
                style={{ '--card-color': group.color }}
                onClick={() => setSelected(group.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="age-card-icon">{group.icon}</span>
                <span className="age-card-name">{L(group.titleKey)}</span>
                <span className="age-card-range">{L(group.rangeKey)}</span>
                {selected === group.id && (
                  <motion.div
                    className="age-card-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >✓</motion.div>
                )}
              </motion.button>
            ))}
          </div>

          <div className="age-actions">
            <motion.button
              className="age-continue-btn"
              onClick={handleContinue}
              disabled={!selected}
              whileHover={selected ? { scale: 1.02 } : {}}
              whileTap={selected ? { scale: 0.98 } : {}}
            >
              {L('ageSelect_continue')}
            </motion.button>
            <button className="age-skip-btn" onClick={handleSkip}>
              {L('ageSelect_skip')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
