import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Settings as SettingsIcon } from 'lucide-react';
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

  // 7-tap detector on logo for hidden Demo Mode
  const tapCountRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const handleLogoTap = () => {
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

      <header className="sticky top-0 z-30 w-full max-w-full bg-cream/95 backdrop-blur border-b border-teal-deep/10 px-2 sm:px-4 py-2 sm:py-3 overflow-hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left Action / Logo */}
          <div className="flex items-center gap-1 shrink-0">
            {showBack && !isWelcome && (
              <button
                type="button"
                onClick={handleBack}
                aria-label={t('nav.back', 'Back')}
                className="h-10 w-10 sm:h-11 sm:w-11 p-2 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            {showHome && !isWelcome && location.pathname !== '/elder' && (
              <button
                type="button"
                onClick={() => navigate('/elder')}
                aria-label={t('nav.home', 'Home')}
                className="h-10 w-10 sm:h-11 sm:w-11 p-2 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card shrink-0"
              >
                <Home size={20} />
              </button>
            )}

            {/* Logo with 7-tap gesture for Demo Mode */}
            {isWelcome ? (
              <button
                type="button"
                onClick={handleLogoTap}
                className="flex items-center gap-2 text-teal-deep font-bold text-left select-none focus:outline-none"
                aria-label="Family Firewall"
                title="Family Firewall (Tap 7 times for Demo Mode)"
              >
                <img
                  src="/logo-icon-256.png"
                  alt="Family Firewall"
                  width={45}
                  height={40}
                  loading="eager"
                  className="h-10 w-auto object-contain select-none shrink-0"
                />
                <span className="leading-tight text-lg sm:text-xl font-black truncate">Family Firewall</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogoTap}
                aria-label="Family Firewall"
                title="Family Firewall (Tap 7 times for Demo Mode)"
                className="h-10 w-[45px] shrink-0 p-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-deep/30 transition-transform active:scale-95 flex items-center justify-center"
              >
                <img
                  src="/logo-icon-256.png"
                  alt="Family Firewall"
                  width={45}
                  height={40}
                  loading="eager"
                  className="h-10 w-auto object-contain select-none shrink-0"
                />
              </button>
            )}
          </div>

          {/* Center Title */}
          {title && !isWelcome && (
            <h1
              className="text-sm sm:text-base md:text-lg font-bold text-brown-dark truncate text-center flex-1 px-1 select-none min-w-0"
            >
              {title}
            </h1>
          )}

          {/* Right Side: Language Switcher, Text Size, and Settings */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <LanguageSwitcher variant="compact" />

            <button
              type="button"
              onClick={handleToggleTextSize}
              aria-label={isLargeText ? 'Switch to normal text size' : 'Switch to large text size'}
              title={isLargeText ? 'Normal text size (18px)' : 'Large text size (22px)'}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border shadow-sm flex items-center justify-center font-black text-xs transition-card active:scale-95 shrink-0 ${
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
                className="h-10 w-10 sm:h-11 sm:w-11 p-2 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card shrink-0"
              >
                <SettingsIcon size={18} />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
