/* eslint-disable react-refresh/only-export-components, react-hooks/refs */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const VoiceContext = createContext(null);

// ============================================================
// DIALOG STATE MACHINE — The brain of interactive voice
// ============================================================
const DIALOG_STATES = {
  IDLE: 'idle',
  GREETING: 'greeting',
  MAIN_MENU: 'main_menu',
  ASKING_NAME: 'asking_name',
  ASKING_AGE: 'asking_age',
  ASKING_SYMPTOM: 'asking_symptom',
  ASKING_SYMPTOM_CONFIRM: 'asking_symptom_confirm',
  ASKING_BODY_AREA: 'asking_body_area',
  ASKING_SEVERITY: 'asking_severity',
  ASKING_DURATION: 'asking_duration',
  SHOWING_RESULTS: 'showing_results',
  ASKING_FIRST_AID: 'asking_first_aid',
  SHOWING_FIRST_AID: 'showing_first_aid',
  ASKING_HOSPITAL: 'asking_hospital',
  ASKING_LOCATION: 'asking_location',
  SHOWING_HOSPITALS: 'showing_hospitals',
  ASKING_CONSULT: 'asking_consult',
  ASKING_DOCTOR_PREFERENCE: 'asking_doctor_preference',
  BOOKING_APPOINTMENT: 'booking_appointment',
  ASKING_LANGUAGE: 'asking_language',
  ASKING_FEEDBACK: 'asking_feedback',
  CONFIRM_LOGOUT: 'confirm_logout',
  CONFIRM_ACTION: 'confirm_action',
  ERROR_RETRY: 'error_retry',
};

