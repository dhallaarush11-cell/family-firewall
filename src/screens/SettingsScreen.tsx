import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Plus, 
  Trash2, 
  PhoneCall, 
  Type, 
  Globe, 
  UserCheck, 
  Lock,
  ArrowRight,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  KeyRound,
  FileText,
  Radio
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { 
  getTrustedContacts, 
  addTrustedContact, 
  deleteTrustedContact, 
  getSetting, 
  setSetting, 
  getProfile, 
  saveProfile, 
  db,
  type TrustedContact 
} from '../db';
import { leaveCurrentFamily } from '../db/supabase';

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Settings state
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [userRole, setUserRole] = useState<'parent' | 'family'>('parent');

  // Contact form modal/drawer state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Unlink & data wipe state
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  useEffect(() => {
    // Load initial settings
    getSetting<'normal' | 'large'>('textSize', 'normal').then(size => {
      setTextSize(size);
      if (size === 'large') {
        document.body.classList.add('text-size-large');
      } else {
        document.body.classList.remove('text-size-large');
      }
    });

    getTrustedContacts().then(setContacts);

    getProfile().then(profile => {
      if (profile) {
        setUserRole(profile.role);
      }
    });
  }, []);

  const handleLanguageChange = async (langCode: 'en' | 'hi' | 'hing') => {
    await i18n.changeLanguage(langCode);
    localStorage.setItem('app_language', langCode);
    try {
      await saveProfile(userRole, langCode);
    } catch (e) {
      console.warn('Could not save language in profile:', e);
    }
  };

  const handleTextSizeToggle = async (size: 'normal' | 'large') => {
    setTextSize(size);
    if (size === 'large') {
      document.body.classList.add('text-size-large');
    } else {
      document.body.classList.remove('text-size-large');
    }
    await setSetting('textSize', size);
  };

  const handleRoleToggle = async () => {
    const nextRole = userRole === 'parent' ? 'family' : 'parent';
    const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';
    await saveProfile(nextRole, lang);
    setUserRole(nextRole);
    if (nextRole === 'parent') {
      navigate('/elder');
    } else {
      navigate('/family');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim() || !newPhone.trim()) {
      setFormError('Please enter both name and phone number.');
      return;
    }

    if (contacts.length >= 3) {
      setFormError(t('settings.maxContactsReached'));
      return;
    }

    try {
      await addTrustedContact({
        name: newName.trim(),
        relation: newRelation.trim() || 'Family',
        phone: newPhone.trim(),
        priority: contacts.length + 1
      });

      const updated = await getTrustedContacts();
      setContacts(updated);
      setNewName('');
      setNewRelation('');
      setNewPhone('');
      setIsAddingContact(false);
    } catch (err) {
      console.error('Error adding contact:', err);
      setFormError('Could not save contact.');
    }
  };

  const handleDeleteContact = async (id: number) => {
    await deleteTrustedContact(id);
    const updated = await getTrustedContacts();
    setContacts(updated);
  };

  const handleUnlinkAndDelete = async () => {
    setIsWiping(true);
    try {
      // 1. Call leave_family RPC in Supabase
      await leaveCurrentFamily().catch(e => console.warn('Supabase leave family notice:', e));

      // 2. Clear all Dexie tables
      await Promise.all([
        db.profile.clear(),
        db.trustedContacts.clear(),
        db.safeWord.clear(),
        db.drillHistory.clear(),
        db.outbox.clear(),
        db.settings.clear(),
        db.pilotLog.clear()
      ]);

      // 3. Clear localStorage (language, text size, etc.)
      localStorage.clear();

      // 4. Return to Welcome screen
      setShowUnlinkConfirm(false);
      navigate('/welcome');
    } catch (err) {
      console.error('Failed to wipe data:', err);
    } finally {
      setIsWiping(false);
    }
  };

  const languages = [
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'hing', label: 'Hinglish', sub: 'Roman' }
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      {/* Header with Navigation and Reachable Language Switcher */}
      <HeaderBar
        title={t('settings.title')}
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="settings" />
        </div>

        {/* Section 1: Language Switcher */}
        <section aria-labelledby="lang-section" className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15">
          <div className="flex items-center gap-2 mb-3 text-teal-deep font-extrabold text-lg">
            <Globe size={22} />
            <h2 id="lang-section">{t('settings.languageSection')}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {languages.map(lang => {
              const isActive = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code as 'en' | 'hi' | 'hing')}
                  className={`min-h-[56px] px-3 py-2 rounded-card text-base font-bold border-2 transition-card flex flex-col items-center justify-center ${
                    isActive
                      ? 'bg-teal-deep text-cream border-teal-deep shadow-sm'
                      : 'bg-white text-brown-dark border-teal-deep/20 hover:bg-cream/40'
                  }`}
                >
                  <span className="leading-tight">{lang.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-cream/80' : 'text-brown-dark/60'}`}>
                    {lang.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Text Size Toggle (Normal 18px / Large 22px) */}
        <section aria-labelledby="text-size-section" className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15">
          <div className="flex items-center gap-2 mb-3 text-teal-deep font-extrabold text-lg">
            <Type size={22} />
            <h2 id="text-size-section">{t('settings.textSizeSection')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTextSizeToggle('normal')}
              className={`min-h-[56px] px-4 py-3 rounded-card text-lg font-bold border-2 transition-card ${
                textSize === 'normal'
                  ? 'bg-teal-deep text-cream border-teal-deep shadow-sm'
                  : 'bg-white text-brown-dark border-teal-deep/20 hover:bg-cream/40'
              }`}
            >
              {t('settings.textSizeNormal')}
            </button>
            <button
              type="button"
              onClick={() => handleTextSizeToggle('large')}
              className={`min-h-[56px] px-4 py-3 rounded-card text-xl font-bold border-2 transition-card ${
                textSize === 'large'
                  ? 'bg-teal-deep text-cream border-teal-deep shadow-sm'
                  : 'bg-white text-brown-dark border-teal-deep/20 hover:bg-cream/40'
              }`}
            >
              {t('settings.textSizeLarge')}
            </button>
          </div>
        </section>

        {/* Section 3: Trusted Contacts (Max 3, Stored only in IndexedDB) */}
        <section aria-labelledby="contacts-section" className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-deep font-extrabold text-lg">
              <Users size={22} />
              <h2 id="contacts-section">{t('settings.contactsSection')}</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cream text-teal-deep border border-teal-deep/20">
              {contacts.length} / 3
            </span>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-cream/50 rounded-lg text-xs text-brown-dark/80">
            <Lock size={16} className="text-teal-deep shrink-0" />
            <span>{t('settings.contactsSubtitle')}</span>
          </div>

          {/* List existing contacts */}
          <div className="space-y-3">
            {contacts.map((contact, idx) => (
              <div
                key={contact.id}
                className="p-4 bg-cream/30 rounded-card border border-teal-deep/15 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-deep text-cream font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-brown-dark leading-tight">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-brown-dark/70">
                      {contact.relation} &bull; {contact.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    aria-label={`Call ${contact.name}`}
                    className="w-10 h-10 rounded-full bg-teal-deep text-cream flex items-center justify-center shadow-sm hover:bg-[#073632]"
                  >
                    <PhoneCall size={18} />
                  </a>
                  {contact.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(contact.id!)}
                      aria-label={`Delete ${contact.name}`}
                      className="w-10 h-10 rounded-full bg-white text-terracotta border border-terracotta/30 flex items-center justify-center hover:bg-terracotta hover:text-white"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {contacts.length === 0 && !isAddingContact && (
              <p className="text-base text-center text-brown-dark/70 py-3">
                {t('settings.noContacts')}
              </p>
            )}
          </div>

          {/* Add contact button or form */}
          {!isAddingContact && contacts.length < 3 && (
            <button
              type="button"
              onClick={() => setIsAddingContact(true)}
              className="w-full min-h-[56px] py-3.5 px-4 rounded-card border-2 border-dashed border-teal-deep/40 hover:border-teal-deep text-teal-deep font-bold text-lg flex items-center justify-center gap-2 hover:bg-cream/40 transition-card"
            >
              <Plus size={22} />
              <span>{t('settings.addContact')}</span>
            </button>
          )}

          {isAddingContact && (
            <form onSubmit={handleSaveContact} className="p-4 bg-cream/40 rounded-card border-2 border-teal-deep/20 space-y-3.5">
              <h3 className="font-bold text-lg text-brown-dark">
                {t('settings.addContact')}
              </h3>

              {formError && (
                <div className="p-2.5 bg-terracotta/15 border border-terracotta rounded-lg text-sm font-semibold text-terracotta">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-brown-dark mb-1">
                  {t('settings.contactName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 bg-white text-brown-dark text-base focus:outline-teal-deep"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brown-dark mb-1">
                  {t('settings.contactRelation')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Son / Daughter"
                  value={newRelation}
                  onChange={e => setNewRelation(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 bg-white text-brown-dark text-base focus:outline-teal-deep"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brown-dark mb-1">
                  {t('settings.contactPhone')} *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 bg-white text-brown-dark text-base focus:outline-teal-deep"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[56px] py-3 rounded-card bg-teal-deep text-white font-bold text-lg shadow-elevated"
                >
                  {t('settings.saveContact')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  className="px-5 min-h-[56px] rounded-card bg-white border border-teal-deep/30 text-brown-dark font-semibold text-base"
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Section 4: Current Mode & Role Switcher */}
        <section aria-labelledby="role-section" className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15">
          <div className="flex items-center gap-2 mb-2 text-teal-deep font-extrabold text-lg">
            <UserCheck size={22} />
            <h2 id="role-section">{t('settings.roleSection')}</h2>
          </div>
          <p className="text-base text-brown-dark/80 mb-3">
            Currently in: <strong>{userRole === 'parent' ? t('settings.roleParent') : t('settings.roleFamily')}</strong>
          </p>
          <button
            type="button"
            onClick={handleRoleToggle}
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-cream hover:bg-[#FFE8A8] border-2 border-teal-deep/30 text-teal-deep font-bold text-lg flex items-center justify-center gap-2 transition-card"
          >
            <span>{t('settings.changeRole')}</span>
            <ArrowRight size={20} />
          </button>
        </section>

        {/* Section 5: Family Tools & Privacy Proof */}
        <section aria-labelledby="tools-section" className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-3">
          <div className="flex items-center gap-2 text-teal-deep font-extrabold text-lg">
            <ShieldCheck size={22} />
            <h2 id="tools-section">{t('settings.toolsSection', 'Family Tools & Privacy Proof')}</h2>
          </div>

          <div className="space-y-2.5">
            {/* Privacy Proof Screen Link */}
            <button
              type="button"
              onClick={() => navigate('/privacy-proof')}
              className="w-full min-h-[56px] p-3.5 rounded-xl bg-cream/40 hover:bg-cream border border-teal-deep/20 flex items-center justify-between text-left transition-card"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-deep text-cream flex items-center justify-center shrink-0">
                  <Radio size={20} />
                </div>
                <div>
                  <span className="block font-bold text-base text-teal-deep leading-tight">
                    {t('privacyProof.title', 'Privacy Proof')}
                  </span>
                  <span className="text-xs text-brown-dark/70 font-medium">
                    Live audit of network requests & zero cloud leak
                  </span>
                </div>
              </div>
              <ArrowRight size={18} className="text-teal-deep shrink-0" />
            </button>

            {/* Safe Word Setup Link */}
            <button
              type="button"
              onClick={() => navigate('/safeword')}
              className="w-full min-h-[56px] p-3.5 rounded-xl bg-cream/40 hover:bg-cream border border-teal-deep/20 flex items-center justify-between text-left transition-card"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cream text-teal-deep border border-teal-deep/30 flex items-center justify-center shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <span className="block font-bold text-base text-teal-deep leading-tight">
                    {t('safeword.screenTitle', 'Family Safe Word')}
                  </span>
                  <span className="text-xs text-brown-dark/70 font-medium">
                    Set secret phrase stored only on device
                  </span>
                </div>
              </div>
              <ArrowRight size={18} className="text-teal-deep shrink-0" />
            </button>

            {/* Pact Card Link */}
            <button
              type="button"
              onClick={() => navigate('/pact')}
              className="w-full min-h-[56px] p-3.5 rounded-xl bg-cream/40 hover:bg-cream border border-teal-deep/20 flex items-center justify-between text-left transition-card"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cream text-teal-deep border border-teal-deep/30 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="block font-bold text-base text-teal-deep leading-tight">
                    {t('pact.screenTitle', 'Family Firewall Pact')}
                  </span>
                  <span className="text-xs text-brown-dark/70 font-medium">
                    Printable PDF with golden rules & contacts
                  </span>
                </div>
              </div>
              <ArrowRight size={18} className="text-teal-deep shrink-0" />
            </button>
          </div>
        </section>

        {/* Section 6: Unlink Family and Wipe Data */}
        <section aria-labelledby="unlink-section" className="bg-white p-5 rounded-card shadow-soft border-2 border-terracotta/30 space-y-3">
          <div className="flex items-center gap-2 text-terracotta font-extrabold text-lg">
            <AlertTriangle size={22} />
            <h2 id="unlink-section">{t('settings.unlinkTitle', 'Privacy & Family Unlink')}</h2>
          </div>
          <p className="text-base text-brown-dark/80 leading-relaxed font-medium">
            {t('settings.unlinkDesc', 'Disconnect from your family and permanently remove all local contacts, drill records, and settings from this phone.')}
          </p>
          <button
            type="button"
            onClick={() => setShowUnlinkConfirm(true)}
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-[#FFF5F2] hover:bg-terracotta hover:text-white border-2 border-terracotta text-terracotta font-bold text-lg flex items-center justify-center gap-2 transition-card shadow-sm"
          >
            <LogOut size={20} />
            <span>{t('settings.unlinkButton', 'Unlink family and delete my data')}</span>
          </button>
        </section>

        {/* About App / Hard Rules Notice */}
        <div className="p-4 bg-white/70 rounded-card border border-teal-deep/10 text-xs text-brown-dark/70 space-y-1.5 text-center">
          <p className="font-bold text-teal-deep">Family Firewall by team Aurex</p>
          <p>"Rehearse together. Pause together."</p>
          <p>Deterministic Engine &bull; Zero Cloud Leak &bull; Accessible Design</p>
        </div>
      </main>

      {/* Confirmation Step Dialog for Unlinking */}
      {showUnlinkConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-brown-dark/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-card p-6 max-w-sm w-full text-center shadow-elevated border-2 border-terracotta space-y-4">
            <div className="w-16 h-16 rounded-full bg-terracotta/15 text-terracotta flex items-center justify-center mx-auto">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-brown-dark">
                {t('settings.unlinkConfirmTitle', 'Unlink & Delete All Data?')}
              </h3>
              <p className="text-base text-brown-dark/85 font-medium leading-relaxed">
                {t('settings.unlinkConfirmMessage', 'This will remove your family link on the server and completely erase all contacts and drill history from this phone. You will return to the Welcome screen.')}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isWiping}
                onClick={handleUnlinkAndDelete}
                className="w-full min-h-[56px] py-3.5 px-6 rounded-card bg-terracotta hover:bg-[#B83E20] text-white font-black text-lg shadow-elevated transition-card flex items-center justify-center gap-2"
              >
                {isWiping ? (
                  <span>{t('settings.wiping', 'Erasing data...')}</span>
                ) : (
                  <span>{t('settings.confirmUnlink', 'Yes, Unlink & Delete Everything')}</span>
                )}
              </button>

              <button
                type="button"
                disabled={isWiping}
                onClick={() => setShowUnlinkConfirm(false)}
                className="w-full min-h-[56px] py-3 px-4 rounded-card bg-cream hover:bg-[#FFE8B2] text-brown-dark font-bold text-base border border-teal-deep/20 transition-card"
              >
                {t('settings.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
