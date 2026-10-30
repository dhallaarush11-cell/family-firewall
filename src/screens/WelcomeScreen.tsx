import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, UserCheck, Users, Sparkles } from 'lucide-react';
import { saveProfile, getProfile } from '../db';

export const WelcomeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language || 'en');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check if profile already exists
    getProfile().then(profile => {
      if (profile) {
        setSelectedLanguage(profile.language);
        if (i18n.language !== profile.language) {
          i18n.changeLanguage(profile.language);
        }
      }
    });
  }, [i18n]);

  const handleLanguageSelect = async (lang: string) => {
    setSelectedLanguage(lang);
    await i18n.changeLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const handleRoleSelect = async (role: 'parent' | 'family') => {
    try {
      setIsSaving(true);
      const lang = (selectedLanguage as 'hi' | 'en' | 'hing') || 'en';
      await saveProfile(role, lang);
      if (role === 'parent') {
        navigate('/elder');
      } else {
        navigate('/family');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const languages = [
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'hing', label: 'Hinglish', sub: 'Hindi in Roman' }
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Branding */}
      <div className="pt-6 sm:pt-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-deep text-cream shadow-elevated mb-4 border-2 border-teal-deep/30">
          <ShieldCheck size={48} className="text-cream" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-teal-deep tracking-tight">
          {t('app.name')}
        </h1>

        <p className="text-sm font-bold text-terracotta tracking-wider uppercase mt-1">
          {t('app.byline')}
        </p>

        <p className="text-xl sm:text-2xl font-bold text-brown-dark mt-3 leading-snug">
          "{t('app.tagline')}"
        </p>

        <p className="text-sm text-brown-dark/70 mt-2 max-w-xs mx-auto leading-relaxed">
          {t('app.mission')}
        </p>
      </div>

      {/* Main Selection Area */}
      <div className="my-6 space-y-6">
        {/* Step 1: Language Buttons */}
        <div className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15">
          <label className="block text-lg font-extrabold text-teal-deep mb-3 text-center">
            {t('languages.title')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {languages.map(lang => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`min-h-[56px] px-4 py-3 rounded-card text-lg font-bold border-2 transition-card flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-teal-deep text-cream border-teal-deep shadow-elevated scale-[1.02]'
                      : 'bg-white text-brown-dark border-[#0B4F4A]/20 hover:border-teal-deep/50 hover:bg-[#FFFDF7]'
                  }`}
                >
                  <span className="text-xl leading-tight">{lang.label}</span>
                  <span className={`text-xs mt-0.5 ${isSelected ? 'text-cream/80' : 'text-brown-dark/60'}`}>
                    {lang.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Role Buttons */}
        <div className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15">
          <label className="block text-lg font-extrabold text-teal-deep mb-3 text-center">
            {t('welcome.rolePrompt')}
          </label>
          <div className="space-y-3.5">
            {/* Button 1: I am the parent */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleRoleSelect('parent')}
              className="w-full min-h-[64px] p-4 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-extrabold text-xl shadow-elevated border-2 border-teal-deep transition-card flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-12 h-12 rounded-full bg-cream/15 flex items-center justify-center shrink-0">
                  <UserCheck size={28} className="text-cream" />
                </div>
                <div>
                  <div className="leading-tight text-xl">{t('roles.parent')}</div>
                  <div className="text-xs text-cream/80 font-normal mt-0.5">{t('roles.parentSub')}</div>
                </div>
              </div>
              <Sparkles size={22} className="text-terracotta shrink-0" />
            </button>

            {/* Button 2: I am the family member */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleRoleSelect('family')}
              className="w-full min-h-[64px] p-4 rounded-card bg-white hover:bg-cream/40 active:scale-[0.98] text-brown-dark font-extrabold text-xl shadow-soft border-2 border-teal-deep/30 hover:border-teal-deep transition-card flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-12 h-12 rounded-full bg-teal-deep/10 text-teal-deep flex items-center justify-center shrink-0">
                  <Users size={28} />
                </div>
                <div>
                  <div className="leading-tight text-xl">{t('roles.family')}</div>
                  <div className="text-xs text-brown-dark/70 font-normal mt-0.5">{t('roles.familySub')}</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Respectful Trust Footer */}
      <footer className="text-center text-xs text-brown-dark/60 pb-4">
        <p>Private &bull; Stored locally on this device &bull; No ads &bull; No analytics</p>
      </footer>
    </div>
  );
};
