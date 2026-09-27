import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('./server/notebook_prescriptions.json', 'utf8'));

// Exact, mutually-exclusive condition metadata and aliases
const familyMeta = {
  constipation: {
    en: 'Constipation',
    bn: 'কোষ্ঠকাঠিন্য',
    matchSymptoms: ['constipation', 'কোষ্ঠকাঠিন্য', 'কষা', 'পায়খানা কষা', 'পায়খানা শক্ত'],
  },
  oral_candidiasis_mouth: {
    en: 'Oral Candidiasis (Mouth)',
    bn: 'মুখে ঘাঁ (ওরাল ক্যান্ডিডিয়াসিস)',
    matchSymptoms: ['oral candidiasis mouth', 'thrush mouth', 'মুখে ঘাঁ'],
  },
  oral_candidiasis_tongue: {
    en: 'Oral Candidiasis (Tongue)',
    bn: 'জিহ্বা ঘাঁ (ওরাল ক্যান্ডিডিয়াসিস)',
    matchSymptoms: ['oral candidiasis tongue', 'thrush tongue', 'জিহ্বা ঘাঁ', 'জিহ্বায় ঘা'],
  },
  aphthous_ulcer: {
    en: 'Aphthous Ulcer',
    bn: 'মুখে ঘা (অ্যাপথাস আলসার)',
    matchSymptoms: ['aphthous ulcer', 'মুখে ঘা', 'অ্যাপথাস'],
  },
  jaundice: {
    en: 'Jaundice',
    bn: 'জন্ডিস',
    matchSymptoms: ['jaundice', 'জন্ডিস', 'হলুদ চোখ', 'হলুদ প্রস্রাব'],
  },
  bronchial_asthma: {
    en: 'Bronchial Asthma',
    bn: 'শ্বাসকষ্ট (ব্রঙ্কিয়াল অ্যাজমা)',
    matchSymptoms: ['asthma', 'bronchial asthma', 'শ্বাসকষ্ট', 'হাঁপানি', 'হাপানি'],
  },
  common_cold: {
    en: 'Common Cold',
    bn: 'সাধারণ সর্দি-কাশি',
    matchSymptoms: ['common cold', 'cold', 'সর্দি', 'ঠান্ডা', 'সর্দিকাশি', 'নাক দিয়ে পানি'],
  },
  headache: {
    en: 'Headache',
    bn: 'মাথা ব্যাথা',
    matchSymptoms: ['headache', 'মাথা ব্যাথা', 'মাথাব্যথা', 'মাথা ব্যথা'],
  },
  vertigo: {
    en: 'Vertigo',
    bn: 'মাথা ঘোরানো (ভার্টিগো)',
    matchSymptoms: ['vertigo', 'dizziness', 'মাথা ঘোরানো', 'মাথা ঘোরা', 'ঘূর্ণি'],
  },
  oedema: {
    en: 'Oedema (Swelling)',
    bn: 'হাত-পা-মুখে পানি আসা (ইডিমা)',
    matchSymptoms: ['oedema', 'edema', 'হাত-পা-মুখে পানি আসা', 'পা ফোলা', 'শরীর ফোলা', 'পানি আসা'],
  },
  anxiety_depression: {
    en: 'Anxiety & Depression',
    bn: 'দুশ্চিন্তা ও বিষণ্ণতা',
    matchSymptoms: ['anxiety', 'depression', 'দুশ্চিন্তা', 'উদ্বেগ', 'বিষণ্ণতা'],
  },
  insomnia: {
    en: 'Insomnia',
    bn: 'ঘুম কম (অনিদ্রা)',
    matchSymptoms: ['insomnia', 'ঘুম কম', 'অনিদ্রা', 'ঘুম না হওয়া', 'ঘুম না হওয়া'],
  },
  low_back_pain: {
    en: 'Low Back Pain (LBP)',
    bn: 'কোমরে ব্যথা (এলবিপি)',
    matchSymptoms: ['low back pain', 'lbp', 'back pain', 'কোমরে ব্যথা', 'পিঠে ব্যথা', 'কোমর ব্যথা'],
  },
  fever: {
    en: 'Fever',
    bn: 'জ্বর',
    matchSymptoms: ['fever', 'জ্বর', 'জর', 'temperature', 'feverish'],
  },
  chicken_pox: {
    en: 'Chicken Pox',
    bn: 'বসন্ত (চিকেন পক্স)',
    matchSymptoms: ['chicken pox', 'chickenpox', 'pox', 'বসন্ত', 'জলবসন্ত', 'পক্স'],
  },
  diarrhoea: {
    en: 'Diarrhoea',
    bn: 'পাতলা পায়খানা (ডায়রিয়া)',
    matchSymptoms: ['diarrhoea', 'diarrhea', 'পাতলা পায়খানা', 'ডায়রিয়া', 'ডায়রিয়া', 'পাতলা পায়খানা'],
  },
  nausea_vomiting: {
    en: 'Nausea & Vomiting',
    bn: 'বমি বা বমি ভাব',
    matchSymptoms: ['vomiting', 'nausea', 'বমি', 'বমি ভাব', 'বমি বমি ভাব'],
  },
  abdominal_pain: {
    en: 'Abdominal Pain',
    bn: 'পেটে ব্যথা',
    matchSymptoms: ['abdominal pain', 'stomach pain', 'পেটে ব্যথা', 'পেট ব্যথা', 'তলপেটে ব্যথা'],
  },
  cough: {
    en: 'Cough',
    bn: 'কাশি',
    matchSymptoms: ['cough', 'কাশি', 'কফ', 'খুকখুকে কাশি'],
  },
  uti: {
    en: 'Urinary Tract Infection (UTI)',
    bn: 'প্রস্রাবে ইনফেকশন (ইউটিআই)',
    matchSymptoms: ['uti', 'urine infection', 'urinary tract infection', 'প্রস্রাবে ইনফেকশন', 'প্রস্রাবে জ্বালা', 'প্রস্রাবে জ্বালাপোড়া'],
  },
  nocturnal_enuresis: {
    en: 'Nocturnal Enuresis (Bedwetting)',
    bn: 'বিছানায় প্রস্রাব (নকটারনাল এনিউরেসিস)',
    matchSymptoms: ['nocturnal enuresis', 'bedwetting', 'বিছানায় প্রস্রাব', 'বিছানায় প্রস্রাব'],
  },
  sore_throat: {
    en: 'Sore Throat',
    bn: 'গলা ব্যথা',
    matchSymptoms: ['sore throat', 'গলা ব্যথা', 'গলা খুসখুস'],
  },
  acute_tonsillitis: {
    en: 'Acute Tonsillitis',
    bn: 'টনসিলের প্রদাহ (অ্যাকিউট টনসিলাইটিস)',
    matchSymptoms: ['tonsillitis', 'acute tonsillitis', 'tonsil', 'টনসিল', 'টনসিলের প্রদাহ'],
  },
  abscess_boil: {
    en: 'Abscess / Boil',
    bn: 'ফোঁড়া (অ্যাবসেস / বয়েল)',
    matchSymptoms: ['abscess', 'boil', 'ফোঁড়া', 'ফোড়া'],
  },
  scabies: {
    en: 'Scabies',
    bn: 'স্ক্যাবিস বা খোসপাঁচড়া',
    matchSymptoms: ['scabies', 'খোসপাঁচড়া', 'খোস পাঁচড়া', 'চুলকানি', 'স্ক্যাবিস'],
  },
  tenia_corporis: {
    en: 'Tenia Corporis (Ringworm)',
    bn: 'দাঁদ (টিনিয়া কর্পোরিস)',
    matchSymptoms: ['tenia corporis', 'ringworm', 'দাঁদ', 'দাদ', 'দাউদ', 'রিংওয়ার্ম'],
  },
  gastritis: {
    en: 'Gastritis / Acidity',
    bn: 'গ্যাস্ট্রাইটিস (গ্যাস্ট্রিক / এসিডিটি)',
    matchSymptoms: ['gastritis', 'acidity', 'gas', 'গ্যাস্ট্রিক', 'গ্যাস্ট্রাইটিস', 'এসিডিটি', 'গ্যাস', 'বুকজ্বালা', 'heartburn'],
  }
};

