import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, KeyRound, CheckCircle, Trash2 } from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { getSafeWord, saveSafeWord, deleteSafeWord, type SafeWordRecord } from '../db';

export const SafeWordScreen: React.FC = () => {
  const { t } = useTranslation();
  const [safeWordRecord, setSafeWordRecord] = useState<SafeWordRecord | undefined>(undefined);
  const [inputWord, setInputWord] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getSafeWord().then(record => {
      setSafeWordRecord(record);
      if (record) {
        setInputWord(record.word);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    const record = await saveSafeWord(inputWord.trim());
    setSafeWordRecord(record);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDelete = async () => {
    await deleteSafeWord();
    setSafeWordRecord(undefined);
    setInputWord('');
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('safeword.screenTitle', 'Family Safe Word')}
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="safeword" />
        </div>

        {/* Informational Banner */}
        <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
            <KeyRound size={36} className="text-teal-deep" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-teal-deep">
            {t('safeword.title', 'Family Secret Safe Word')}
          </h2>

          {/* EXACT ONE-LINE EXPLANATION REQUIRED BY RULE */}
          <p className="text-lg font-bold text-brown-dark/90 leading-relaxed bg-cream/50 p-4 rounded-xl border border-teal-deep/20">
            {t(
              'safeword.explanation',
              'The safe word is used to verify a caller who claims to be a relative, and should never be typed into the Pause screen.'
            )}
          </p>

          <p className="text-sm font-semibold text-teal-deep flex items-center justify-center gap-1.5">
            <ShieldCheck size={18} />
            <span>{t('safeword.deviceOnlyNotice', 'Stored only on this device — never sent to any server.')}</span>
          </p>
        </section>

        {/* Existing Safe Word View or Edit Form */}
        <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/15 space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-[#E8F8F5] border border-teal-deep rounded-xl text-teal-deep font-bold text-base flex items-center justify-center gap-2">
              <CheckCircle size={20} />
              <span>{t('safeword.savedSuccess', 'Safe word saved securely on device!')}</span>
            </div>
          )}

          {safeWordRecord && !isEditing ? (
            <div className="space-y-5 text-center">
              <div className="space-y-1">
                <span className="text-sm font-bold uppercase tracking-wider text-brown-dark/70">
                  {t('safeword.currentLabel', 'Agreed Family Safe Word')}
                </span>
                <div className="p-4 bg-cream/40 rounded-xl border-2 border-teal-deep/30 text-2xl sm:text-3xl font-black text-teal-deep tracking-wide select-all">
                  "{safeWordRecord.word}"
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 min-h-[56px] py-3.5 px-4 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-bold text-lg shadow-elevated transition-card"
                >
                  {t('safeword.editButton', 'Change Safe Word')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete safe word"
                  className="min-h-[56px] px-4 rounded-card bg-cream hover:bg-[#FFE8B2] text-terracotta border border-terracotta/40 font-bold transition-card flex items-center justify-center"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="safe-word-input" className="block text-lg font-extrabold text-brown-dark">
                  {t('safeword.inputLabel', 'Choose a memorable family phrase')}
                </label>
                <input
                  id="safe-word-input"
                  type="text"
                  required
                  placeholder={t('safeword.placeholder', 'e.g., Mango Tree, Blue Bicycle')}
                  value={inputWord}
                  onChange={e => setInputWord(e.target.value)}
                  className="w-full min-h-[56px] px-4 rounded-xl border-2 border-teal-deep/30 text-xl font-bold text-center text-teal-deep focus:outline-none focus:border-teal-deep"
                />
                <span className="block text-xs font-semibold text-brown-dark/70 text-center">
                  {t('safeword.inputTip', 'Agree together on a word or short phrase that only close family knows.')}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated transition-card"
                >
                  {t('safeword.saveButton', 'Save Safe Word on Device')}
                </button>
                {safeWordRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputWord(safeWordRecord.word);
                      setIsEditing(false);
                    }}
                    className="w-full min-h-[48px] py-2 rounded-card bg-cream text-brown-dark font-bold text-base transition-card"
                  >
                    {t('nav.close', 'Cancel')}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};
