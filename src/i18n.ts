import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import deTranslations from './locales/de/translation.json';
import frTranslations from './locales/fr/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en', // Force English by default
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      de: { translation: deTranslations },
      fr: { translation: frTranslations },
    },
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;