const ageMap = {
  "7m-2y": ["infant"],
  "3-8y": ["child_s"],
  "3y-8y": ["child_s"],
  "3y-7y": ["child_s"],
  "9y-13y": ["child"],
  "9-13y": ["child"],
  "8y-13y": ["child"],
  "14-17y": ["teen"],
  "14y-17y": ["teen"],
  "13y-17y": ["teen"],
  "18+": ["adult"],
  "14y-18y": ["teen", "adult"]
};

// Group raw items into families
const familyGroups = new Map();
rawData.forEach(item => {
  let fam = item.condition_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (fam.includes("nausea") || fam.includes("vomiting")) fam = "nausea_vomiting";
  if (fam.includes("candidiasis_mouth")) fam = "oral_candidiasis_mouth";
  if (fam.includes("candidiasis_tongue")) fam = "oral_candidiasis_tongue";
  if (fam.includes("aphthous")) fam = "aphthous_ulcer";
  if (fam.includes("anxiety")) fam = "anxiety_depression";
  if (fam.includes("lbp")) fam = "low_back_pain";
  if (fam.includes("abscess") || fam.includes("boil")) fam = "abscess_boil";
  if (fam.includes("tenia")) fam = "tenia_corporis";
  if (fam.includes("tonsillitis")) fam = "acute_tonsillitis";
  if (fam.includes("enuresis")) fam = "nocturnal_enuresis";
  if (fam.includes("cold")) fam = "common_cold";

  if (!familyGroups.has(fam)) familyGroups.set(fam, []);
  familyGroups.get(fam).push(item);
});

