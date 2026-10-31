import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

export function isForceOfflineActive(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('demo_force_offline') === 'true';
}

export function setForceOfflineActive(active: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (active) {
    localStorage.setItem('demo_force_offline', 'true');
  } else {
    localStorage.removeItem('demo_force_offline');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('demo-offline-change'));
  }
}

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [forceOffline, setForceOffline] = useState<boolean>(isForceOfflineActive);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDemoChange = () => setForceOffline(isForceOfflineActive());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('demo-offline-change', handleDemoChange);
    window.addEventListener('storage', handleDemoChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('demo-offline-change', handleDemoChange);
      window.removeEventListener('storage', handleDemoChange);
    };
  }, []);

  const showBanner = !isOnline || forceOffline;

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#231A14] text-cream px-4 py-2 border-b-2 border-terracotta/40 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm transition-all animate-in slide-in-from-top-2"
    >
      <WifiOff size={16} className="text-terracotta shrink-0 animate-pulse" />
      <span>
        {forceOffline ? (
          <>
            <strong className="text-terracotta uppercase tracking-wider">FORCE OFFLINE (demo)</strong> &bull;{' '}
            {t('offline.reassurance', 'Practice and Pause guidance still work.')}
          </>
        ) : (
          t('offline.bannerMessage', 'You are offline: practice and Pause guidance still work.')
        )}
      </span>
    </div>
  );
};
