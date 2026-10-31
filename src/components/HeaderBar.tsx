import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OfflineBanner } from './OfflineBanner';
import { setSetting } from '../db';

interface HeaderBarProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showSettings?: boolean;
  backTo?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  showBack = true,
  showHome = true,
  showSettings = true,
  backTo
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isWelcome = location.pathname === '/' || location.pathname === '/welcome';
  const isSettings = location.pathname === '/settings';

  const [isLargeText, setIsLargeText] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.body.classList.contains('text-size-large');
  });

  useEffect(() => {
    const handleTextChange = () => {
      setIsLargeText(document.body.classList.contains('text-size-large'));
    };
    window.addEventListener('text-size-change', handleTextChange);
    return () => window.removeEventListener('text-size-change', handleTextChange);
  }, []);

  const handleToggleTextSize = async () => {
    const newIsLarge = !isLargeText;
    setIsLargeText(newIsLarge);
    if (newIsLarge) {
      document.body.classList.add('text-size-large');
      await setSetting('textSize', 'large');
    } else {
      document.body.classList.remove('text-size-large');
      await setSetting('textSize', 'normal');
    }
    window.dispatchEvent(new Event('text-size-change'));
  };

  // 7-tap detector for hidden Demo Mode
  const tapCountRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const handleTitleTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 2000) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      navigate('/demo');
    }
  };

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/elder');
    }
  };

  return (
    <>
      {/* Offline and Force Offline Reassurance Banner */}
      <OfflineBanner />

      <header className="sticky top-0 z-30 w-full bg-cream/95 backdrop-blur border-b border-teal-deep/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Navigation Action: Back or Home */}
          <div className="flex items-center gap-1">
            {showBack && !isWelcome && (
              <button
                type="button"
                onClick={handleBack}
                aria-label={t('nav.back', 'Back')}
                className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
              >
                <ArrowLeft size={22} />
              </button>
            )}

            {showHome && !isWelcome && location.pathname !== '/elder' && (
              <button
                type="button"
                onClick={() => navigate('/elder')}
                aria-label={t('nav.home', 'Home')}
                className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
              >
                <Home size={22} />
              </button>
            )}

            {isWelcome && (
              <button
                type="button"
                onClick={handleTitleTap}
                className="flex items-center gap-2 text-teal-deep font-bold text-lg text-left select-none focus:outline-none"
                aria-label="Family Firewall logo"
              >
                <div className="w-10 h-10 rounded-full bg-teal-deep text-cream flex items-center justify-center shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <span className="leading-tight text-xl font-black">Family Firewall</span>
              </button>
            )}
          </div>

          {/* Center Title with 7-tap detector */}
          {title && !isWelcome && (
            <h1
              onClick={handleTitleTap}
              className="text-xl font-bold text-brown-dark truncate text-center flex-1 px-1 cursor-pointer select-none"
              title="Tap 7 times to open Demo Mode"
            >
              {title}
            </h1>
          )}

          {/* Right Side: Language Switcher, Text Size, and Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher variant="compact" />

            <button
              type="button"
              onClick={handleToggleTextSize}
              aria-label={isLargeText ? 'Switch to normal text size' : 'Switch to large text size'}
              title={isLargeText ? 'Normal text size (18px)' : 'Large text size (22px)'}
              className={`min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-full border shadow-sm flex items-center justify-center font-black text-xs transition-card active:scale-95 ${
                isLargeText
                  ? 'bg-teal-deep text-cream border-teal-deep'
                  : 'bg-white text-teal-deep hover:bg-cream border-teal-deep/20'
              }`}
            >
              <span className="text-[10px] font-semibold mr-0.5">A</span>
              <span className="text-sm font-extrabold leading-none">A</span>
            </button>

            {showSettings && !isSettings && !isWelcome && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                aria-label={t('nav.settings', 'Settings')}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
              >
                <SettingsIcon size={20} />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
