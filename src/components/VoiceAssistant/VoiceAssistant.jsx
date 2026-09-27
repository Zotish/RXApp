import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './VoiceAssistant.css';

export default function VoiceAssistant({ language }) {
  const {
    voiceEnabled, speaking, listening, transcript, commandResult,
    voiceLang, toggleVoice, setLanguage, startDialog, lastPrompt,
    executeCommand, startListening, stopSpeaking, dialogState
  } = useVoice();
  const { user, loading: authLoading } = useAuth();

  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  const isBangla = voiceLang.startsWith('bn');

  useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (location.pathname === '/symptom-checker' && authLoading) return;
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;

    const routeDialogs = {
      '/symptom-checker': ['symptom-checker', 'asking_symptom'],
      '/first-aid': ['first-aid', 'asking_first_aid'],
      '/body-map': ['body-map', 'asking_body_area'],
      '/nearby': ['hospital', 'asking_hospital'],
      '/teleconsultation': ['teleconsultation', 'asking_consult'],
    };
    const target = routeDialogs[location.pathname];
    if (!target || dialogState === target[1]) return;
    if (location.pathname === '/symptom-checker' && !user) return;
    startDialog(target[0]);
  }, [location.pathname, voiceEnabled, startDialog, dialogState, authLoading, user]);

  // Context-aware voice command suggestions for each section
  const getSuggestions = () => {
    const p = location.pathname;
    if (p === '/symptom-checker') {
      return isBangla
        ? ['জ্বর ও কাশি', 'নবজাতক / শিশু', 'ওষুধের রিমাইন্ডার', 'ডাক্তার বুক করো']
        : ['Fever and cough', 'Child / Adult', 'Set reminder'];
    }
    if (p === '/first-aid') {
      return isBangla
        ? ['শ্বাসরোধ', 'রক্তক্ষরণ', 'অজ্ঞান', '৯৯৯ এ কল দাও']
        : ['Choking', 'Heavy bleeding', 'Fainting', 'Call 999'];
    }
    if (p === '/body-map') {
      return isBangla
        ? ['মাথা', 'বুক', 'পেট', 'হাত', 'পা']
        : ['Head', 'Chest', 'Stomach', 'Arm'];
    }
    if (p === '/nearby') {
      return isBangla
        ? ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'মাই লোকেশন', 'কল করো']
        : ['Dhaka', 'My location', 'Call hospital'];
    }
    if (p === '/teleconsultation') {
      return isBangla
        ? ['মেডিসিন', 'হৃদরোগ', 'শিশু বিশেষজ্ঞ', 'বুক করো']
        : ['Medicine', 'Cardiology', 'Book now'];
    }
    return isBangla
      ? ['লক্ষণ পরীক্ষা', 'প্রাথমিক চিকিৎসা', 'হাসপাতাল', 'বডি ম্যাপ']
      : ['Check symptoms', 'First aid', 'Hospitals'];
  };

  const suggestions = getSuggestions();

  const handleChipClick = (text) => {
    if (executeCommand) executeCommand(text);
  };

  const handleMicClick = () => {
    if (!voiceEnabled) {
      toggleVoice();
      return;
    }
    if (speaking) {
      stopSpeaking();
      setTimeout(() => startListening(), 120);
      return;
    }
    if (listening) {
      toggleVoice();
      return;
    }
    startListening();
  };

  return (
    <>
      <AnimatePresence>
        {voiceEnabled && (
          <motion.div
            className="voice-status-bar"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <div className="voice-status-header">
              {speaking ? (
                <div className="voice-status-indicator speaking">
                  <Volume2 size={18} className="voice-pulse-icon" />
                  <span>{isBangla ? 'ভয়েস বলছে...' : 'Assistant Speaking...'}</span>
                </div>
              ) : listening ? (
                <div className="voice-status-indicator listening">
                  <Mic size={18} className="voice-pulse-icon" />
                  <span>{isBangla ? 'আপনার কথা শুনছে...' : 'Listening...'}</span>
                </div>
              ) : (
                <button type="button" className="voice-status-indicator ready" onClick={() => startListening()}>
                  <Sparkles size={18} />
                  <span>{isBangla ? 'ভয়েস রেডি (মাইকে চাপুন)' : 'Voice Ready (Click Mic)'}</span>
                </button>
              )}

              {(speaking || listening) && (
                <div className="voice-equalizer">
                  <span className="bar b1"></span>
                  <span className="bar b2"></span>
                  <span className="bar b3"></span>
                  <span className="bar b4"></span>
                </div>
              )}
            </div>

            {lastPrompt && !transcript && (
              <div className="voice-prompt-text">
                {lastPrompt}
              </div>
            )}

            {transcript && (
              <div className="voice-transcript">
                <span className="voice-transcript-label">{isBangla ? 'আপনি বলেছেন:' : 'You said:'}</span> "{transcript}"
              </div>
            )}

            {commandResult && (
              <div className="voice-command-result">{commandResult}</div>
            )}

            <div className="voice-suggestions-chips">
              <span className="chip-label">{isBangla ? 'চাপুন বা বলুন:' : 'Tap or say:'}</span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => handleChipClick(s)}
                  style={{ cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''} ${speaking ? 'speaking' : ''} ${listening ? 'listening' : ''}`}
        onClick={handleMicClick}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1 }}
        title={voiceEnabled ? (isBangla ? 'শুনতে মাইক্রোফোনে চাপুন' : 'Click to listen') : (isBangla ? 'ভয়েস চালু করুন' : 'Enable voice')}
        aria-label={voiceEnabled ? (listening ? 'Disable voice listening' : 'Start voice listening') : 'Enable voice control'}
        aria-pressed={voiceEnabled}
        id="voice-toggle-btn"
      >
        {speaking ? (
          <Volume2 size={24} />
        ) : listening ? (
          <Mic size={24} />
        ) : voiceEnabled ? (
          <Mic size={24} />
        ) : (
          <MicOff size={24} />
        )}
      </motion.button>
    </>
  );
}
