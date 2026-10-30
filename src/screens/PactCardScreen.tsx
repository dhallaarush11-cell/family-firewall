import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import {
  getTrustedContacts,
  getSafeWord,
  type TrustedContact,
  type SafeWordRecord
} from '../db';

export const PactCardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [safeWord, setSafeWord] = useState<SafeWordRecord | undefined>(undefined);
  const [printSafeWord, setPrintSafeWord] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    getTrustedContacts().then(setContacts);
    getSafeWord().then(setSafeWord);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper to render a pact card page
      const renderPactPage = (languageMode: 'en' | 'hi' | 'hing') => {
        // Page border & background
        doc.setDrawColor(10, 77, 72); // Teal-deep
        doc.setLineWidth(1.5);
        doc.roundedRect(15, 15, 180, 267, 4, 4);

        // Inner header border
        doc.setFillColor(242, 248, 246);
        doc.roundedRect(18, 18, 174, 38, 3, 3, 'F');

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(10, 77, 72);
        const titleText = languageMode === 'en' ? 'Family Firewall Pact' : 'Family Firewall Pact';
        doc.text(titleText, 105, 32, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 70, 50);
        doc.text('Keep this card near your phone. Read it before taking any action on a call.', 105, 42, { align: 'center' });

        // SECTION 1: THE THREE RULES
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(10, 77, 72);
        doc.text('THE THREE GOLDEN RULES', 25, 68);

        doc.setDrawColor(217, 107, 74); // Terracotta
        doc.setLineWidth(0.8);
        doc.line(25, 71, 105, 71);

        const rules = [
          { num: '1.', title: "Don't pay.", sub: 'Never transfer money to a caller claiming to be police, court, or customs.' },
          { num: '2.', title: "Don't share OTP.", sub: 'Real officials and banks will NEVER ask for your SMS OTP or PIN numbers.' },
          { num: '3.', title: 'Hang up and call a family member.', sub: 'Disconnect suspicious calls immediately and reach your trusted contact.' }
        ];

        let ruleY = 82;
        rules.forEach(rule => {
          doc.setFillColor(254, 246, 242);
          doc.roundedRect(25, ruleY - 6, 160, 18, 2, 2, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(184, 62, 32);
          doc.text(rule.num, 29, ruleY + 5);
          doc.text(rule.title, 37, ruleY + 5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(50, 40, 30);
          doc.text(rule.sub, 37, ruleY + 10);

          ruleY += 22;
        });

        // MANDATORY QUOTE: "Real officials never ask for money on a video call"
        doc.setFillColor(235, 247, 242);
        doc.roundedRect(25, 148, 160, 18, 2, 2, 'F');
        doc.setDrawColor(10, 77, 72);
        doc.setLineWidth(0.5);
        doc.roundedRect(25, 148, 160, 18, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(10, 77, 72);
        doc.text('"Real officials never ask for money on a video call."', 105, 159, { align: 'center' });

        // SECTION 2: TRUSTED CONTACTS
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(10, 77, 72);
        doc.text('MY TRUSTED CONTACTS (CALL IMMEDIATELY)', 25, 178);

        let contactY = 188;
        if (contacts.length > 0) {
          contacts.forEach((c, idx) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(40, 30, 20);
            doc.text(`${idx + 1}. ${c.name} (${c.relation}):`, 28, contactY);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(10, 77, 72);
            doc.text(c.phone, 95, contactY);
            contactY += 9;
          });
        } else {
          for (let i = 1; i <= 2; i++) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(120, 110, 100);
            doc.text(`${i}. Name: _______________________  Phone: _______________________`, 28, contactY);
            contactY += 10;
          }
        }

        // SECTION 3: HELPLINE 1930
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(184, 62, 32);
        doc.text('National Cybercrime Helpline: 1930 (Toll-Free, 24x7)', 28, 222);

        // SECTION 4: SAFE WORD
        doc.setFillColor(255, 252, 240);
        doc.roundedRect(25, 230, 160, 26, 2, 2, 'F');
        doc.setDrawColor(217, 107, 74);
        doc.setLineWidth(0.6);
        doc.roundedRect(25, 230, 160, 26, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(40, 30, 20);

        if (printSafeWord && safeWord?.word) {
          doc.text(`Our safe word:  "${safeWord.word}"`, 32, 245);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 50, 30);
          doc.text('(Keep this card private — reveals family verification word)', 32, 251);
        } else {
          doc.text('Our safe word: _________________________________', 32, 245);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 90, 80);
          doc.text('(Write by hand with family agreement, or leave blank)', 32, 251);
        }

        // Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(140, 130, 120);
        doc.text('Family Firewall • Rehearse together. Pause together. • Fictional practice drills only', 105, 274, { align: 'center' });
      };

      // Page 1: User's selected language
      renderPactPage(lang);

      // Page 2: English version if user's selected language is not English
      if (lang !== 'en') {
        doc.addPage();
        renderPactPage('en');
      }

      doc.save('family-firewall-pact.pdf');
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('pact.screenTitle', 'Family Firewall Pact')}
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="pact_card" />
        </div>

        {/* Action Controls */}
        <div className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cream text-teal-deep flex items-center justify-center shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-teal-deep">
                {t('pact.title', 'Printable Pact Card')}
              </h2>
              <p className="text-sm text-brown-dark/75 font-semibold">
                {t('pact.subtitle', 'Place this card beside your landline or mobile for immediate family protection.')}
              </p>
            </div>
          </div>

          {/* Safe word option toggle */}
          <div className="p-3.5 bg-cream/40 rounded-xl border border-teal-deep/20 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printSafeWord}
                onChange={e => setPrintSafeWord(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-teal-deep text-teal-deep focus:ring-teal-deep"
              />
              <div className="space-y-1">
                <span className="block text-base font-bold text-brown-dark">
                  {t('pact.printSafeWordOption', 'Print the safe word on the card')}
                </span>
                {printSafeWord && (
                  <p className="text-xs font-bold text-terracotta flex items-center gap-1.5 animate-in fade-in">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>
                      {t('pact.lostCardWarning', 'Warning: A lost or misplaced card reveals your safe word to anyone.')}
                    </span>
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Download & Print Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPdf}
              className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-lg shadow-elevated transition-card flex items-center justify-center gap-2"
            >
              <Download size={22} />
              <span>{isGenerating ? t('pact.generating', 'Generating...') : t('pact.downloadPdf', 'Download PDF')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-white hover:bg-cream border-2 border-teal-deep/30 text-teal-deep font-bold text-lg shadow-soft transition-card flex items-center justify-center gap-2"
            >
              <Printer size={22} />
              <span>{t('pact.printDirect', 'Print Card')}</span>
            </button>
          </div>
        </div>

        {/* Visual Printable Card Preview */}
        <article
          id="printable-pact-card"
          className="bg-white p-6 sm:p-8 rounded-card shadow-elevated border-4 border-teal-deep/30 space-y-6"
        >
          {/* Card Header */}
          <div className="text-center pb-4 border-b-2 border-teal-deep/20 space-y-2">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-cream text-teal-deep font-black text-xs uppercase tracking-widest">
              <ShieldCheck size={18} />
              <span>{t('pact.badge', 'Family Defense Commitment')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-teal-deep">
              {t('pact.cardTitle', 'Family Firewall Pact')}
            </h1>
            <p className="text-sm font-semibold text-brown-dark/75">
              {t('pact.cardSub', 'Keep near your phone. Pause and read before sending any money.')}
            </p>
          </div>

          {/* THE THREE RULES */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-teal-deep">
              {t('pact.rulesHeading', 'The Three Golden Rules')}
            </h3>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-[#FFF8F5] border border-terracotta/30 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-terracotta text-white font-black text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-lg font-black text-terracotta leading-tight">
                    {t('pact.rule1Title', "Don't pay.")}
                  </h4>
                  <p className="text-sm font-medium text-brown-dark/80 mt-0.5">
                    {t('pact.rule1Desc', 'Never transfer money to a caller claiming to be police, court, or customs.')}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFF8F5] border border-terracotta/30 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-terracotta text-white font-black text-sm flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-lg font-black text-terracotta leading-tight">
                    {t('pact.rule2Title', "Don't share OTP.")}
                  </h4>
                  <p className="text-sm font-medium text-brown-dark/80 mt-0.5">
                    {t('pact.rule2Desc', 'Real officials and banks will NEVER ask for your SMS OTP or PIN.')}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFF8F5] border border-terracotta/30 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-terracotta text-white font-black text-sm flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-lg font-black text-terracotta leading-tight">
                    {t('pact.rule3Title', 'Hang up and call a family member.')}
                  </h4>
                  <p className="text-sm font-medium text-brown-dark/80 mt-0.5">
                    {t('pact.rule3Desc', 'Disconnect suspicious calls immediately and reach your trusted contact.')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* MANDATORY STATEMENT */}
          <div className="p-4 bg-[#E8F8F5] rounded-xl border-2 border-teal-deep text-center">
            <p className="text-base sm:text-lg font-extrabold text-teal-deep leading-snug">
              "{t('pact.realOfficialsQuote', 'Real officials never ask for money on a video call')}"
            </p>
          </div>

          {/* TRUSTED CONTACTS LIST */}
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-teal-deep">
              {t('pact.contactsHeading', 'Trusted Family Contacts')}
            </h3>

            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="p-3 bg-cream/40 rounded-xl border border-teal-deep/20 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-base text-brown-dark block">
                        {c.name} ({c.relation})
                      </span>
                      <span className="text-sm font-bold text-teal-deep">{c.phone}</span>
                    </div>
                    <CheckCircle2 size={18} className="text-teal-deep" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-sm text-brown-dark/70 font-mono">
                <div className="p-2.5 border-b border-dashed border-teal-deep/40">
                  1. Name: _____________________ Phone: _____________________
                </div>
                <div className="p-2.5 border-b border-dashed border-teal-deep/40">
                  2. Name: _____________________ Phone: _____________________
                </div>
              </div>
            )}
          </section>

          {/* HELPLINE 1930 */}
          <div className="p-3.5 bg-cream/60 rounded-xl border border-terracotta/30 flex items-center gap-3">
            <PhoneCall size={22} className="text-terracotta shrink-0" />
            <div className="text-sm font-bold text-brown-dark">
              <span>{t('pact.helplineLabel', 'National Cybercrime Helpline')}: </span>
              <strong className="text-terracotta text-lg font-black">1930</strong>
              <span className="text-xs text-brown-dark/70 block">{t('pact.helplineSub', 'Toll-Free 24x7 Government Helpline')}</span>
            </div>
          </div>

          {/* SAFE WORD SECTION */}
          <div className="p-4 bg-cream/30 rounded-xl border-2 border-dashed border-teal-deep/40 text-center space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-brown-dark/70 block">
              {t('pact.safeWordLabel', 'Secret Family Verification Word')}
            </span>
            {printSafeWord && safeWord?.word ? (
              <div className="text-xl font-black text-teal-deep py-1 select-all">
                "{safeWord.word}"
              </div>
            ) : (
              <div className="text-lg font-mono font-bold text-brown-dark/60 py-1">
                Our safe word: ________________________
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  );
};
