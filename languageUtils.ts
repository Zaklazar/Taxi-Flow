import { changeLanguage } from '../i18n';

export type AvailableLanguage = 'fr' | 'en';

export const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
] as const;

export const switchLanguage = async (lang: AvailableLanguage) => {
  await changeLanguage(lang);
};

export const getLanguageName = (code: string): string => {
  const language = languages.find(lang => lang.code === code);
  return language ? language.name : 'Français';
};
