import fetch from 'node-fetch';

const SUPPORTED_LANGUAGES = ['bn'];

/**
 * Translates text to a target language using MyMemory API (Free, Non-Google)
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language code
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang) {
  if (!text) return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return text;
  } catch (error) {
    console.error(`Translation error for ${targetLang}:`, error);
    return text; // Fallback to original text on failure
  }
}

/**
 * Translates a single string into all supported languages.
 * @param {string} text - English text
 * @returns {Promise<Object>} - Object with language codes as keys
 */
export async function translateToAll(text) {
  if (!text) return {};
  
  const translations = {};
  
  // To avoid rate limiting, we do this sequentially or in small batches
  for (const lang of SUPPORTED_LANGUAGES) {
    translations[lang] = await translateText(text, lang);
    // Add a small delay to respect MyMemory API rate limits (1 request/sec for free tier)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return translations;
}

/**
 * Translates an object containing multiple text fields into all supported languages.
 * Example: translateObject({ title: "Hello", desc: "World" })
 * Returns: { bn: { title: "হ্যালো", desc: "বিশ্ব" }, hi: { ... } }
 */
export async function translateObject(obj) {
  const translations = {};
  
  for (const lang of SUPPORTED_LANGUAGES) {
    translations[lang] = {};
  }

  for (const [key, text] of Object.entries(obj)) {
    if (!text || typeof text !== 'string') continue;
    
    for (const lang of SUPPORTED_LANGUAGES) {
      translations[lang][key] = await translateText(text, lang);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return translations;
}