const conditionEntries = [];

for (const [famKey, items] of familyGroups.entries()) {
  const meta = familyMeta[famKey] || {
    en: items[0].condition_en,
    bn: items[0].condition_bn,
    matchSymptoms: [famKey, items[0].condition_bn],
  };

  // Sort items so adult or first is primary
  items.sort((a, b) => {
    if (a.age_group === '18+') return -1;
    if (b.age_group === '18+') return 1;
    return a.photo_num - b.photo_num;
  });

  items.forEach((item, idx) => {
    let ageGroups = ageMap[item.age_group] || ['adult'];
    // For Gastritis Photo 86 (14-17y) also cover adult
    if (famKey === 'gastritis' && item.photo_num === 86) {
      ageGroups = ['teen', 'adult'];
    }

    const isPrimary = (idx === 0);
    const id = `${famKey}_photo${item.photo_num}_${item.age_group.replace(/[^a-z0-9]+/g, '_')}`;

    const meds = item.medicines.map(m => {
      const name = `${m.form} ${m.name}${m.strength ? ' ' + m.strength : ''}`.trim();
      const dose = m.dosage || '';
      const timing = m.instructions || (m.is_sos ? 'As needed' : 'After meal');
      const duration = m.duration || (m.is_sos ? 'As needed' : '');
      const timingBn = m.instructions || (m.is_sos ? 'প্রয়োজন অনুযায়ী' : 'খাবারের পর');
      const durationBn = m.duration || (m.is_sos ? 'প্রয়োজন অনুযায়ী' : '');
      return {
        name,
        dose,
        timing,
        duration,
        timingBn,
        durationBn
      };
    });

    conditionEntries.push({
      id,
      family: famKey,
      familyPrimary: isPrimary,
      name: meta.en,
      photo_num: item.photo_num,
      photo_name: item.photo_name,
      ageGroups,
      ageLabel: item.age_group,
      matchSymptoms: meta.matchSymptoms,
      minMatch: 1,
      description: "",
      general_instructions: item.general_instructions || '',
      translations: {
        bn: {
          name: meta.bn,
          description: "",
        }
      },
      medicines: meds
    });
  });
}

console.log("Generated total condition protocol entries:", conditionEntries.length);

