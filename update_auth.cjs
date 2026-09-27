const fs = require('fs');

const data = {
  en: { loginTitle: "Welcome Back", registerTitle: "Create an Account", name: "Full Name", phone: "Phone Number", email: "Email Address", password: "Password", chooseLanguage: "Choose Your Language", loginBtn: "Login", registerBtn: "Create Account", noAccount: "Don't have an account? Register", hasAccount: "Already have an account? Login" },
  bn: { loginTitle: "স্বাগতম", registerTitle: "নতুন অ্যাকাউন্ট তৈরি করুন", name: "পুরো নাম", phone: "ফোন নম্বর", email: "ইমেইল ঠিকানা", password: "পাসওয়ার্ড", chooseLanguage: "আপনার ভাষা নির্বাচন করুন", loginBtn: "লগইন করুন", registerBtn: "অ্যাকাউন্ট তৈরি করুন", noAccount: "অ্যাকাউন্ট নেই? রেজিস্ট্রেশন করুন", hasAccount: "অ্যাকাউন্ট আছে? লগইন করুন" },
  hi: { loginTitle: "वापसी पर स्वागत है", registerTitle: "खाता बनाएं", name: "पूरा नाम", phone: "फ़ोन नंबर", email: "ईमेल पता", password: "पासवर्ड", chooseLanguage: "अपनी भाषा चुनें", loginBtn: "लॉगिन करें", registerBtn: "खाता बनाएं", noAccount: "खाता नहीं है? रजिस्टर करें", hasAccount: "पहले से खाता है? लॉगिन करें" },
  es: { loginTitle: "Bienvenido", registerTitle: "Crear una cuenta", name: "Nombre completo", phone: "Número de teléfono", email: "Correo electrónico", password: "Contraseña", chooseLanguage: "Elige tu idioma", loginBtn: "Iniciar sesión", registerBtn: "Crear cuenta", noAccount: "¿No tienes cuenta? Regístrate", hasAccount: "¿Ya tienes cuenta? Inicia sesión" },
  fr: { loginTitle: "Bon retour", registerTitle: "Créer un compte", name: "Nom complet", phone: "Numéro de téléphone", email: "Adresse e-mail", password: "Mot de passe", chooseLanguage: "Choisissez votre langue", loginBtn: "Connexion", registerBtn: "Créer un compte", noAccount: "Pas de compte ? S'inscrire", hasAccount: "Déjà un compte ? Connexion" },
  ar: { loginTitle: "مرحباً بعودتك", registerTitle: "إنشاء حساب", name: "الاسم الكامل", phone: "رقم الهاتف", email: "البريد الإلكتروني", password: "كلمة المرور", chooseLanguage: "اختر لغتك", loginBtn: "تسجيل الدخول", registerBtn: "إنشاء حساب", noAccount: "ليس لديك حساب؟ سجل", hasAccount: "لديك حساب؟ تسجيل الدخول" },
  pt: { loginTitle: "Bem-vindo de volta", registerTitle: "Criar uma conta", name: "Nome completo", phone: "Número de telefone", email: "Endereço de email", password: "Senha", chooseLanguage: "Escolha seu idioma", loginBtn: "Entrar", registerBtn: "Criar conta", noAccount: "Não tem uma conta? Registre-se", hasAccount: "Já tem uma conta? Entrar" },
  zh: { loginTitle: "欢迎回来", registerTitle: "创建账户", name: "全名", phone: "电话号码", email: "电子邮件", password: "密码", chooseLanguage: "选择您的语言", loginBtn: "登录", registerBtn: "创建账户", noAccount: "没有账户？注册", hasAccount: "已有账户？登录" },
  ja: { loginTitle: "おかえりなさい", registerTitle: "アカウントを作成", name: "フルネーム", phone: "電話番号", email: "メールアドレス", password: "パスワード", chooseLanguage: "言語を選択", loginBtn: "ログイン", registerBtn: "アカウントを作成", noAccount: "アカウントがありませんか？登録", hasAccount: "すでにアカウントがありますか？ログイン" },
  de: { loginTitle: "Willkommen zurück", registerTitle: "Konto erstellen", name: "Vollständiger Name", phone: "Telefonnummer", email: "E-Mail-Adresse", password: "Passwort", chooseLanguage: "Wählen Sie Ihre Sprache", loginBtn: "Anmelden", registerBtn: "Konto erstellen", noAccount: "Kein Konto? Registrieren", hasAccount: "Bereits ein Konto? Anmelden" },
  ru: { loginTitle: "С возвращением", registerTitle: "Создать аккаунт", name: "Полное имя", phone: "Номер телефона", email: "Электронная почта", password: "Пароль", chooseLanguage: "Выберите язык", loginBtn: "Войти", registerBtn: "Создать аккаунт", noAccount: "Нет аккаунта? Зарегистрироваться", hasAccount: "Уже есть аккаунт? Войти" },
  sw: { loginTitle: "Karibu tena", registerTitle: "Unda Akaunti", name: "Jina Kamili", phone: "Nambari ya Simu", email: "Barua pepe", password: "Nenosiri", chooseLanguage: "Chagua Lugha", loginBtn: "Ingia", registerBtn: "Unda Akaunti", noAccount: "Huna akaunti? Jisajili", hasAccount: "Tayari una akaunti? Ingia" }
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
console.log('Successfully updated translations.js with Auth labels');
