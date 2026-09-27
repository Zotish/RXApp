const fs = require('fs');

const data = {
  en: {
    emergencyLabel: 'Emergency', faDisclaimer: 'These are basic first aid guidelines. Always call emergency services for serious situations.', voiceNotSupported: 'Voice input not supported in your browser.',
    severity_mild: 'Mild', severity_moderate: 'Moderate', severity_severe: 'Severe', severity_critical: 'Critical',
    urgency_moderate: 'Moderate', urgency_critical: 'Critical', cat_all: 'All Categories', cat_head: 'Head & Neck', cat_torso: 'Torso', cat_limbs: 'Limbs', cat_general: 'General', actQuickly: 'Act Quickly', getResults: 'Get Results', analyzeSymptoms: 'Analyze Symptoms', moreQuestions: 'More Questions',
    analyzing: 'Analyzing...', crossRef: 'Cross-referencing database...', possibleConditions: 'Possible Conditions', noMatch: 'No exact matches found.', disclaimer: 'This tool does not provide medical advice. Consult a doctor for any health concerns.'
  },
  bn: {
    emergencyLabel: 'জরুরি', faDisclaimer: 'এগুলো প্রাথমিক চিকিৎসা নির্দেশিকা। গুরুতর পরিস্থিতিতে জরুরি সেবায় কল করুন।', voiceNotSupported: 'আপনার ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।',
    severity_mild: 'মৃদু', severity_moderate: 'মাঝারি', severity_severe: 'তীব্র', severity_critical: 'সংকটজনক',
    urgency_moderate: 'মাঝারি', urgency_critical: 'সংকটজনক', cat_all: 'সব বিভাগ', cat_head: 'মাথা ও ঘাড়', cat_torso: 'দেহকাণ্ড', cat_limbs: 'হাত-পা', cat_general: 'সাধারণ', actQuickly: 'দ্রুত কাজ করুন', getResults: 'ফলাফল পান', analyzeSymptoms: 'লক্ষণ বিশ্লেষণ করুন', moreQuestions: 'আরও প্রশ্ন',
    analyzing: 'বিশ্লেষণ করা হচ্ছে...', crossRef: 'ডাটাবেসের সাথে মেলানো হচ্ছে...', possibleConditions: 'সম্ভাব্য রোগসমূহ', noMatch: 'সঠিক কোনো মিল পাওয়া যায়নি।', disclaimer: 'এই টুল কোনো চিকিৎসা পরামর্শ প্রদান করে না। কোনো স্বাস্থ্যগত উদ্বেগের জন্য একজন ডাক্তারের সাথে পরামর্শ করুন।'
  },
  hi: {
    emergencyLabel: 'आपातकालीन', faDisclaimer: 'ये बुनियादी प्राथमिक चिकित्सा दिशानिर्देश हैं। गंभीर स्थिति में हमेशा आपातकालीन सेवा को कॉल करें।', voiceNotSupported: 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।',
    severity_mild: 'हल्का', severity_moderate: 'मध्यम', severity_severe: 'गंभीर', severity_critical: 'नाजुक',
    urgency_moderate: 'मध्यम', urgency_critical: 'नाजुक', cat_all: 'सभी श्रेणियां', cat_head: 'सिर और गर्दन', cat_torso: 'धड़', cat_limbs: 'अंग', cat_general: 'सामान्य', actQuickly: 'जल्दी कार्य करें', getResults: 'परिणाम प्राप्त करें', analyzeSymptoms: 'लक्षणों का विश्लेषण करें', moreQuestions: 'अधिक प्रश्न',
    analyzing: 'विश्लेषण किया जा रहा है...', crossRef: 'डेटाबेस से मिलान हो रहा है...', possibleConditions: 'संभावित बीमारियां', noMatch: 'कोई सटीक मेल नहीं मिला।', disclaimer: 'यह टूल चिकित्सा सलाह नहीं देता है। किसी भी स्वास्थ्य समस्या के लिए डॉक्टर से परामर्श करें।'
  },
  es: {
    emergencyLabel: 'Emergencia', faDisclaimer: 'Estas son pautas básicas de primeros auxilios. Llame siempre a emergencias en casos graves.', voiceNotSupported: 'Entrada de voz no soportada en su navegador.',
    severity_mild: 'Leve', severity_moderate: 'Moderado', severity_severe: 'Severo', severity_critical: 'Crítico',
    urgency_moderate: 'Moderado', urgency_critical: 'Crítico', cat_all: 'Todas las categorías', cat_head: 'Cabeza y Cuello', cat_torso: 'Torso', cat_limbs: 'Extremidades', cat_general: 'General', actQuickly: 'Actúe Rápido', getResults: 'Obtener Resultados', analyzeSymptoms: 'Analizar Síntomas', moreQuestions: 'Más Preguntas',
    analyzing: 'Analizando...', crossRef: 'Consultando base de datos...', possibleConditions: 'Condiciones Posibles', noMatch: 'No se encontraron coincidencias exactas.', disclaimer: 'Esta herramienta no proporciona asesoramiento médico. Consulte a un médico.'
  },
  fr: {
    emergencyLabel: 'Urgence', faDisclaimer: 'Ce sont des directives de base. Appelez toujours les urgences pour les situations graves.', voiceNotSupported: 'Saisie vocale non prise en charge.',
    severity_mild: 'Léger', severity_moderate: 'Modéré', severity_severe: 'Sévère', severity_critical: 'Critique',
    urgency_moderate: 'Modéré', urgency_critical: 'Critique', cat_all: 'Toutes catégories', cat_head: 'Tête et Cou', cat_torso: 'Torse', cat_limbs: 'Membres', cat_general: 'Général', actQuickly: 'Agissez Vite', getResults: 'Obtenir les Résultats', analyzeSymptoms: 'Analyser les Symptômes', moreQuestions: 'Plus de Questions',
    analyzing: 'Analyse en cours...', crossRef: 'Croisement avec la base de données...', possibleConditions: 'Conditions Possibles', noMatch: 'Aucune correspondance exacte trouvée.', disclaimer: 'Cet outil ne fournit pas de conseils médicaux. Consultez un médecin.'
  },
  ar: {
    emergencyLabel: 'طوارئ', faDisclaimer: 'هذه إرشادات أساسية. اتصل دائماً بخدمات الطوارئ للحالات الخطيرة.', voiceNotSupported: 'الإدخال الصوتي غير مدعوم في متصفحك.',
    severity_mild: 'خفيف', severity_moderate: 'متوسط', severity_severe: 'شديد', severity_critical: 'حرج',
    urgency_moderate: 'متوسط', urgency_critical: 'حرج', cat_all: 'جميع الفئات', cat_head: 'الرأس والرقبة', cat_torso: 'الجذع', cat_limbs: 'الأطراف', cat_general: 'عام', actQuickly: 'تصرف بسرعة', getResults: 'احصل على النتائج', analyzeSymptoms: 'تحليل الأعراض', moreQuestions: 'مزيد من الأسئلة',
    analyzing: 'جاري التحليل...', crossRef: 'تتقاطع مع قاعدة البيانات...', possibleConditions: 'الحالات المحتملة', noMatch: 'لم يتم العثور على تطابقات دقيقة.', disclaimer: 'هذه الأداة لا تقدم استشارات طبية. استشر طبيبًا دائمًا.'
  },
  pt: {
    emergencyLabel: 'Emergência', faDisclaimer: 'Estas são diretrizes básicas. Sempre ligue para a emergência em situações graves.', voiceNotSupported: 'Entrada de voz não suportada no seu navegador.',
    severity_mild: 'Leve', severity_moderate: 'Moderado', severity_severe: 'Grave', severity_critical: 'Crítico',
    urgency_moderate: 'Moderado', urgency_critical: 'Crítico', cat_all: 'Todas as categorias', cat_head: 'Cabeça e Pescoço', cat_torso: 'Tronco', cat_limbs: 'Membros', cat_general: 'Geral', actQuickly: 'Aja Rápido', getResults: 'Obter Resultados', analyzeSymptoms: 'Analisar Sintomas', moreQuestions: 'Mais Perguntas',
    analyzing: 'Analisando...', crossRef: 'Consultando o banco de dados...', possibleConditions: 'Condições Possíveis', noMatch: 'Nenhuma correspondência exata encontrada.', disclaimer: 'Esta ferramenta não fornece conselho médico. Consulte um médico.'
  },
  zh: {
    emergencyLabel: '紧急情况', faDisclaimer: '这些是基本急救指南。遇到严重情况，请务必呼叫急救服务。', voiceNotSupported: '您的浏览器不支持语音输入。',
    severity_mild: '轻度', severity_moderate: '中度', severity_severe: '重度', severity_critical: '危急',
    urgency_moderate: '中度', urgency_critical: '危急', cat_all: '所有类别', cat_head: '头颈部', cat_torso: '躯干', cat_limbs: '四肢', cat_general: '一般', actQuickly: '迅速行动', getResults: '获取结果', analyzeSymptoms: '分析症状', moreQuestions: '更多问题',
    analyzing: '分析中...', crossRef: '交叉比对数据库...', possibleConditions: '可能的疾病', noMatch: '未找到完全匹配。', disclaimer: '本工具不提供医疗建议。如有健康顾虑，请咨询医生。'
  },
  ja: {
    emergencyLabel: '緊急', faDisclaimer: 'これらは基本的な応急処置のガイドラインです。深刻な状況の場合は常に救急サービスに電話してください。', voiceNotSupported: 'ブラウザで音声入力がサポートされていません。',
    severity_mild: '軽度', severity_moderate: '中等度', severity_severe: '重度', severity_critical: '危篤',
    urgency_moderate: '中等度', urgency_critical: '危篤', cat_all: 'すべてのカテゴリ', cat_head: '頭と首', cat_torso: '胴体', cat_limbs: '手足', cat_general: '一般', actQuickly: 'すぐに行動', getResults: '結果を取得', analyzeSymptoms: '症状を分析', moreQuestions: 'その他の質問',
    analyzing: '分析中...', crossRef: 'データベースと照合中...', possibleConditions: '考えられる疾患', noMatch: '完全な一致は見つかりませんでした。', disclaimer: 'このツールは医療アドバイスを提供するものではありません。医師にご相談ください。'
  },
  de: {
    emergencyLabel: 'Notfall', faDisclaimer: 'Dies sind grundlegende Erste-Hilfe-Richtlinien. Bei ernsten Situationen immer den Notruf wählen.', voiceNotSupported: 'Spracheingabe wird von Ihrem Browser nicht unterstützt.',
    severity_mild: 'Leicht', severity_moderate: 'Moderat', severity_severe: 'Schwer', severity_critical: 'Kritisch',
    urgency_moderate: 'Moderat', urgency_critical: 'Kritisch', cat_all: 'Alle Kategorien', cat_head: 'Kopf & Hals', cat_torso: 'Rumpf', cat_limbs: 'Gliedmaßen', cat_general: 'Allgemein', actQuickly: 'Schnell Handeln', getResults: 'Ergebnisse anzeigen', analyzeSymptoms: 'Symptome analysieren', moreQuestions: 'Weitere Fragen',
    analyzing: 'Analysiere...', crossRef: 'Datenbank abgleichen...', possibleConditions: 'Mögliche Erkrankungen', noMatch: 'Keine genauen Treffer gefunden.', disclaimer: 'Dieses Tool bietet keine medizinische Beratung. Konsultieren Sie einen Arzt.'
  },
  ru: {
    emergencyLabel: 'Чрезвычайная ситуация', faDisclaimer: 'Это базовые правила первой помощи. Всегда звоните в службу спасения в серьезных ситуациях.', voiceNotSupported: 'Голосовой ввод не поддерживается вашим браузером.',
    severity_mild: 'Легкая', severity_moderate: 'Умеренная', severity_severe: 'Тяжелая', severity_critical: 'Критическая',
    urgency_moderate: 'Умеренная', urgency_critical: 'Критическая', cat_all: 'Все категории', cat_head: 'Голова и шея', cat_torso: 'Туловище', cat_limbs: 'Конечности', cat_general: 'Общие', actQuickly: 'Действуйте быстро', getResults: 'Получить результаты', analyzeSymptoms: 'Анализировать симптомы', moreQuestions: 'Дополнительные вопросы',
    analyzing: 'Анализ...', crossRef: 'Сверка с базой данных...', possibleConditions: 'Возможные заболевания', noMatch: 'Точных совпадений не найдено.', disclaimer: 'Этот инструмент не предоставляет медицинские советы. Обратитесь к врачу.'
  },
  sw: {
    emergencyLabel: 'Dharura', faDisclaimer: 'Hizi ni miongozo ya msingi ya huduma ya kwanza. Piga simu huduma za dharura kwa hali mbaya.', voiceNotSupported: 'Kuingiza sauti hakuauniwi kwenye kivinjari chako.',
    severity_mild: 'Kidogo', severity_moderate: 'Wastani', severity_severe: 'Kali', severity_critical: 'Hatari',
    urgency_moderate: 'Wastani', urgency_critical: 'Hatari', cat_all: 'Kategoria Zote', cat_head: 'Kichwa na Shingo', cat_torso: 'Kiunzi', cat_limbs: 'Miguu na Mikono', cat_general: 'Jumla', actQuickly: 'Fanya Haraka', getResults: 'Pata Matokeo', analyzeSymptoms: 'Changanua Dalili', moreQuestions: 'Maswali Zaidi',
    analyzing: 'Inachambua...', crossRef: 'Inakagua hifadhidata...', possibleConditions: 'Magonjwa Yanayowezekana', noMatch: 'Hakuna mechi halisi.', disclaimer: 'Zana hii haitoi ushauri wa matibabu. Wasiliana na daktari.'
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
