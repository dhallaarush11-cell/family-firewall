import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { db } from '../db';

interface LanguageSwitcherProps {
  variant?: 'buttons' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'compact', className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const languages = [
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'hing', label: 'Hinglish', sub: 'Hindi in English' }
  ];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    localStorage.setItem('app_language', langCode);
    try {
      const profile = await db.profile.get('user_profile');
      if (profile) {
        await db.profile.update('user_profile', {
          language: langCode as 'hi' | 'en' | 'hing',
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.warn('Could not update profile language:', err);
    }
  };

  if (variant === 'buttons') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 w-full ${className}`}>
        {languages.map(lang => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`min-h-[56px] px-4 py-3 rounded-card text-lg font-bold border-2 transition-card flex flex-col items-center justify-center ${
                isActive
                  ? 'bg-teal-deep text-cream border-teal-deep shadow-elevated scale-[1.02]'
                  : 'bg-white text-brown-dark border-[#0B4F4A]/20 hover:border-teal-deep/50 hover:bg-[#FFFDF7]'
              }`}
            >
              <span className="text-xl leading-tight">{lang.label}</span>
              <span className={`text-xs mt-0.5 ${isActive ? 'text-cream/80' : 'text-brown-dark/60'}`}>
                {lang.sub}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur rounded-full border border-teal-deep/20 shadow-sm ${className}`}>
      <div className="pl-2 pr-1 text-teal-deep/70">
        <Globe size={18} aria-hidden="true" />
      </div>
      {languages.map(lang => {
        const isActive = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleLanguageChange(lang.code)}
            aria-label={`Switch language to ${lang.label}`}
            className={`px-3 py-1.5 rounded-full text-base font-semibold transition-all ${
              isActive
                ? 'bg-teal-deep text-white shadow-sm'
                : 'text-brown-dark/70 hover:text-teal-deep hover:bg-cream/50'
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
