import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Smartphone,
  Share,
  CheckCircle2,
  PlusSquare,
  WifiOff
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPromptScreen: React.FC = () => {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } catch (e) {
      console.warn('Install prompt notice:', e);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('install.title', 'Install Family Firewall')}
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="install" />
        </div>

        {/* Hero Card */}
        <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner border-2 border-teal-deep/20">
            <Smartphone size={44} className="text-teal-deep" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-teal-deep leading-tight">
            {isInstalled
              ? t('install.installedTitle', 'App is Installed!')
              : t('install.heading', 'Use Family Firewall on Your Phone')}
          </h2>

          <p className="text-lg text-brown-dark/85 font-medium leading-relaxed">
            {t(
              'install.subtitle',
              'Install on your home screen for one-tap emergency Pause, zero data lag, and full offline rehearsal anytime.'
            )}
          </p>

          <div className="p-3 bg-[#E8F8F5] rounded-xl border border-teal-deep/20 flex items-center justify-center gap-2 text-xs font-bold text-teal-deep">
            <WifiOff size={16} />
            <span>{t('install.offlineBadge', 'Works 100% offline after one online load')}</span>
          </div>
        </section>

        {/* Direct Install Button (Android / Chrome) */}
        {installPrompt && !isInstalled && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3"
          >
            <Download size={24} />
            <span>{t('install.installNowButton', 'Install App Now')}</span>
          </button>
        )}

        {/* Instructions by Platform */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-4">
          <h3 className="font-extrabold text-lg text-teal-deep">
            {isIOS ? 'How to Add on iPhone / iPad' : 'How to Add to Home Screen'}
          </h3>

          {isIOS ? (
            <div className="space-y-3 text-sm font-medium text-brown-dark/85">
              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="pt-0.5">
                  Tap the <strong className="text-teal-deep">Share button</strong> (
                  <Share size={15} className="inline mx-1" />) at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="pt-0.5">
                  Scroll down and tap <strong className="text-teal-deep">Add to Home Screen</strong> (
                  <PlusSquare size={15} className="inline mx-1" />
                  ).
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="pt-0.5">
                  Tap <strong className="text-teal-deep">Add</strong> in the top right corner. The icon will appear on your home screen.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm font-medium text-brown-dark/85">
              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="pt-0.5">
                  Tap the browser menu (<strong className="text-teal-deep">three dots &vellip;</strong> in Chrome).
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="pt-0.5">
                  Select <strong className="text-teal-deep">Install app</strong> or <strong className="text-teal-deep">Add to Home screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-cream/40 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="pt-0.5">
                  Confirm the install. You can now open Family Firewall anytime with zero internet needed!
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Benefits Card */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <h3 className="font-extrabold text-base text-teal-deep">Why install this app?</h3>
          <ul className="text-sm font-medium text-brown-dark/80 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal-deep shrink-0" />
              <span>Instant opening without typing URLs</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal-deep shrink-0" />
              <span>Full offline support for rehearsals and Pause guidance</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal-deep shrink-0" />
              <span>Safe words and phone numbers stay strictly on your device</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};
