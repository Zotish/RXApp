const fs = require('fs');

const data = {
  en: {
    emergencyLabel: 'Emergency', faDisclaimer: 'These are basic first aid guidelines. Always call emergency services for serious situations.', voiceNotSupported: 'Voice input not supported in your browser.',
    severity_mild: 'Mild', severity_moderate: 'Moderate', severity_severe: 'Severe', severity_critical: 'Critical',
    urgency_moderate: 'Moderate', urgency_critical: 'Critical', cat_all: 'All Categories', cat_head: 'Head & Neck', cat_torso: 'Torso', cat_limbs: 'Limbs', cat_general: 'General'
  },
  bn: {
    emergencyLabel: 'জরুরি', faDisclaimer: 'এগুলো প্রাথমিক চিকিৎসা নির্দেশিকা। গুরুতর পরিস্থিতিতে জরুরি সেবায় কল করুন।', voiceNotSupported: 'আপনার ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।',
    severity_mild: 'মৃদু', severity_moderate: 'মাঝারি', severity_severe: 'তীব্র', severity_critical: 'সংকটজনক',
    urgency_moderate: 'মাঝারি', urgency_critical: 'সংকটজনক', cat_all: 'সব বিভাগ', cat_head: 'মাথা ও ঘাড়', cat_torso: 'দেহকাণ্ড', cat_limbs: 'হাত-পা', cat_general: 'সাধারণ'
  },
  hi: {
    emergencyLabel: 'आपातकालीन', faDisclaimer: 'ये बुनियादी प्राथमिक चिकित्सा दिशानिर्देश हैं। गंभीर स्थिति में हमेशा आपातकालीन सेवा को कॉल करें।', voiceNotSupported: 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।',
    severity_mild: 'हल्का', severity_moderate: 'मध्यम', severity_severe: 'गंभीर', severity_critical: 'नाजुक',
    urgency_moderate: 'मध्यम', urgency_critical: 'नाजुक', cat_all: 'सभी श्रेणियां', cat_head: 'सिर और गर्दन', cat_torso: 'धड़', cat_limbs: 'अंग', cat_general: 'सामान्य'
  },
  es: {
    emergencyLabel: 'Emergencia', faDisclaimer: 'Estas son pautas básicas de primeros auxilios. Llame siempre a emergencias en casos graves.', voiceNotSupported: 'Entrada de voz no soportada en su navegador.',
    severity_mild: 'Leve', severity_moderate: 'Moderado', severity_severe: 'Severo', severity_critical: 'Crítico',
    urgency_moderate: 'Moderado', urgency_critical: 'Crítico', cat_all: 'Todas las categorías', cat_head: 'Cabeza y Cuello', cat_torso: 'Torso', cat_limbs: 'Extremidades', cat_general: 'General'
  },
  fr: {
    emergencyLabel: 'Urgence', faDisclaimer: 'Ce sont des directives de base. Appelez toujours les urgences pour les situations graves.', voiceNotSupported: 'Saisie vocale non prise en charge.',
    severity_mild: 'Léger', severity_moderate: 'Modéré', severity_severe: 'Sévère', severity_critical: 'Critique',
    urgency_moderate: 'Modéré', urgency_critical: 'Critique', cat_all: 'Toutes catégories', cat_head: 'Tête et Cou', cat_torso: 'Torse', cat_limbs: 'Membres', cat_general: 'Général'
  },
  ar: {
    emergencyLabel: 'طوارئ', faDisclaimer: 'هذه إرشادات أساسية. اتصل دائماً بخدمات الطوارئ للحالات الخطيرة.', voiceNotSupported: 'الإدخال الصوتي غير مدعوم في متصفحك.',
    severity_mild: 'خفيف', severity_moderate: 'متوسط', severity_severe: 'شديد', severity_critical: 'حرج',
    urgency_moderate: 'متوسط', urgency_critical: 'حرج', cat_all: 'جميع الفئات', cat_head: 'الرأس والرقبة', cat_torso: 'الجذع', cat_limbs: 'الأطراف', cat_general: 'عام'
  },
  pt: {
    emergencyLabel: 'Emergência', faDisclaimer: 'Estas são diretrizes básicas. Sempre ligue para a emergência em situações graves.', voiceNotSupported: 'Entrada de voz não suportada no seu navegador.',
    severity_mild: 'Leve', severity_moderate: 'Moderado', severity_severe: 'Grave', severity_critical: 'Crítico',
    urgency_moderate: 'Moderado', urgency_critical: 'Crítico', cat_all: 'Todas as categorias', cat_head: 'Cabeça e Pescoço', cat_torso: 'Tronco', cat_limbs: 'Membros', cat_general: 'Geral'
  },
  zh: {
    emergencyLabel: '紧急情况', faDisclaimer: '这些是基本急救指南。遇到严重情况，请务必呼叫急救服务。', voiceNotSupported: '您的浏览器不支持语音输入。',
    severity_mild: '轻度', severity_moderate: '中度', severity_severe: '重度', severity_critical: '危急',
    urgency_moderate: '中度', urgency_critical: '危急', cat_all: '所有类别', cat_head: '头颈部', cat_torso: '躯干', cat_limbs: '四肢', cat_general: '一般'
  },
  ja: {
    emergencyLabel: '緊急', faDisclaimer: 'これらは基本的な応急処置のガイドラインです。深刻な状況の場合は常に救急サービスに電話してください。', voiceNotSupported: 'ブラウザで音声入力がサポートされていません。',
    severity_mild: '軽度', severity_moderate: '中等度', severity_severe: '重度', severity_critical: '危篤',
    urgency_moderate: '中等度', urgency_critical: '危篤', cat_all: 'すべてのカテゴリ', cat_head: '頭と首', cat_torso: '胴体', cat_limbs: '手足', cat_general: '一般'
  },
  de: {
    emergencyLabel: 'Notfall', faDisclaimer: 'Dies sind grundlegende Erste-Hilfe-Richtlinien. Bei ernsten Situationen immer den Notruf wählen.', voiceNotSupported: 'Spracheingabe wird von Ihrem Browser nicht unterstützt.',
    severity_mild: 'Leicht', severity_moderate: 'Moderat', severity_severe: 'Schwer', severity_critical: 'Kritisch',
    urgency_moderate: 'Moderat', urgency_critical: 'Kritisch', cat_all: 'Alle Kategorien', cat_head: 'Kopf & Hals', cat_torso: 'Rumpf', cat_limbs: 'Gliedmaßen', cat_general: 'Allgemein'
  },
  ru: {
    emergencyLabel: 'Чрезвычайная ситуация', faDisclaimer: 'Это базовые правила первой помощи. Всегда звоните в службу спасения в серьезных ситуациях.', voiceNotSupported: 'Голосовой ввод не поддерживается вашим браузером.',
    severity_mild: 'Легкая', severity_moderate: 'Умеренная', severity_severe: 'Тяжелая', severity_critical: 'Критическая',
    urgency_moderate: 'Умеренная', urgency_critical: 'Критическая', cat_all: 'Все категории', cat_head: 'Голова и шея', cat_torso: 'Туловище', cat_limbs: 'Конечности', cat_general: 'Общие'
  },
  sw: {
    emergencyLabel: 'Dharura', faDisclaimer: 'Hizi ni miongozo ya msingi ya huduma ya kwanza. Piga simu huduma za dharura kwa hali mbaya.', voiceNotSupported: 'Kuingiza sauti hakuauniwi kwenye kivinjari chako.',
    severity_mild: 'Kidogo', severity_moderate: 'Wastani', severity_severe: 'Kali', severity_critical: 'Hatari',
    urgency_moderate: 'Wastani', urgency_critical: 'Hatari', cat_all: 'Kategoria Zote', cat_head: 'Kichwa na Shingo', cat_torso: 'Kiunzi', cat_limbs: 'Miguu na Mikono', cat_general: 'Jumla'
  }
};

let content = fs.readFileSync('./src/i18n/translations.js', 'utf8');

for (const lang of Object.keys(data)) {
  const values = data[lang];
  let injected = '';
  for (const k in values) {
    injected += `    ${k}: '${values[k].replace(/'/g, "\\'")}',\n`;
  }
  
  // Find the block for this language: `lang: {`
  const regex = new RegExp(`(${lang}:\\s*\\{[\\s\\S]*?)(^\\s*\\},|\\s*\\}\\s*(?:;|export))`, 'm');
  content = content.replace(regex, `$1${injected}$2`);
}

fs.writeFileSync('./src/i18n/translations.js', content);
console.log('Successfully updated translations.js');
