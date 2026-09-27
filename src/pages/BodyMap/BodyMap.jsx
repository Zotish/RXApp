import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Activity, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { symptomsByRegion, conditionDatabase, getLocalized } from '../../data/medicalData';
import { t } from '../../i18n/translations';
import { useVoice } from '../../context/VoiceContext';
import './BodyMap.css';

const REGIONS = [
  { id: 'head', nameKey: 'cat_head', icon: '🧠', bg: '#eff3ed', border: '#78947d' },
  { id: 'chest', nameKey: 'cat_torso', icon: '🫀', bg: '#eff3ed', border: '#78947d' },
  { id: 'stomach', nameKey: 'cat_torso', icon: '🩺', bg: '#eff3ed', border: '#78947d' },
  { id: 'arm', nameKey: 'cat_limbs', icon: '💪', bg: '#eff3ed', border: '#78947d' },
  { id: 'leg', nameKey: 'cat_limbs', icon: '🦵', bg: '#eff3ed', border: '#78947d' },
  { id: 'back', nameKey: 'cat_torso', icon: '🧘', bg: '#eff3ed', border: '#78947d' },
  { id: 'neck', nameKey: 'cat_head', icon: '🗣️', bg: '#eff3ed', border: '#78947d' },
];

export default function BodyMap({ language = 'en' }) {
  const L = (key) => t(key, language);
  const [selectedRegion, setSelectedRegion] = useState('head');
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const { voiceEnabled, speak } = useVoice();

  const regions = REGIONS;

  const dataRegion = selectedRegion === 'leg' ? 'legs' : selectedRegion;
  const currentSymptoms = symptomsByRegion[dataRegion] || symptomsByRegion.head || [];
  const currentSymptomIds = currentSymptoms.map(symptom => symptom.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  const relatedConditions = conditionDatabase.filter(condition =>
    (!condition.family || condition.familyPrimary) &&
    (condition.matchSymptoms || []).some(symptom => currentSymptomIds.includes(symptom))
  ).slice(0, 4);

  const regionName = (id) => {
    const names = {
      head: language === 'bn' ? 'মাথা ও মুখ' : 'Head & Face',
      chest: language === 'bn' ? 'বুক ও ছাতি' : 'Chest & Heart',
      stomach: language === 'bn' ? 'পেট ও পাকস্থলী' : 'Stomach',
      arm: language === 'bn' ? 'হাত ও বাহু' : 'Arms & Hands',
      leg: language === 'bn' ? 'পা ও হাঁটু' : 'Legs & Feet',
      back: language === 'bn' ? 'পিঠ ও কোমর' : 'Back & Spine',
      neck: language === 'bn' ? 'গলা ও ঘাড়' : 'Neck & Throat',
    };
    return names[id] || id;
  };

  // Handle voice custom events
  useEffect(() => {
    const handleBodyArea = (e) => {
      const { area } = e.detail;
      if (area && regions.some(r => r.id === area)) {
        setSelectedRegion(area);
        setSelectedSymptom(null);
      }
    };

    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('মাথা') || lower.includes('head')) setSelectedRegion('head');
      else if (lower.includes('বুক') || lower.includes('chest')) setSelectedRegion('chest');
      else if (lower.includes('পেট') || lower.includes('stomach')) setSelectedRegion('stomach');
      else if (lower.includes('হাত') || lower.includes('arm')) setSelectedRegion('arm');
      else if (lower.includes('পা') || lower.includes('leg')) setSelectedRegion('leg');
      else if (lower.includes('পিঠ') || lower.includes('back')) setSelectedRegion('back');
      else if (lower.includes('গলা') || lower.includes('neck')) setSelectedRegion('neck');
    };

    window.addEventListener('voice-body-area', handleBodyArea);
    window.addEventListener('voice-page-command', handlePageCommand);

    return () => {
      window.removeEventListener('voice-body-area', handleBodyArea);
      window.removeEventListener('voice-page-command', handlePageCommand);
    };
  }, [language, regions]);

  return (
    <div className="bodymap-page" id="bodymap-page">
      <div className="bg-radial-glow" />
      <div className="bodymap-container">
        
        {/* Section Header */}
        <div className="section-header">
          <span className="section-label"><Activity size={14} /> {L('bmTitle')}</span>
          <h1 className="section-title"><span className="gradient-text">{L('bmTitle')}</span></h1>
          <p className="section-desc">
            {language === 'bn'
              ? 'যেখানে সমস্যা, সেই অংশটি নির্বাচন করুন।'
              : 'Select the area where you feel discomfort.'}
          </p>
        </div>

        <div className="bodymap-grid">
          
          {/* Left Panel: Body Regions Selector */}
          <div className="bodymap-selector-panel">
            <h3 className="panel-title"><User size={18} /> {language === 'bn' ? 'অঙ্গ নির্বাচন' : 'Body Region'}</h3>
            <div className="region-buttons-list">
              {regions.map((r) => (
                <button
                  key={r.id}
                  className={`region-btn ${selectedRegion === r.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRegion(r.id);
                    setSelectedSymptom(null);
                    if (voiceEnabled) speak(language === 'bn' ? `${regionName(r.id)} নির্বাচন করা হয়েছে` : `${regionName(r.id)} selected`);
                  }}
                  style={{
                    borderColor: selectedRegion === r.id ? r.border : 'rgba(255, 255, 255, 0.08)',
                    background: selectedRegion === r.id ? r.bg : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span className="region-icon">{r.icon}</span>
                  <span className="region-name">
                    {regionName(r.id)}
                  </span>
                  <ChevronRight size={16} className="arrow-icon" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Related Symptoms & Conditions */}
          <div className="bodymap-display-panel">
            <h3 className="panel-title"><Sparkles size={18} /> {language === 'bn' ? 'সংশ্লিষ্ট লক্ষণ ও সম্ভাব্য অবস্থা' : 'Related Symptoms'}</h3>
            
            <div className="symptoms-chip-list">
              {currentSymptoms.map((sym, idx) => (
                <motion.button
                  key={idx}
                  className={`symptom-chip-btn ${selectedSymptom === sym ? 'active' : ''}`}
                  onClick={() => setSelectedSymptom(sym)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {sym}
                </motion.button>
              ))}
            </div>

            {selectedSymptom && (
              <motion.div
                className="symptom-detail-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4><AlertCircle size={16} /> {selectedSymptom}</h4>
                <p>
                  {language === 'bn'
                    ? `এই লক্ষণটি মূলত ${selectedRegion} এর সাথে সম্পর্কিত। আরও বিস্তারিত জানতে লক্ষণ চেকারে অনুসন্ধান করতে পারেন।`
                    : `This symptom is primarily associated with the ${selectedRegion}. Use Symptom Checker for more detail.`}
                </p>
              </motion.div>
            )}

            {/* List of conditions for this region */}
            {relatedConditions.length > 0 && (
              <div className="region-conditions-list">
                <h4>{language === 'bn' ? 'সম্পর্কিত সাধারণ অবস্থা:' : 'Related Common Conditions:'}</h4>
                <div className="conditions-mini-cards">
                  {relatedConditions.map((cond) => (
                    <div key={cond.id} className="mini-cond-card">
                      <h5>{getLocalized(cond, 'name', language) || cond.name}</h5>
                      <p>{(getLocalized(cond, 'description', language) || cond.description)?.substring(0, 70)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
