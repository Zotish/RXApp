const fs = require('fs');

const data = {
  en: { welcomeDashboard: "Welcome", dashboardDesc: "Your personal health dashboard", planLabel: "Plan", recentConsults: "Recent Consultations", viewAll: "View all", noConsultsYet: "No consultations yet", symptomCheckHistory: "Symptom Check History", newCheck: "New Check", noHistoryYet: "No symptom checks yet", editProfile: "Edit Profile", preferredLang: "Preferred Language", joined: "Joined", languageLabel: "Language" },
  bn: { welcomeDashboard: "স্বাগতম", dashboardDesc: "আপনার স্বাস্থ্য ড্যাশবোর্ড", planLabel: "প্ল্যান", recentConsults: "সাম্প্রতিক পরামর্শ", viewAll: "সব দেখুন", noConsultsYet: "এখনো কোনো পরামর্শ নেই", symptomCheckHistory: "লক্ষণ পরীক্ষার ইতিহাস", newCheck: "নতুন পরীক্ষা", noHistoryYet: "কোনো লক্ষণ পরীক্ষা করা হয়নি", editProfile: "প্রোফাইল সম্পাদনা", preferredLang: "ভাষা পরিবর্তন", joined: "যোগদান", languageLabel: "ভাষা" },
  hi: { welcomeDashboard: "स्वागत है", dashboardDesc: "आपका स्वास्थ्य डैशबोर्ड", planLabel: "प्लान", recentConsults: "हालिया परामर्श", viewAll: "सभी देखें", noConsultsYet: "अभी तक कोई परामर्श नहीं", symptomCheckHistory: "लक्षण जांच इतिहास", newCheck: "नई जांच", noHistoryYet: "कोई लक्षण जांच नहीं", editProfile: "प्रोफ़ाइल संपादित करें", preferredLang: "भाषा बदलें", joined: "शामिल हुए", languageLabel: "भाषा" },
  es: { welcomeDashboard: "Bienvenido", dashboardDesc: "Tu panel de salud personal", planLabel: "Plan", recentConsults: "Consultas Recientes", viewAll: "Ver todo", noConsultsYet: "Aún no hay consultas", symptomCheckHistory: "Historial de Síntomas", newCheck: "Nuevo Chequeo", noHistoryYet: "Aún no hay historial", editProfile: "Editar Perfil", preferredLang: "Idioma preferido", joined: "Unido", languageLabel: "Idioma" },
  fr: { welcomeDashboard: "Bienvenue", dashboardDesc: "Votre tableau de bord santé", planLabel: "Forfait", recentConsults: "Consultations Récentes", viewAll: "Tout voir", noConsultsYet: "Aucune consultation", symptomCheckHistory: "Historique des Symptômes", newCheck: "Nouveau Test", noHistoryYet: "Aucun historique", editProfile: "Modifier le Profil", preferredLang: "Langue préférée", joined: "Inscrit le", languageLabel: "Langue" },
  ar: { welcomeDashboard: "مرحباً", dashboardDesc: "لوحة التحكم الصحية الخاصة بك", planLabel: "الخطة", recentConsults: "الاستشارات الأخيرة", viewAll: "عرض الكل", noConsultsYet: "لا توجد استشارات بعد", symptomCheckHistory: "سجل فحص الأعراض", newCheck: "فحص جديد", noHistoryYet: "لا يوجد سجل فحص", editProfile: "تعديل الملف", preferredLang: "اللغة المفضلة", joined: "انضم في", languageLabel: "اللغة" },
  pt: { welcomeDashboard: "Bem-vindo", dashboardDesc: "Seu painel de saúde", planLabel: "Plano", recentConsults: "Consultas Recentes", viewAll: "Ver tudo", noConsultsYet: "Nenhuma consulta ainda", symptomCheckHistory: "Histórico de Sintomas", newCheck: "Novo Teste", noHistoryYet: "Nenhum histórico", editProfile: "Editar Perfil", preferredLang: "Idioma preferido", joined: "Membro desde", languageLabel: "Idioma" },
  zh: { welcomeDashboard: "欢迎", dashboardDesc: "您的个人健康看板", planLabel: "套餐", recentConsults: "近期咨询", viewAll: "查看全部", noConsultsYet: "暂无咨询", symptomCheckHistory: "症状检查历史", newCheck: "新建检查", noHistoryYet: "暂无历史", editProfile: "编辑资料", preferredLang: "首选语言", joined: "加入时间", languageLabel: "语言" },
  ja: { welcomeDashboard: "ようこそ", dashboardDesc: "個人の健康ダッシュボード", planLabel: "プラン", recentConsults: "最近の診察", viewAll: "すべて表示", noConsultsYet: "まだ診察はありません", symptomCheckHistory: "症状チェック履歴", newCheck: "新しいチェック", noHistoryYet: "履歴なし", editProfile: "プロフィール編集", preferredLang: "希望する言語", joined: "登録日", languageLabel: "言語" },
  de: { welcomeDashboard: "Willkommen", dashboardDesc: "Ihr Gesundheits-Dashboard", planLabel: "Plan", recentConsults: "Kürzliche Konsultationen", viewAll: "Alle anzeigen", noConsultsYet: "Noch keine Konsultationen", symptomCheckHistory: "Symptom-Check-Verlauf", newCheck: "Neuer Check", noHistoryYet: "Noch kein Verlauf", editProfile: "Profil bearbeiten", preferredLang: "Bevorzugte Sprache", joined: "Beigetreten", languageLabel: "Sprache" },
  ru: { welcomeDashboard: "Добро пожаловать", dashboardDesc: "Ваша панель здоровья", planLabel: "План", recentConsults: "Недавние консультации", viewAll: "Смотреть все", noConsultsYet: "Пока нет консультаций", symptomCheckHistory: "История симптомов", newCheck: "Новая проверка", noHistoryYet: "Пока нет истории", editProfile: "Редактировать профиль", preferredLang: "Предпочитаемый язык", joined: "Присоединился", languageLabel: "Язык" },
  sw: { welcomeDashboard: "Karibu", dashboardDesc: "Dashibodi yako ya afya", planLabel: "Mpango", recentConsults: "Ushauri wa Hivi Karibuni", viewAll: "Tazama zote", noConsultsYet: "Hakuna ushauri bado", symptomCheckHistory: "Historia ya Dalili", newCheck: "Cheki Mpya", noHistoryYet: "Hakuna historia bado", editProfile: "Hariri Wasifu", preferredLang: "Lugha Pendwa", joined: "Alijiunga", languageLabel: "Lugha" }
};

let content = fs.readFileSync('./src/i18n/translations.js', 'utf8');

for (const lang of Object.keys(data)) {
  const values = data[lang];
  let injected = '';
  for (const k in values) {
    injected += `    ${k}: "${values[k]}",\n`;
  }
  
  // Find the block for this language: `lang: {`
  const regex = new RegExp(`(${lang}:\\s*\\{[\\s\\S]*?)(^\\s*\\},|\\s*\\}\\s*(?:;|export))`, 'm');
  content = content.replace(regex, `$1${injected}$2`);
}

fs.writeFileSync('./src/i18n/translations.js', content);
console.log('Successfully updated translations.js with Dashboard labels');
