import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ElderHomeScreen } from './screens/ElderHomeScreen';
import { FamilyHomeScreen } from './screens/FamilyHomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DrillScreen } from './screens/DrillScreen';
import { ParentPairingScreen } from './screens/ParentPairingScreen';
import { FamilyPairingScreen } from './screens/FamilyPairingScreen';
import { SafeWordScreen } from './screens/SafeWordScreen';
import { PactCardScreen } from './screens/PactCardScreen';
import { PrivacyProofScreen } from './screens/PrivacyProofScreen';
import { InstallPromptScreen } from './screens/InstallPromptScreen';
import { DemoScreen } from './screens/DemoScreen';
import { PilotLoggerScreen } from './screens/PilotLoggerScreen';
import { getProfile, getSetting } from './db';
import { ensureAuthUser } from './db/supabase';
import { initOutboxWorker } from './db/outbox';

const RootResolver: React.FC = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    // Check existing profile on root load
    getProfile().then(profile => {
      if (profile) {
        setTarget(profile.role === 'parent' ? '/elder' : '/family');
      } else {
        setTarget('/welcome');
      }
    }).catch(() => {
      setTarget('/welcome');
    });
  }, []);

  if (!target) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-teal-deep border-t-transparent animate-spin" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
};

export const App: React.FC = () => {
  useEffect(() => {
    // Auth: on first launch, sign in anonymously and keep the session
    ensureAuthUser().catch(err => console.warn('App auth init notice:', err));

    // Outbox: retry automatically when connection returns and on app start
    const cleanupOutbox = initOutboxWorker();

    // Apply saved text size setting on app mount
    getSetting<'normal' | 'large'>('textSize', 'normal').then(size => {
      if (size === 'large') {
        document.body.classList.add('text-size-large');
      } else {
        document.body.classList.remove('text-size-large');
      }
    });

    return () => {
      cleanupOutbox();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootResolver />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/elder" element={<ElderHomeScreen />} />
        <Route path="/elder/pair" element={<ParentPairingScreen />} />
        <Route path="/drill" element={<DrillScreen />} />
        <Route path="/pair" element={<FamilyPairingScreen />} />
        <Route path="/family" element={<FamilyHomeScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/safeword" element={<SafeWordScreen />} />
        <Route path="/pact" element={<PactCardScreen />} />
        <Route path="/privacy-proof" element={<PrivacyProofScreen />} />
        <Route path="/install" element={<InstallPromptScreen />} />
        <Route path="/demo" element={<DemoScreen />} />
        <Route path="/pilot-logger" element={<PilotLoggerScreen />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