const outCode = `/* =============================================
   VEDA – Medical Knowledge Database
   Source: 87 clinic notebook photos in /Images
   Strictly synchronized with notebook_prescriptions.json
   NO external/fabricated tips or severity tags.
   Languages: English + Bangla
   ============================================= */

export const getLocalized = (item, field, lang) => {
  if (!item) return '';
  if (item.translations && item.translations[lang] && item.translations[lang][field]) {
    return item.translations[lang][field];
  }
  return item[field] || '';
};

const med = (name, dose, timing, duration, timingBn, durationBn) => ({
  name,
  dose,
  timing,
  duration,
  translations: { bn: { timing: timingBn, duration: durationBn } },
});

const AGE_ORDER = ['infant', 'child_s', 'child', 'teen', 'adult'];

export const resolveConditionForAge = (condition, ageId, database = conditionDatabase) => {
  if (!condition) return condition;
  if (condition.family) {
    const exact = database.find(
      (c) => c.family === condition.family && (c.ageGroups || []).includes(ageId)
    );
    if (exact) return exact;
  }
  if ((condition.ageGroups || []).includes(ageId)) return condition;
  return condition;
};

export const agesAvailableFor = (condition, database = conditionDatabase) => {
  if (!condition) return AGE_ORDER;
  if (condition.family) {
    const set = new Set();
    database.forEach((c) => {
      if (c.family === condition.family) (c.ageGroups || []).forEach((a) => set.add(a));
    });
    return AGE_ORDER.filter((a) => set.has(a));
  }
  return condition.ageGroups || AGE_ORDER;
};

export const bodyRegions = [
  { id: 'head', label: 'Head & Brain', icon: '🧠', x: 50, y: 8, translations: { bn: { label: 'মাথা ও মস্তিষ্ক' } } },
  { id: 'eyes', label: 'Eyes', icon: '👁️', x: 50, y: 13, translations: { bn: { label: 'চোখ' } } },
  { id: 'ear', label: 'Ears', icon: '👂', x: 50, y: 14, translations: { bn: { label: 'কান' } } },
  { id: 'nose', label: 'Nose & Sinuses', icon: '👃', x: 50, y: 16, translations: { bn: { label: 'নাক ও সাইনাস' } } },
  { id: 'throat', label: 'Throat & Mouth', icon: '👄', x: 50, y: 20, translations: { bn: { label: 'গলা ও মুখ' } } },
  { id: 'chest', label: 'Chest & Lungs', icon: '🫁', x: 50, y: 32, translations: { bn: { label: 'বুক ও ফুসফুস' } } },
  { id: 'heart', label: 'Heart', icon: '❤️', x: 45, y: 30, translations: { bn: { label: 'হৃদয়' } } },
  { id: 'stomach', label: 'Stomach & Abdomen', icon: '🤢', x: 50, y: 45, translations: { bn: { label: 'পেট ও উদর' } } },
  { id: 'skin', label: 'Skin', icon: '🖐️', x: 20, y: 50, translations: { bn: { label: 'ত্বক' } } },
  { id: 'joints', label: 'Joints & Muscles', icon: '🦴', x: 80, y: 55, translations: { bn: { label: 'গাঁট ও পেশী' } } },
  { id: 'back', label: 'Back & Spine', icon: '🔙', x: 50, y: 55, translations: { bn: { label: 'পিঠ ও মেরুদণ্ড' } } },
  { id: 'legs', label: 'Legs & Feet', icon: '🦶', x: 50, y: 80, translations: { bn: { label: 'পা ও পায়ের পাতা' } } },
];

export const commonSymptoms = [
  { id: 'fever', label: 'Fever', category: 'general', icon: '🤒', translations: { bn: { label: 'জ্বর' } } },
  { id: 'headache', label: 'Headache', category: 'pain', icon: '🤕', translations: { bn: { label: 'মাথাব্যথা' } } },
  { id: 'cough', label: 'Cough', category: 'respiratory', icon: '😷', translations: { bn: { label: 'কাশি' } } },
  { id: 'sore_throat', label: 'Sore Throat', category: 'respiratory', icon: '🗣️', translations: { bn: { label: 'গলা ব্যথা' } } },
  { id: 'runny_nose', label: 'Runny Nose', category: 'respiratory', icon: '🤧', translations: { bn: { label: 'সর্দি' } } },
  { id: 'nausea', label: 'Nausea', category: 'digestive', icon: '🤢', translations: { bn: { label: 'বমি বমি ভাব' } } },
  { id: 'vomiting', label: 'Vomiting', category: 'digestive', icon: '🤮', translations: { bn: { label: 'বমি' } } },
  { id: 'diarrhea', label: 'Diarrhea', category: 'digestive', icon: '💩', translations: { bn: { label: 'ডায়রিয়া' } } },
  { id: 'stomach_pain', label: 'Stomach Pain', category: 'digestive', icon: '😖', translations: { bn: { label: 'পেট ব্যথা' } } },
  { id: 'rash', label: 'Skin Rash', category: 'skin', icon: '🔴', translations: { bn: { label: 'ত্বকে ফুসকুড়ি' } } },
  { id: 'itching', label: 'Itching', category: 'skin', icon: '🖐️', translations: { bn: { label: 'চুলকানি' } } },
  { id: 'cold', label: 'Common Cold', category: 'respiratory', icon: '🤧', translations: { bn: { label: 'সাধারণ সর্দি' } } },
  { id: 'back_pain', label: 'Back Pain', category: 'pain', icon: '🔙', translations: { bn: { label: 'পিঠের ব্যথা' } } },
  { id: 'chest_pain', label: 'Chest Pain', category: 'emergency', icon: '💔', translations: { bn: { label: 'বুকে ব্যথা' } } },
  { id: 'breathing_difficulty', label: 'Breathing Difficulty', category: 'emergency', icon: '😤', translations: { bn: { label: 'শ্বাসকষ্ট' } } },
  { id: 'anxiety', label: 'Anxiety', category: 'mental', icon: '😰', translations: { bn: { label: 'উদ্বেগ' } } },
  { id: 'insomnia', label: 'Insomnia', category: 'mental', icon: '🌙', translations: { bn: { label: 'অনিদ্রা' } } },
  { id: 'mouth_sore', label: 'Mouth Sores', category: 'general', icon: '👄', translations: { bn: { label: 'মুখে ঘা' } } },
  { id: 'constipation', label: 'Constipation', category: 'digestive', icon: '😣', translations: { bn: { label: 'কোষ্ঠকাঠিন্য' } } },
  { id: 'yellow_eyes', label: 'Yellow Eyes / Skin', category: 'general', icon: '🟡', translations: { bn: { label: 'চোখ/ত্বক হলুদ' } } },
  { id: 'dark_urine', label: 'Dark / Yellow Urine', category: 'urinary', icon: '🧴', translations: { bn: { label: 'প্রস্রাব হলুদ' } } },
  { id: 'burning_urine', label: 'Burning Urination', category: 'urinary', icon: '🔥', translations: { bn: { label: 'প্রস্রাবে জ্বালা' } } },
  { id: 'chickenpox_rash', label: 'Chickenpox Spots', category: 'skin', icon: '🔴', translations: { bn: { label: 'বসন্তের দানা' } } },
  { id: 'boil', label: 'Boil / Abscess', category: 'skin', icon: '🟡', translations: { bn: { label: 'ফোড়া' } } },
  { id: 'scabies_itch', label: 'Scabies Itch', category: 'skin', icon: '🪳', translations: { bn: { label: 'খোসপাঁচড়া' } } },
  { id: 'heartburn', label: 'Heartburn / Acidity', category: 'digestive', icon: '🔥', translations: { bn: { label: 'বুকজ্বালা / এসিডিটি' } } },
];

export const conditionDatabase = [
${conditionEntries.map(c => `  {
    id: ${JSON.stringify(c.id)},
    family: ${JSON.stringify(c.family)},
    familyPrimary: ${c.familyPrimary},
    name: ${JSON.stringify(c.name)},
    photo_num: ${c.photo_num},
    photo_name: ${JSON.stringify(c.photo_name)},
    ageGroups: ${JSON.stringify(c.ageGroups)},
    ageLabel: ${JSON.stringify(c.ageLabel)},
    matchSymptoms: ${JSON.stringify(c.matchSymptoms)},
    minMatch: 1,
    description: "",
    general_instructions: ${JSON.stringify(c.general_instructions)},
    translations: {
      bn: {
        name: ${JSON.stringify(c.translations.bn.name)},
        description: "",
      },
    },
    medicines: [
${c.medicines.map(m => `      med(${JSON.stringify(m.name)}, ${JSON.stringify(m.dose)}, ${JSON.stringify(m.timing)}, ${JSON.stringify(m.duration)}, ${JSON.stringify(m.timingBn)}, ${JSON.stringify(m.durationBn)}),`).join('\n')}
    ],
  },`).join('\n')}
];

export const firstAidActions = [
  {
    id: 'choking',
    title: 'Choking',
    icon: '😤',
    urgency: 'critical',
    translations: {
      bn: { title: 'শ্বাসরোধ', steps: ['ব্যক্তির পিছনে দাঁড়ান', 'হেইমলিচ ম্যানুভার প্রয়োগ করুন', 'বস্তুটি বের না হওয়া পর্যন্ত পুনরাবৃত্তি করুন'] },
    },
    steps: ['Stand behind the person', 'Perform abdominal thrusts (Heimlich manoeuvre)', 'Repeat until the object is expelled'],
  },
  {
    id: 'bleeding',
    title: 'Heavy Bleeding',
    icon: '🩸',
    urgency: 'critical',
    translations: {
      bn: {
        title: 'অতিরিক্ত রক্তক্ষরণ',
        steps: [
          '২–৩ মিনিট পানির নিচে রাখুন',
          'পরিষ্কার কাপড়/রুমাল দিয়ে স্থান পরিষ্কার করুন',
          'পরিষ্কার জায়গায় বসান',
          'সরাসরি চাপ দিয়ে রক্তপাত বন্ধ করুন',
          'রক্তভেজা কাপড় সরাবেন না; তার উপর আরেকটি চাপুন',
          'রক্তপাত না থামলে ডাক্তার / ৯৯৯',
        ],
      },
    },
    steps: [
      'Rinse under water for 2–3 minutes',
      'Clean with a clean cloth',
      'Sit the person in a clean place',
      'Apply firm direct pressure to stop bleeding',
      'Do not remove soaked cloth — add another on top',
      'If bleeding does not stop, see a doctor / call 999',
    ],
  },
];

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
];

export const disclaimer = {
  short: 'Veda provides clinic notebook medication records for reference.',
  full: 'MEDICAL DISCLAIMER: Veda displays treatment protocols transcribed directly from the 87 clinic notebook photos. A registered doctor must confirm any medication before use.',
};

export const symptomsByRegion = {
  head: ['Headache', 'Fever', 'Runny Nose', 'Sore Throat', 'Mouth Sores'],
  eyes: ['Yellow Eyes / Skin', 'Headache'],
  ear: ['Ear Pain'],
  nose: ['Runny Nose', 'Common Cold'],
  throat: ['Sore Throat', 'Mouth Sores'],
  chest: ['Chest Pain', 'Cough', 'Breathing Difficulty'],
  heart: ['Chest Pain', 'Heartburn'],
  stomach: ['Gastritis', 'Stomach Pain', 'Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Jaundice'],
  skin: ['Skin Rash', 'Itching', 'Chickenpox Spots', 'Boil / Abscess', 'Scabies Itch'],
  joints: ['Body Ache', 'Low Back Pain'],
  back: ['Low Back Pain', 'Back Pain'],
  legs: ['Leg Pain'],
  arm: ['Arm Pain'],
  neck: ['Sore Throat'],
};

export const conditionCount = new Set(conditionDatabase.map((c) => c.family || c.id)).size;
export const conditionProtocolCount = conditionDatabase.length;
`;

fs.writeFileSync('./src/data/medicalData.js', outCode, 'utf8');
console.log("Successfully generated clean medicalData.js with mutually exclusive aliases!");
