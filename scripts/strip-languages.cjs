/* One-off: reduce i18n + medical content to English + Bangla only */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// ─── 1. translations.js — keep en + bn blocks only ───
const tPath = path.join(root, 'src/i18n/translations.js');
let t = fs.readFileSync(tPath, 'utf8');
const hiStart = t.indexOf('\n  hi: {');
const endMarker = t.lastIndexOf('\n};');
if (hiStart === -1 || endMarker === -1 || endMarker < hiStart) {
  throw new Error('translations.js markers not found');
}
t = t.slice(0, hiStart) + t.slice(endMarker);
t = t.replace('Full 12 Languages', 'English + Bangla');
fs.writeFileSync(tPath, t);

// ─── 2. medicalData.js — keep only bn inside each translations object ───
const mPath = path.join(root, 'src/data/medicalData.js');
let m = fs.readFileSync(mPath, 'utf8');
const langs = ['hi', 'es', 'fr', 'ar', 'pt', 'zh', 'ja', 'de', 'ru', 'sw'];
const pattern = new RegExp(
  `(bn: \\{[^{}]*\\})(?:,\\s*(?:${langs.join('|')}): \\{[^{}]*\\})*`,
  'g'
);
m = m.replace(pattern, '$1');

// supportedLanguages → English + Bangla only
const slStart = m.indexOf('export const supportedLanguages = [');
const slEnd = m.indexOf('];', slStart);
if (slStart === -1 || slEnd === -1) throw new Error('supportedLanguages not found');
m = m.slice(0, slStart) +
`export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
]` + m.slice(slEnd + 1);
fs.writeFileSync(mPath, m);

// ─── Verify no leftover language keys ───
for (const [file, content] of [['translations.js', t], ['medicalData.js', m]]) {
  for (const lang of langs) {
    if (new RegExp(`\\b${lang}: \\{`).test(content)) {
      throw new Error(`${file} still contains ${lang} block`);
    }
  }
}
console.log('OK: languages stripped to en + bn');