export function VoiceProvider({ children }) {
  // ─── Core voice state ───
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLang, setVoiceLang] = useState('bn-BD'); // Default to bn-BD for Bangladesh
  const [commandResult, setCommandResult] = useState('');

  // ─── Dialog System State ───
  const [dialogState, setDialogState] = useState(DIALOG_STATES.IDLE);
  const [dialogData, setDialogData] = useState({});
  const [dialogHistory, setDialogHistory] = useState([]);
  const [lastPrompt, setLastPrompt] = useState('');
  const [, setRetryCount] = useState(0);
  const [isDialogActive, setIsDialogActive] = useState(false);
  const [, setPendingAction] = useState(null);
  const [pageBusy, setPageBusyState] = useState(false);

  // ─── Synchronized Live Execution Refs ───
  const voiceEnabledRef = useRef(false);
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const isDialogActiveRef = useRef(false);
  const dialogDataRef = useRef({});
  const dialogStarterRef = useRef(null);

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);
  const dialogCallbackRef = useRef(null);
  const onResultHandlerRef = useRef(null);
  const onErrorHandlerRef = useRef(null);
  const startListeningRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Synchronizers for React state + Refs
  const updateSpeaking = (val) => {
    speakingRef.current = val;
    setSpeaking(val);
  };

  const updateListening = (val) => {
    listeningRef.current = val;
    setListening(val);
  };

  const updateVoiceEnabled = (val) => {
    voiceEnabledRef.current = val;
    setVoiceEnabled(val);
  };

  const updateIsDialogActive = (val) => {
    isDialogActiveRef.current = val;
    setIsDialogActive(val);
  };

  // ─── Language Helpers ───
  const isBangla = voiceLang.startsWith('bn');

  const t = useCallback((bn, en) => (isBangla ? bn || en : en || bn), [isBangla]);

  const mergeDialogData = (patch) => {
    const next = { ...dialogDataRef.current, ...patch };
    dialogDataRef.current = next;
    setDialogData(next);
    return next;
  };

  // Check login status helper
  const isLoggedIn = () => {
    return !!localStorage.getItem('veda_token');
  };

  // ─── Speech Synthesis ───
  const speak = useCallback((text, lang = null) => {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    return new Promise((resolve) => {
      // Abort active listening synchronously so mic doesn't capture assistant's own voice
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch { /* Recognition may already be stopped. */ }
      }
      updateListening(false);

      try { window.speechSynthesis.cancel(); } catch { /* Synthesis may be unavailable. */ }

      const utterance = new SpeechSynthesisUtterance(text);
      const hasBanglaText = /[\u0980-\u09FF]/.test(text);
      utterance.lang = lang || (hasBanglaText ? 'bn-BD' : voiceLang);
      utterance.rate = 0.95;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        updateSpeaking(false);
        // ALWAYS auto-start listening loop after speaking if voice is enabled!
        if (voiceEnabledRef.current) {
          setTimeout(() => {
            if (voiceEnabledRef.current && !speakingRef.current && !listeningRef.current) {
              startListeningRef.current?.();
            }
          }, 350);
        }
        resolve();
      };

      // Fallback safety timer for browser speech synthesis bugs
      const maxMs = Math.max(3000, text.length * 120);
      const safeTimer = setTimeout(finish, maxMs);

      utterance.onstart = () => updateSpeaking(true);
      utterance.onend = () => { clearTimeout(safeTimer); finish(); };
      utterance.onerror = () => { clearTimeout(safeTimer); finish(); };

      window.speechSynthesis.speak(utterance);
    });
  }, [voiceLang]);

  const speakAndListen = useCallback((text) => {
    return speak(text);
  }, [speak]);

  // ─── Speech Recognition (Auto-Continuous Loop) ───
  const startListeningInternal = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCommandResult(t('ভয়েস সাপোর্ট নেই।', 'Voice is not supported in this browser.', 'वॉइस सपोर्ट नहीं है।'));
      return;
    }

    // Never start mic while assistant is speaking out loud
    if (speakingRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch { /* Recognition may already be stopped. */ }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isBangla ? 'bn-BD' : voiceLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      updateListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => onResultHandlerRef.current?.(event);
    recognition.onerror = (event) => onErrorHandlerRef.current?.(event);

    recognition.onend = () => {
      updateListening(false);
      // Continuous Auto-restart listening loop
      if (voiceEnabledRef.current && !speakingRef.current) {
        setTimeout(() => {
          if (voiceEnabledRef.current && !speakingRef.current && !listeningRef.current) {
            startListeningRef.current?.();
          }
        }, 400);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      updateListening(false);
    }
  }, [voiceLang, isBangla, t]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch { /* Recognition may already be stopped. */ }
      recognitionRef.current = null;
    }
    updateListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { /* Synthesis may be unavailable. */ }
    updateSpeaking(false);
  }, []);

  // ─── Global Commands ───
  const globalCommands = () => {
    const bn = {
      'ভয়েস বন্ধ করো': 'voice_off', 'বন্ধ করো': 'voice_off', 'থামো': 'voice_off',
      'চুপ করো': 'voice_off', 'ভয়েস বন্ধ': 'voice_off', 'সাইলেন্ট': 'voice_off',
      'হোমে যাও': 'goto_home', 'হোম': 'goto_home', 'মূল পৃষ্ঠা': 'goto_home',
      'আগে যা বলেছি': 'repeat', 'আবার বলো': 'repeat', 'পুনরাবৃত্তি': 'repeat',
      'হেল্প': 'help', 'সাহায্য': 'help', 'কী করতে পারি': 'help',
      'মেনু': 'menu', 'মূল মেনু': 'menu',
    };
    const en = {
      'turn off voice': 'voice_off', 'stop voice': 'voice_off', 'be quiet': 'voice_off',
      'shut up': 'voice_off', 'disable voice': 'voice_off', 'silent': 'voice_off',
      'go home': 'goto_home', 'home': 'goto_home', 'main page': 'goto_home',
      'repeat that': 'repeat', 'say again': 'repeat', 'what did you say': 'repeat',
      'help': 'help', 'what can i do': 'help', 'what can you do': 'help',
      'menu': 'menu', 'main menu': 'menu',
    };
    return isBangla ? bn : en;
  };

  const processGlobalCommand = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase().trim();
    const commands = globalCommands();
    for (const [pattern, action] of Object.entries(commands)) {
      if (lower.includes(pattern)) return action;
    }
    return null;
  };

  const handleGlobalAction = (action) => {
    switch (action) {
      case 'voice_off':
        speak(t('ভয়েস বন্ধ করছি।', 'Turning off voice. Goodbye!', 'वॉइस बंद कर रहा हूं।')).then(() => {
          updateVoiceEnabled(false);
          resetDialog();
        });
        return;
      case 'goto_home':
        resetDialog();
        navigate('/');
        speak(t('হোম পেজে যাচ্ছি।', 'Going to home page.', 'होम पेज पर जा रहा हूं।'));
        return;
      case 'repeat':
        if (lastPrompt) speak(lastPrompt);
        else speak(t('আমার বলার মতো কিছু নেই।', 'I have nothing to repeat.', 'मेरे पास दोहराने के लिए कुछ नहीं है।'));
        return;
      case 'help': {
        const helpText = t(
          'আপনি বলতে পারেন: লক্ষণ পরীক্ষা, প্রাথমিক চিকিৎসা, হাসপাতাল খুঁজুন, টেলিকনসালটেশন, বডি ম্যাপ, অথবা ভয়েস বন্ধ করো।',
          'You can say: check symptoms, first aid, find hospitals, teleconsultation, body map, or turn off voice.',
          'आप कह सकते हैं: लक्षण जांच, प्राथमिक चिकित्सा, अस्पताल खोजें, टेलीकंसल्टेशन, बॉडी मैप, या आवाज़ बंद करो।'
        );
        speak(helpText);
        return;
      }
      case 'menu':
        enterMainMenu();
        return;
      default:
        return;
    }
  };

  // ─── Dialog System ───
  const resetDialog = useCallback(() => {
    setDialogState(DIALOG_STATES.IDLE);
    dialogDataRef.current = {};
    setDialogData({});
    setDialogHistory([]);
    setLastPrompt('');
    setRetryCount(0);
    isDialogActiveRef.current = false;
    setIsDialogActive(false);
    setPendingAction(null);
    dialogCallbackRef.current = null;
  }, []);

  const handleNoSpeech = () => {
    if (!voiceEnabledRef.current) return;
    setRetryCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        speak(t(
          'আমি আপনার কথা শুনছি। যেকোনো সময় কথা বলুন।',
          "I'm listening. Speak whenever you are ready.",
          'मैं सुन रहा हूं।'
        )).then(() => {
          setRetryCount(0);
        });
        return 0;
      }
      setTimeout(() => startListeningRef.current?.(), 400);
      return newCount;
    });
  };

  const handleDialogResponse = (text) => {
    setRetryCount(0);
    const lower = text.toLowerCase().trim();
    const dialogEntry = {
      state: dialogState,
      prompt: lastPrompt,
      response: text,
    };
    setDialogHistory(prev => [...prev, dialogEntry]);

    // Dispatch global page-command event for active page
    window.dispatchEvent(new CustomEvent('voice-page-command', {
      detail: { text, lower, path: location.pathname }
    }));

    switch (dialogState) {
      case DIALOG_STATES.MAIN_MENU:
        handleMainMenuResponse(lower, text);
        break;
      case DIALOG_STATES.ASKING_SYMPTOM:
        handleSymptomResponse(text, lower);
        break;
      case DIALOG_STATES.ASKING_AGE:
        handleAgeResponse(lower);
        break;
      case DIALOG_STATES.ASKING_SYMPTOM_CONFIRM:
        handleSymptomConfirmResponse(lower);
        break;
      case DIALOG_STATES.ASKING_BODY_AREA:
        handleBodyAreaResponse(text, lower);
        break;
      case DIALOG_STATES.ASKING_SEVERITY:
        handleSeverityResponse(lower);
        break;
      case DIALOG_STATES.ASKING_DURATION:
        handleDurationResponse(text);
        break;
      case DIALOG_STATES.SHOWING_RESULTS:
        handleShowingResultsResponse(lower);
        break;
      case DIALOG_STATES.ASKING_FIRST_AID:
        handleFirstAidMenuResponse(lower);
        break;
      case DIALOG_STATES.SHOWING_FIRST_AID:
        handleShowingFirstAidResponse(lower);
        break;
      case DIALOG_STATES.ASKING_HOSPITAL:
        handleHospitalMenuResponse(lower);
        break;
      case DIALOG_STATES.ASKING_LOCATION:
        handleLocationResponse(text);
        break;
      case DIALOG_STATES.SHOWING_HOSPITALS:
        handleShowingHospitalsResponse(lower);
        break;
      case DIALOG_STATES.ASKING_CONSULT:
        handleConsultResponse(lower);
        break;
      case DIALOG_STATES.ASKING_DOCTOR_PREFERENCE:
        handleDoctorPreferenceResponse(text);
        break;
      case DIALOG_STATES.CONFIRM_LOGOUT:
        handleConfirmLogoutResponse(lower);
        break;
      case DIALOG_STATES.CONFIRM_ACTION:
        handleConfirmActionResponse(lower);
        break;
      case DIALOG_STATES.ASKING_FEEDBACK:
        handleFeedbackResponse();
        break;
      case DIALOG_STATES.ASKING_LANGUAGE:
        handleLanguageResponse(lower);
        break;
      default:
        handleMainMenuResponse(lower, text);
    }
  };

  // Direct Command Execution (for text inputs or chip clicks)
  const executeCommand = (commandText) => {
    if (!commandText) return;
    setTranscript(commandText);
    handleDialogResponse(commandText);
  };

  // ─── GREETING + MAIN MENU ───
  const startGreeting = useCallback(() => {
    resetDialog();
    updateIsDialogActive(true);
    setDialogState(DIALOG_STATES.GREETING);
    const hour = new Date().getHours();
    let greeting;
    if (isBangla) {
      if (hour < 12) greeting = 'সুপ্রভাত!';
      else if (hour < 17) greeting = 'শুভ অপরাহ্ণ!';
      else greeting = 'শুভ সন্ধ্যা!';
    } else {
      if (hour < 12) greeting = 'Good morning!';
      else if (hour < 17) greeting = 'Good afternoon!';
      else greeting = 'Good evening!';
    }

    const promptText = t(
      `${greeting} ভেডায় স্বাগতম। বলুন: লক্ষণ পরীক্ষা, প্রাথমিক চিকিৎসা, হাসপাতাল, টেলিকনসালটেশন, বা বডি ম্যাপ।`,
      `${greeting} Welcome to Veda. Say: check symptoms, first aid, hospitals, teleconsultation, or body map.`,
      `${greeting} वेदा में आपका स्वागत है। कहें: लक्षण जांच, प्राथमिक चिकित्सा, अस्पताल, टेलीकंसल्टेशन, या बॉडी मैप।`
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
    setDialogState(DIALOG_STATES.MAIN_MENU);
  }, [isBangla, t, speakAndListen, resetDialog]);

  const enterMainMenu = useCallback(() => {
    updateIsDialogActive(true);
    setDialogState(DIALOG_STATES.MAIN_MENU);
    const promptText = t(
      'আপনি কী করতে চান? বলুন: লক্ষণ পরীক্ষা, প্রাথমিক চিকিৎসা, হাসপাতাল, টেলিকনসালটেশন, বডি ম্যাপ, বা ড্যাশবোর্ড।',
      'What would you like to do? Say: check symptoms, first aid, hospitals, teleconsultation, body map, or dashboard.',
      'आप क्या करना चाहेंगे? कहें: लक्षण जांच, प्राथमिक चिकित्सा, अस्पताल, टेलीकंसल्टेशन, बॉडी मैप, या डैशबोर्ड।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  }, [t, speakAndListen]);

  const handleMainMenuResponse = (lower, originalText) => {
    if (matchAny(lower, ['ভাষা', 'language', 'lang', 'भाषा'])) {
      startLanguageDialog();
      return;
    }

    if (matchAny(lower, ['লগ আউট', 'logout', 'sign out', 'लॉग आउट'])) {
      if (isLoggedIn()) startLogoutDialog();
      else speak(t('আপনি লগইন করা নেই।', 'You are not logged in.', 'आप लॉग इन नहीं हैं।'));
      return;
    }

    // Symptom Checker
    if (matchAny(lower, isBangla
      ? ['লক্ষণ', 'সিম্পটম', 'পরীক্ষা', 'চেক', 'চেকার', 'রোগ', 'অসুখ', 'সমস্যা', 'জ্বর', 'কাশি', 'ব্যথা']
      : ['symptom', 'check', 'pain', 'sick', 'illness', 'diagnose', 'fever', 'cough'])) {
      if (!isLoggedIn()) {
        navigate('/login?redirect=%2Fsymptom-checker');
        speak(t(
          'লক্ষণ পরীক্ষা করতে প্রথমে লগইন করুন। লগইন পৃষ্ঠা খোলা হয়েছে।',
          'Please log in before checking symptoms. The login page is open.',
          'लक्षण जांचने से पहले लॉग इन करें। लॉगिन पेज खुल गया है।'
        ));
        return;
      }
      navigate('/symptom-checker');
      startSymptomDialog();
      return;
    }

    // First Aid
    if (matchAny(lower, isBangla
      ? ['প্রাথমিক চিকিৎসা', 'ফার্স্ট এইড', 'first aid', 'জরুরি', 'চিকিৎসা', 'পোড়া', 'কাটা', 'জরুরী']
      : ['first aid', 'emergency', 'aid', 'injury', 'burn', 'wound', 'cpr'])) {
      navigate('/first-aid');
      startFirstAidDialog();
      return;
    }

    // Hospitals / Nearby
    if (matchAny(lower, isBangla
      ? ['হাসপাতাল', 'নিকটস্থ', 'কাছের', 'নিয়ারবাই', 'হসপিটাল', 'ঢাকা', 'চট্টগ্রাম', 'সিলেট']
      : ['hospital', 'nearby', 'near', 'clinic', 'find hospital'])) {
      navigate('/nearby');
      startHospitalDialog();
      return;
    }

    // Teleconsultation
    if (matchAny(lower, isBangla
      ? ['টেলিকনসালটেশন', 'ডাক্তার', 'অ্যাপয়েন্টমেন্ট', 'কনসাল্ট', 'পরামর্শ', 'ডাক্তার দেখাবো']
      : ['teleconsultation', 'doctor', 'appointment', 'consult', 'talk to doctor'])) {
      navigate('/teleconsultation');
      startConsultDialog();
      return;
    }

    // Body Map
    if (matchAny(lower, isBangla
      ? ['বডি ম্যাপ', 'শরীর', 'ম্যাপ', 'অঙ্গ', 'মাথা', 'বুক', 'পেট']
      : ['body map', 'body', 'anatomy', 'body part'])) {
      navigate('/body-map');
      startBodyMapDialog();
      return;
    }

    // Dashboard (Check Login State)
    if (matchAny(lower, isBangla
      ? ['ড্যাশবোর্ড', 'ড্যাসবোর্ড', 'প্রোফাইল', 'ইতিহাস', 'রিমাইন্ডার']
      : ['dashboard', 'profile', 'my account'])) {
      if (!isLoggedIn()) {
        navigate('/login');
        speak(t(
          'আপনার অ্যাকাউন্টে লগইন করা নেই। ড্যাশবোর্ড ও প্রোফাইল দেখতে দয়া করে প্রথমে লগইন করুন।',
          'You are not logged in. Please log in first to view dashboard.',
          'आप लॉग इन नहीं हैं। कृपया डैशबोर्ड देखने के लिए पहले लॉग इन करें।'
        ));
        return;
      }
      navigate('/dashboard');
      speak(t('ড্যাশবোর্ডে নিয়ে গেছি।', 'Taking you to dashboard.', 'ড্যাশবোর্ডে নিয়ে গেছি।'));
      return;
    }

    // Login / Register
    if (matchAny(lower, isBangla
      ? ['লগইন', 'লগ ইন', 'রেজিস্টার', 'সাইন ইন', 'সাইন আপ', 'একাউন্ট', 'অ্যাকাউন্ট']
      : ['login', 'log in', 'register', 'sign up'])) {
      navigate('/login');
      speak(t('লগইন পৃষ্ঠায় নিয়ে গেছি। আপনার ইমেইল ও পাসওয়ার্ড দিন।', 'Taking you to login page.', 'लॉगिन पेज पर ले गया हूं।'));
      return;
    }

    // Smart Fallback: Navigate to Symptom Checker automatically if speech heard
    if (originalText && originalText.trim().length > 1) {
      if (!isLoggedIn()) {
        speak(t(
          'কমান্ডটি বুঝতে পারিনি। লক্ষণ পরীক্ষা করতে চাইলে প্রথমে লগইন করুন।',
          "I didn't understand that command. Log in first if you want to check symptoms.",
          'कमांड समझ नहीं आया। लक्षण जांचने के लिए पहले लॉग इन करें।'
        ));
        return;
      }
      navigate('/symptom-checker');
      handleSymptomResponse(originalText, lower);
      return;
    }

    // Didn't understand — retry
    speak(t(
      'দুঃখিত, বুঝতে পারিনি। বলুন: লক্ষণ পরীক্ষা, প্রাথমিক চিকিৎসা, হাসপাতাল, টেলিকনসালটেশন, বা বডি ম্যাপ।',
      "Sorry, I didn't understand. Say: check symptoms, first aid, hospitals, teleconsultation, or body map.",
      'क्षमा करें, समझ नहीं पाया। कहें: लक्षण जांच, प्राथमिक चिकित्सा, अस्पताल, टेलीकंसल्टेशन, या बॉडी मैप।'
    )).then(() => {
      setDialogState(DIALOG_STATES.MAIN_MENU);
    });
  };

  // ─── SYMPTOM CHECKER DIALOG ───
  const startSymptomDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_SYMPTOM);
    updateIsDialogActive(true);
    const promptText = t(
      'লক্ষণ চেকারে স্বাগতম। আপনার সমস্যা বলুন — যেমন: জ্বর, কাশি, মাথা ব্যথা, পেট ব্যথা, বা ডেঙ্গু।',
      'Welcome to symptom checker. What symptoms do you have — e.g. fever, cough, headache, stomach pain, or dengue.',
      'लक्षण जांच में स्वागत है। अपने लक्षण बताइए — जैसे बुखार, खांसी, सिरदर्द, पेट दर्द।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleSymptomResponse = (text, lower) => {
    const extractedSymptoms = extractSymptoms(lower);
    window.dispatchEvent(new CustomEvent('voice-symptom-search', { detail: { query: text } }));

    if (extractedSymptoms.length === 0) {
      mergeDialogData({ symptoms: [text], rawText: text });
      speak(t(
        `"${text}" খোঁজা হচ্ছে। রোগীর বয়স বলুন: শিশু, কিশোর, বা প্রাপ্তবয়স্ক।`,
        `Searching for "${text}". Say patient age: child, teen, or adult.`,
        `"${text}" खोज रहा हूं। मरीज की उम्र बताइए: बच्चा, किशोर, या वयस्क।`
      )).then(() => {
        setDialogState(DIALOG_STATES.ASKING_AGE);
      });
      return;
    }

    mergeDialogData({ symptoms: extractedSymptoms, rawText: text });
    setDialogState(DIALOG_STATES.ASKING_SYMPTOM_CONFIRM);

    const symptomList = extractedSymptoms.join(', ');
    const promptText = t(
      `আপনার লক্ষণ: ${symptomList}। এটা কি সঠিক? হ্যাঁ বা না বলুন।`,
      `Your symptoms: ${symptomList}. Is that correct? Say yes or no.`,
      `आपके लक्षण: ${symptomList}। क्या यह सही है? हां या ना कहें।`
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);

    window.dispatchEvent(new CustomEvent('voice-symptoms-selected', { detail: { symptoms: extractedSymptoms } }));
  };

  const handleAgeResponse = (lower) => {
    let ageGroup = null;
    if (matchAny(lower, ['নবজাতক', 'infant', 'baby'])) ageGroup = 'infant';
    else if (matchAny(lower, ['ছোট বাচ্চা', 'young child', 'child_s'])) ageGroup = 'child_s';
    else if (matchAny(lower, ['কিশোর', 'teen', 'teenager'])) ageGroup = 'teen';
    else if (matchAny(lower, ['প্রাপ্তবয়স্ক', 'adult', 'grown', 'বয়স্ক', 'senior', 'elder'])) ageGroup = 'adult';
    else if (matchAny(lower, ['শিশু', 'বাচ্চা', 'child', 'kid'])) ageGroup = 'child';

    if (!ageGroup) {
      speak(t(
        'বয়স বুঝতে পারিনি। বলুন: নবজাতক, শিশু, কিশোর, বা প্রাপ্তবয়স্ক।',
        "I couldn't identify the age group. Say: infant, child, teen, or adult.",
        'उम्र समझ नहीं आई। कहें: शिशु, बच्चा, किशोर, या वयस्क।'
      ));
      return;
    }

    mergeDialogData({ ageGroup });
    window.dispatchEvent(new CustomEvent('voice-age-selected', { detail: { ageGroup } }));
    setDialogState(DIALOG_STATES.ASKING_SEVERITY);
    const promptText = t(
      'সমস্যা কতটা মারাত্মক? হালকা, মাঝারি, না গুরুতর?',
      'How severe is the problem? Mild, moderate, or severe?',
      'समस्या कितनी गंभीर है? हल्की, मध्यम, या गंभीर?'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleSymptomConfirmResponse = (lower) => {
    if (isYes(lower)) {
      setDialogState(DIALOG_STATES.ASKING_SEVERITY);
      const promptText = t(
        'সমস্যা কতটা মারাত্মক? হালকা, মাঝারি, না গুরুতর?',
        'How severe is your condition? Mild, moderate, or severe?',
        'समस्या कितनी गंभीर है? हल्की, मध्यम, या गंभीर?'
      );
      setLastPrompt(promptText);
      speakAndListen(promptText);
    } else {
      speak(t(
        'ঠিক আছে। আবার আপনার লক্ষণ বা রোগের নাম বলুন।',
        'Okay. Please tell me your symptoms or disease name again.',
        'ठीक है। कृपया फिर से लक्षण बताइए।'
      )).then(() => {
        setDialogState(DIALOG_STATES.ASKING_SYMPTOM);
      });
    }
  };

  const handleSeverityResponse = (lower) => {
    let severity = 'moderate';
    if (matchAny(lower, isBangla ? ['হালকা', 'সামান্য', 'একটু'] : ['mild', 'slight', 'minor'])) severity = 'mild';
    else if (matchAny(lower, isBangla ? ['গুরুতর', 'অনেক', 'তীব্র', 'মারাত্মক'] : ['severe', 'serious', 'bad'])) severity = 'severe';

    mergeDialogData({ severity });
    setDialogState(DIALOG_STATES.ASKING_DURATION);
    const promptText = t(
      'কতদিন ধরে এই সমস্যা? বলুন: একদিন, তিনদিন, বা এক সপ্তাহ।',
      'How long have you had this? Say: one day, three days, or one week.',
      'यह समस्या कितने दिनों से है? बताएं: एक दिन, तीन दिन, या एक हफ्ता।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleDurationResponse = (text) => {
    const duration = extractDuration(text);
    const finalData = mergeDialogData({ duration });

    window.dispatchEvent(new CustomEvent('voice-symptom-complete', { detail: finalData }));

    const symps = (finalData.symptoms || []).join(', ');
    setDialogState(DIALOG_STATES.SHOWING_RESULTS);
    const resultText = t(
      `লক্ষণ: ${symps}। বিস্তারিত টিপস ও ওষুধের তালিকা স্ক্রিনে দেখুন। রিমাইন্ডার সেট করতে "রিমাইন্ডার দাও" বলুন।`,
      `Symptoms: ${symps}. Check screen for tips & medicines. Say "set reminder" to schedule alarms.`,
      `लक्षण: ${symps}। सलाह और दवाओं की सूची स्क्रीन पर देखें।`
    );
    setLastPrompt(resultText);
    speakAndListen(resultText);
  };

  const handleShowingResultsResponse = (lower) => {
    if (matchAny(lower, ['রিমাইন্ডার', 'reminder', 'ওষুধ', 'alarm'])) {
      window.dispatchEvent(new CustomEvent('voice-set-reminder'));
      speak(t('রিমাইন্ডার ফর্ম খোলা হয়েছে। সময় বেছে নিয়ে সেভ করুন।', 'The reminder form is open. Choose the times and save it.', 'रिमाइंडर फ़ॉर्म खुल गया है। समय चुनकर सेव करें।')).then(resetDialog);
    } else if (isYes(lower)) enterMainMenu();
    else {
      speak(t('ঠিক আছে, আমি শুনছি।', 'Okay, I am listening.', 'ঠিক আছে।'));
    }
  };

  // ─── BODY MAP DIALOG ───
  const startBodyMapDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_BODY_AREA);
    updateIsDialogActive(true);
    const promptText = t(
      'বডি ম্যাপে স্বাগতম। আপনার শরীরের কোন অংশে সমস্যা? বলুন: মাথা, বুক, পেট, হাত, পা, পিঠ, বা গলা।',
      'Welcome to body map. Which part of your body is affected? Say: head, chest, stomach, arm, leg, back, or neck.',
      'बॉडी मैप में आपका स्वागत है। किस हिस्से में समस्या है? कहें: सिर, छाती, पेट, हाथ, पैर, पीठ, या गला।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleBodyAreaResponse = (text, lower) => {
    const areaMap = {
      head: ['মাথা', 'head', 'সির', 'skull', 'brain', 'face', 'মুখ'],
      chest: ['বুক', 'chest', 'হৃদয়', 'heart', 'lung', 'छाती'],
      stomach: ['পেট', 'stomach', 'abdomen', 'belly', 'पेट'],
      arm: ['হাত', 'arm', 'hand', 'wrist', 'बाज़ू'],
      leg: ['পা', 'leg', 'foot', 'knee', 'पैर'],
      back: ['পিঠ', 'back', 'spine', 'waist', 'पीठ'],
      neck: ['গলা', 'neck', 'throat', 'গলা'],
    };

    let foundArea = null;
    for (const [area, keywords] of Object.entries(areaMap)) {
      if (matchAny(lower, keywords)) { foundArea = area; break; }
    }

    if (foundArea) {
      mergeDialogData({ bodyArea: foundArea });
      window.dispatchEvent(new CustomEvent('voice-body-area', { detail: { area: foundArea } }));

      const areaNames = {
        head: t('মাথা', 'head', 'सिर'), chest: t('বুক', 'chest', 'छाती'),
        stomach: t('পেট', 'stomach', 'पेट'), arm: t('হাত', 'arm', 'बाज़ू'),
        leg: t('পা', 'leg', 'पैर'), back: t('পিঠ', 'back', 'पीठ'),
        neck: t('গলা', 'neck', 'गला'),
      };

      speakAndListen(t(
        `${areaNames[foundArea]} নির্বাচন করেছি। স্ক্রিনে ওই অঙ্গের লক্ষণগুলো দেখুন।`,
        `Selected ${foundArea}. View symptoms on screen.`,
        `${areaNames[foundArea]} चुना है। स्क्रीन पर संबंधित लक्षण देखें।`
      )).then(() => setDialogState(DIALOG_STATES.MAIN_MENU));
    } else {
      speak(t(
        'দুঃখিত, চিনতে পারিনি। বলুন: মাথা, বুক, পেট, হাত, পা, পিঠ, বা গলা।',
        "Sorry, couldn't identify. Say: head, chest, stomach, arm, leg, back, or neck.",
        'क्षमा करें। कहें: सिर, छाती, पेट, हाथ, पैर, पीठ, या गला।'
      ));
    }
  };

  // ─── FIRST AID DIALOG ───
  const startFirstAidDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_FIRST_AID);
    updateIsDialogActive(true);
    const promptText = t(
      'প্রাথমিক চিকিৎসা গাইড। বলুন: শ্বাসরোধ, রক্তক্ষরণ, অজ্ঞান, হিট স্ট্রোক, সাপের কামড়, বা বৈদ্যুতিক শক।',
      'First Aid Guide. Say: choking, heavy bleeding, fainting, heat stroke, snake bite, or electric shock.',
      'प्राथमिक चिकित्सा। कहें: दम घुटना, रक्तस्राव, बेहोशी, लू लगना, सांप का काटना, या बिजली का झटका।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleFirstAidMenuResponse = (lower) => {
    const aidMap = {
      choking: ['শ্বাসরোধ', 'দম বন্ধ', 'choking', 'दम घुटना'],
      bleeding: ['রক্তক্ষরণ', 'রক্ত', 'bleeding', 'blood', 'रक्तस्राव'],
      fainting: ['অজ্ঞান', 'fainting', 'unconscious', 'बेहोश'],
      heatstroke: ['হিট স্ট্রোক', 'গরম', 'heat stroke', 'heatstroke', 'लू'],
      snake_bite: ['সাপ', 'snake', 'bite', 'सांप'],
      electric_shock: ['বিদ্যুৎ', 'electric', 'shock', 'current', 'बिजली'],
    };

    let found = null;
    for (const [aid, keywords] of Object.entries(aidMap)) {
      if (matchAny(lower, keywords)) { found = aid; break; }
    }

    if (found) {
      mergeDialogData({ firstAidType: found });
      setDialogState(DIALOG_STATES.SHOWING_FIRST_AID);
      window.dispatchEvent(new CustomEvent('voice-first-aid-select', { detail: { type: found } }));

      const aidNames = {
        choking: t('শ্বাসরোধ', 'Choking', 'दम घुटना'),
        bleeding: t('অতিরিক্ত রক্তক্ষরণ', 'Heavy Bleeding', 'भारी रक्तस्राव'),
        fainting: t('অজ্ঞান হওয়া', 'Fainting', 'बेहोशी'),
        heatstroke: t('হিট স্ট্রোক', 'Heat Stroke', 'लू लगना'),
        snake_bite: t('সাপের কামড়', 'Snake Bite', 'सांप का काटना'),
        electric_shock: t('বৈদ্যুতিক শক', 'Electric Shock', 'बिजली का झटका'),
      };

      speakAndListen(t(
        `${aidNames[found]} গাইড খোলা হয়েছে। ধাপগুলো শুনতে "পরের ধাপ" বলুন। জরুরি হলে ৯৯৯ এ কল করুন।`,
        `${aidNames[found]} guide opened. Say "next step" to hear instructions. Call 999 if emergency.`,
        `${aidNames[found]} गाइड खोला गया। निर्देश सुनने के लिए "स्टेप्स पढ़ो" कहें।`
      ));
    } else {
      speak(t(
        'দুঃখিত, বুঝতে পারিনি। বলুন: শ্বাসরোধ, রক্তক্ষরণ, অজ্ঞান, হিট স্ট্রোক, সাপের কামড়, বা বৈদ্যুতিক শক।',
        "Sorry, I didn't catch that. Say: choking, bleeding, fainting, heat stroke, snake bite, or electric shock.",
        'क्षमा करें। कहें: दम घुटना, रक्तस्राव, बेहोशी, लू, सांप का काटना, या बिजली का झटका।'
      ));
    }
  };

  const handleShowingFirstAidResponse = (lower) => {
    if (matchAny(lower, ['পরের', 'next', 'পড়ো', 'read', 'শোনাও'])) {
      window.dispatchEvent(new CustomEvent('voice-first-aid-step', { detail: { action: 'next' } }));
    } else if (matchAny(lower, ['আগের', 'prev', 'previous', 'পিছনে'])) {
      window.dispatchEvent(new CustomEvent('voice-first-aid-step', { detail: { action: 'prev' } }));
    } else if (matchAny(lower, ['৯৯৯', '999', 'কল', 'call', 'জরুরী'])) {
      window.dispatchEvent(new CustomEvent('voice-first-aid-step', { detail: { action: 'emergency' } }));
      speak(t('জরুরি ৯৯৯ হটলাইনে কল দেওয়া হচ্ছে।', 'Calling 999 emergency hotline.', '999 पर कॉल किया जा रहा है।'));
    } else if (isYes(lower)) enterMainMenu();
    else {
      speak(t('ঠিক আছে। আমি শুনছি।', 'Okay. I am listening.', 'ठीक है।'));
    }
  };

  // ─── HOSPITAL DIALOG ───
  const startHospitalDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_HOSPITAL);
    updateIsDialogActive(true);
    const promptText = t(
      'হাসপাতাল সন্ধান। আপনার শহর বা এলাকার নাম বলুন — যেমন: ঢাকা, চট্টগ্রাম, সিলেট, বা আপনার বর্তমান অবস্থান।',
      'Find hospitals. Say your city or area name — e.g. Dhaka, Chittagong, Sylhet, or my location.',
      'अस्पताल खोजें। अपने शहर का नाम बताइए — जैसे: ढाका, चिटगांव, या माय लोकेशन।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleHospitalMenuResponse = (lower) => {
    if (matchAny(lower, isBangla ? ['অবস্থান', 'লোকেশন', 'জিপিএস', 'এখানে', 'মাই'] : ['location', 'gps', 'here', 'my location'])) {
      window.dispatchEvent(new CustomEvent('voice-show-all-hospitals'));
      speakAndListen(t(
        'আপনার কাছের হাসপাতালগুলোর মানচিত্র দেখানো হচ্ছে। কল দিতে "কল করো" বলুন।',
        'Showing map of hospitals near you. Say "call" to dial hospital.',
        'आपके नज़दीकी अस्पतालों का नक्शा दिखाया जा रहा है।'
      )).then(() => setDialogState(DIALOG_STATES.SHOWING_HOSPITALS));
    } else {
      handleLocationResponse(lower);
    }
  };

  const handleLocationResponse = (text) => {
    mergeDialogData({ location: text });
    setDialogState(DIALOG_STATES.SHOWING_HOSPITALS);
    window.dispatchEvent(new CustomEvent('voice-hospital-location', { detail: { location: text } }));
    speakAndListen(t(
      `"${text}" এর হাসপাতাল তালিকা স্ক্রিনে দেখুন। কল দিতে "কল করো" অথবা ম্যাপের জন্য "ম্যাপে দেখাও" বলুন।`,
      `Check screen for hospitals in "${text}". Say "call" to dial or "directions" for map.`,
      `"${text}" के अस्पताल देखें। कॉल करने के लिए "कॉल करो" कहें।`
    )).then(() => setDialogState(DIALOG_STATES.SHOWING_HOSPITALS));
  };

  const handleShowingHospitalsResponse = (lower) => {
    if (matchAny(lower, ['কল', 'call', 'ফোন', 'directions', 'ডিরেকশন', 'ম্যাপ'])) {
      speak(t('স্ক্রিনে নির্বাচিত হাসপাতালের তথ্য ব্যবহার করছি।', 'Using the selected hospital shown on screen.', 'स्क्रीन पर चुने गए अस्पताल की जानकारी उपयोग कर रहा हूं।'));
    } else if (matchAny(lower, ['মেনু', 'menu', 'শেষ', 'done'])) {
      enterMainMenu();
    } else {
      speak(t('কল, ডিরেকশন, অথবা মেনু বলুন।', 'Say call, directions, or menu.', 'कॉल, दिशा, या मेनू कहें।'));
    }
  };

  // ─── TELECONSULTATION DIALOG ───
  const startConsultDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_CONSULT);
    updateIsDialogActive(true);
    const promptText = t(
      'টেলিকনসালটেশন। ডাক্তারের স্পেশালটি বলুন — যেমন: মেডিসিন, হৃদরোগ, শিশু রোগ, চর্মরোগ, অথবা গাইনোকোলজি।',
      'Teleconsultation. Say doctor specialty — e.g. medicine, cardiology, pediatrics, or dermatology.',
      'टेलीकंसल्टेशन। डॉक्टर की विशेषज्ञता बताइए — जैसे मेडिसिन, हृदय रोग, बाल रोग।'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleConsultResponse = (lower) => {
    setDialogState(DIALOG_STATES.ASKING_DOCTOR_PREFERENCE);
    window.dispatchEvent(new CustomEvent('voice-doctor-filter', { detail: { preference: lower } }));
    speakAndListen(t(
      `"${lower}" বিশেষজ্ঞ ফিল্টার করা হয়েছে। বুক করতে "বুক করো" বলুন।`,
      `Filtered for "${lower}". Say "book now" to schedule an appointment.`,
      `"${lower}" डॉक्टर फ़िल्टर किए गए। बुक करने के लिए "बुक करो" कहें।`
    )).then(() => setDialogState(DIALOG_STATES.CONFIRM_ACTION));
  };

  const handleDoctorPreferenceResponse = (text) => {
    handleConsultResponse(text.toLowerCase());
  };

  const handleConfirmActionResponse = (lower) => {
    if (!isLoggedIn()) {
      navigate('/login');
      speak(t(
        'ডাক্তার অ্যাপয়েন্টমেন্ট বুক করতে আপনার অ্যাকাউন্টে লগইন থাকা প্রয়োজন। লগইন পৃষ্ঠায় নিয়ে যাচ্ছি।',
        'Login required to book doctor appointment. Taking you to login page.',
        'अपॉइंटमेंट बुक करने के लिए लॉगिन आवश्यक है।'
      ));
      return;
    }

    if (matchAny(lower, ['বুক', 'book', 'অ্যাপয়েন্টমেন্ট', 'appointment', 'হ্যাঁ', 'yes'])) {
      window.dispatchEvent(new CustomEvent('voice-book-appointment'));
      speak(t('বুকিং ফর্ম খোলা হয়েছে। তারিখ ও সময় বেছে নিয়ে নিশ্চিত করুন।', 'The booking form is open. Choose a date and time, then confirm.', 'बुकिंग फ़ॉर्म खुल गया है। तारीख और समय चुनकर पुष्टि करें।')).then(resetDialog);
    } else {
      speak(t('ঠিক আছে।', 'Okay.', 'ঠিক আছে।'));
      enterMainMenu();
    }
  };

  // ─── LANGUAGE & LOGOUT ───
  const startLanguageDialog = () => {
    setDialogState(DIALOG_STATES.ASKING_LANGUAGE);
    const promptText = t(
      'কোন ভাষায় কথা বলতে চান? বাংলা না English?',
      'Which language would you like? Bangla or English?'
    );
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleLanguageResponse = (lower) => {
    let newLang = null;
    if (matchAny(lower, ['বাংলা', 'bangla', 'bengali', 'bn'])) newLang = 'bn-BD';
    else if (matchAny(lower, ['ইংরেজি', 'english', 'en'])) newLang = 'en-US';

    if (newLang) {
      setVoiceLang(newLang);
      const msg = newLang === 'bn-BD' ? 'ভাষা বাংলায় পরিবর্তন করা হয়েছে।' : 'Language changed to English.';
      speak(msg, newLang).then(() => enterMainMenu());
    } else {
      speak(t('বাংলা বা English বলুন।', 'Say Bangla or English.'));
    }
  };

  const startLogoutDialog = () => {
    setDialogState(DIALOG_STATES.CONFIRM_LOGOUT);
    const promptText = t('লগ আউট করতে চান? হ্যাঁ বা না বলুন।', 'Want to log out? Say yes or no.', 'लॉग आउट करना चाहते हैं?');
    setLastPrompt(promptText);
    speakAndListen(promptText);
  };

  const handleConfirmLogoutResponse = (lower) => {
    if (isYes(lower)) {
      if (document.getElementById('nav-logout')) document.getElementById('nav-logout').click();
      speak(t('লগ আউট সম্পন্ন হয়েছে।', 'You are logged out.', 'लॉग आउट हो गए।')).then(() => {
        updateVoiceEnabled(false);
        resetDialog();
      });
    } else {
      speak(t('বাতিল করা হয়েছে।', 'Cancelled.', 'রদ্ধ করা হলো।'));
      enterMainMenu();
    }
  };

  const handleFeedbackResponse = () => {
    speak(t('ধন্যবাদ আপনার মতামতের জন্য!', 'Thank you for your feedback!', 'धन्यवाद!'))
      .then(() => enterMainMenu());
  };

  // ─── Live Recognition Handlers ───
  onResultHandlerRef.current = (event) => {
    if (!event || !event.results || event.results.length === 0) return;
    const lastIdx = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
    const resList = event.results[lastIdx];
    if (!resList || !resList[0]) return;

    const text = resList[0].transcript ? resList[0].transcript.trim() : '';
    if (!text) return;

    setTranscript(text);

    const globalAction = processGlobalCommand(text);
    if (globalAction) {
      setCommandResult(`🗣️ "${text}" → ${globalAction}`);
      handleGlobalAction(globalAction);
      return;
    }

    if (onResultCallbackRef.current) {
      const callback = onResultCallbackRef.current;
      onResultCallbackRef.current = null;
      callback(text, [text]);
      return;
    }

    if (isDialogActiveRef.current) {
      handleDialogResponse(text, [text]);
    }
  };

  onErrorHandlerRef.current = (event) => {
    updateListening(false);
    if (event.error === 'no-speech') {
      handleNoSpeech();
    } else if (event.error === 'aborted') {
      // Intentionally aborted
    } else {
      setCommandResult(t(`ভয়েস সমস্যা: ${event.error}`, `Voice error: ${event.error}`, `वॉइस त्रुटि: ${event.error}`));
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        updateVoiceEnabled(false);
        resetDialog();
      } else {
        handleNoSpeech();
      }
    }
  };

  startListeningRef.current = startListeningInternal;

  // ─── Utility Helpers ───
  const matchAny = (text, keywords) => keywords.some(kw => text.includes(kw.toLowerCase()));

  const isYes = (text) => {
    const yesWords = isBangla
      ? ['হ্যাঁ', 'হ্যা', 'হা', 'জি', 'হুম', 'আচ্ছা', 'ঠিক', 'হবে', 'করব', 'করো', 'করবো', 'yes', 'yep', 'yeah', 'ok', 'ঠিক আছে']
      : ['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'correct', 'right', 'go ahead', 'confirm'];
    return matchAny(text.toLowerCase(), yesWords);
  };

  const extractSymptoms = (text) => {
    const symptomKeywords = {
      fever: ['জ্বর', 'fever', 'তাপমাত্রা', 'temperature', 'গরম শরীর', 'बुखार'],
      headache: ['মাথা ব্যথা', 'মাথাব্যথা', 'headache', 'মাথা', 'head pain', 'सिरदर्द'],
      cough: ['কাশি', 'cough', 'সর্দি', 'cold', 'खांसी'],
      stomach_pain: ['পেট ব্যথা', 'পেটে ব্যথা', 'stomach pain', 'পেট', 'stomach', 'belly', 'पेट दर्द'],
      nausea: ['বমি', 'nausea', 'বমি বমি ভাব', 'vomit', 'उल्टी'],
      diarrhea: ['ডায়রিয়া', 'diarrhea', 'পাতলা পায়খানা', 'loose motion', 'दस्त'],
      chest_pain: ['বুক ব্যথা', 'chest pain', 'বুকে ব্যথা', 'छाती दर्द'],
      fatigue: ['ক্লান্তি', 'fatigue', 'দুর্বলতা', 'weakness', 'tired', 'थकान'],
      sore_throat: ['গলা ব্যথা', 'sore throat', 'গলা', 'गला दर्द'],
      body_ache: ['শরীর ব্যথা', 'body pain', 'গা ব্যথা', 'body ache'],
      dizziness: ['মাথা ঘোরা', 'dizziness', 'चक्कर'],
      rash: ['র্যাশ', 'rash', 'চামড়া', 'skin', 'खुजली'],
      breathing_difficulty: ['শ্বাসকষ্ট', 'breathing', 'শ্বাস', 'breathless', 'सांस'],
      dengue: ['ডেঙ্গু', 'dengue'],
      heartburn: ['গ্যাস', 'গ্যাস্ট্রিক', 'gastric', 'gastritis', 'GERD', 'বুকজ্বালা'],
      yellow_eyes: ['জন্ডিস', 'jaundice'],
      burning_urine: ['প্রস্রাবে ইনফেকশন', 'UTI', 'urine infection'],
      insomnia: ['অনিদ্রা', 'ঘুম কম', 'insomnia'],
      anxiety: ['উদ্বেগ', 'বিষণ্ণতা', 'anxiety', 'depression'],
      low_back_pain: ['কোমরে ব্যথা', 'low back'],
      knee_pain: ['হাঁটু ব্যথা', 'knee pain'],
      chickenpox_rash: ['বসন্ত', 'chickenpox'],
      bedwetting: ['বিছানায় প্রস্রাব', 'bedwetting'],
      boil: ['ফোড়া', 'abscess', 'boil'],
      swelling: ['oedema', 'edema', 'ফুলে'],
      mouth_sore: ['মুখে ঘা', 'জিহ্বায় ঘা', 'mouth ulcer'],
      constipation: ['কোষ্ঠকাঠিন্য', 'কষা পায়খানা', 'constipation'],
      vomiting: ['vomiting'],
      cold: ['সর্দিজ্বর', 'common cold'],
    };

    const found = [];
    for (const [key, keywords] of Object.entries(symptomKeywords)) {
      if (matchAny(text, keywords)) found.push(key);
    }
    return found;
  };

  const extractDuration = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();
    const match = lower.match(/(\d+)\s*(দিন|day|days|সপ্তাহ|week|weeks|মাস|month|months)/i);
    if (match) return match[0];
    if (lower.includes('আজ') || lower.includes('today')) return '1 day';
    if (lower.includes('কাল') || lower.includes('yesterday')) return '2 days';
    return text.substring(0, 30);
  };

  // ─── Public API ───
  const toggleVoice = useCallback(() => {
    if (speakingRef.current) {
      stopSpeaking();
      return;
    }
    // If listening, stop listening & voice
    if (listeningRef.current) {
      stopListening();
      updateVoiceEnabled(false);
      resetDialog();
      return;
    }

    const newState = !voiceEnabledRef.current;
    updateVoiceEnabled(newState);
    if (newState) {
      updateIsDialogActive(true);
      setDialogState(DIALOG_STATES.MAIN_MENU);
      setTimeout(() => enterMainMenu(), 200);
    } else {
      resetDialog();
    }
  }, [stopSpeaking, stopListening, enterMainMenu, resetDialog]);

  dialogStarterRef.current = (dialogType) => {
    switch (dialogType) {
      case 'greeting': startGreeting(); break;
      case 'symptom-checker': startSymptomDialog(); break;
      case 'first-aid': startFirstAidDialog(); break;
      case 'body-map': startBodyMapDialog(); break;
      case 'hospital': startHospitalDialog(); break;
      case 'teleconsultation': startConsultDialog(); break;
      case 'main-menu': enterMainMenu(); break;
      default: enterMainMenu();
    }
  };

  const startDialog = useCallback((dialogType) => {
    dialogStarterRef.current?.(dialogType);
  }, []);

  const startListening = useCallback((callback = null) => {
    if (typeof callback === 'function') onResultCallbackRef.current = callback;
    startListeningInternal();
  }, [startListeningInternal]);

  const listenForResponse = useCallback((prompt, callback) => {
    if (typeof callback === 'function') onResultCallbackRef.current = callback;
    return speakAndListen(prompt);
  }, [speakAndListen]);

  const announce = useCallback((text, lang = null) => speak(text, lang), [speak]);

  const setLanguage = useCallback((lang) => {
    setVoiceLang(lang === 'bn' ? 'bn-BD' : 'en-US');
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopListening, stopSpeaking]);

  const value = {
    voiceEnabled, speaking, listening, transcript, voiceLang, commandResult,
    dialogState, dialogData, dialogHistory, isDialogActive, lastPrompt,
    toggleVoice,
    speak: announce,
    speakAndListen,
    startListening,
    stopListening,
    stopSpeaking,
    setVoiceLang: (vl) => setVoiceLang(vl),
    setLanguage,
    setVoiceEnabled: updateVoiceEnabled,
    startDialog,
    enterMainMenu,
    resetDialog,
    executeCommand,
    isLoggedIn,
    listenForResponse,
    processCommand: (text) => text,
    setCommandResult,
    pageBusy: pageBusy,
    setPageBusy: setPageBusyState,
    listenFor: listenForResponse,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
}
