import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import hing from './locales/hing.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  hing: { translation: hing }
};

// Check stored language preference if present
const savedLang = localStorage.getItem('app_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

export default i18n;
