/**
 * Social Planner - i18n Configuration
 *
 * Internationalization setup using react-i18next.
 * Supports English (default) and Dutch.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enCommon from '@/locales/en/common.json';
import nlCommon from '@/locales/nl/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  nl: {
    common: nlCommon,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

/**
 * Change the current language and persist to localStorage
 */
export function changeLanguage(lang: 'en' | 'nl') {
  localStorage.setItem('language', lang);
  i18n.changeLanguage(lang);
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}
