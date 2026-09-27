const fs = require('fs');

const data = {
  en: { subscriptionLabel: "Subscription", homeDisclaimer: "If you or someone is experiencing a life-threatening emergency like chest pain, severe bleeding, or difficulty breathing — do not use this app." },
  bn: { subscriptionLabel: "সাবস্ক্রিপশন", homeDisclaimer: "আপনি বা কেউ যদি বুকে ব্যথা, গুরুতর রক্তক্ষরণ, বা শ্বাসকষ্টের মতো জীবন-হুমকির সম্মুখীন হন — এই অ্যাপ ব্যবহার করবেন না।" },
  hi: { subscriptionLabel: "सब्सक्रिप्शन", homeDisclaimer: "यदि आपको या किसी को सीने में दर्द, गंभीर रक्तस्राव, या सांस लेने में कठिनाई हो — इस ऐप का उपयोग न करें।" },
  es: { subscriptionLabel: "Suscripción", homeDisclaimer: "Si usted o alguien experimenta una emergencia que pone en peligro su vida, como dolor en el pecho, sangrado intenso o dificultad para respirar, no use esta aplicación." },
  fr: { subscriptionLabel: "Abonnement", homeDisclaimer: "Si vous ou quelqu'un d'autre êtes confronté à une urgence vitale telle que des douleurs thoraciques, des saignements abondants ou des difficultés respiratoires, n'utilisez pas cette application." },
  ar: { subscriptionLabel: "الاشتراك", homeDisclaimer: "إذا كنت أنت أو أي شخص يعاني من حالة طوارئ مهددة للحياة مثل ألم الصدر، أو نزيف حاد، أو صعوبة في التنفس — لا تستخدم هذا التطبيق." },
  pt: { subscriptionLabel: "Assinatura", homeDisclaimer: "Se você ou alguém estiver enfrentando uma emergência com risco de vida, como dor no peito, sangramento grave ou dificuldade para respirar, não use este aplicativo." },
  zh: { subscriptionLabel: "订阅", homeDisclaimer: "如果您或某人遇到危及生命的紧急情况，如胸痛、严重出血或呼吸困难 — 请勿使用此应用程序。" },
  ja: { subscriptionLabel: "サブスクリプション", homeDisclaimer: "あなたまたは誰かが胸痛、激しい出血、呼吸困難などの生命を脅かす緊急事態を経験している場合は、このアプリを使用しないでください。" },
  de: { subscriptionLabel: "Abonnement", homeDisclaimer: "Wenn Sie oder jemand anderes einen lebensbedrohlichen Notfall wie Brustschmerzen, starke Blutungen oder Atembeschwerden haben — verwenden Sie diese App nicht." },
  ru: { subscriptionLabel: "Подписка", homeDisclaimer: "Если вы или кто-то другой испытывает опасную для жизни ситуацию, такую как боль в груди, сильное кровотечение или затрудненное дыхание — не используйте это приложение." },
  sw: { subscriptionLabel: "Usajili", homeDisclaimer: "Ikiwa wewe au mtu mwingine anapitia dharura inayotishia maisha kama maumivu ya kifua, kutokwa damu sana, au ugumu wa kupumua — usitumie programu hii." }
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
console.log('Successfully updated translations.js with remaining strings');
