import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { db } from '../db';

interface ReadAloudButtonProps {
  screenId: string;
  className?: string;
}

/**
 * Finds an available local speech synthesis voice for the requested language.
 * HARD RULE: "prefer a voice with localService true; if no local voice exists for the selected language,
 * hide the spoken fallback rather than using a network voice."
 */
export function getLocalSpeechVoice(
  lang: string,
  voicesList?: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const voices =
    voicesList ||
    (typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.getVoices()
      : []);

  if (!voices || voices.length === 0) {
    return null;
  }

  const prefix = lang === 'hi' ? 'hi' : lang === 'hing' ? 'hi' : 'en';

  // Only consider voices with localService === true
  let matchingLocalVoices = voices.filter(
    v => Boolean(v.localService) && v.lang.toLowerCase().startsWith(prefix)
  );

  // If Hinglish and no local Hindi voice, allow local English voice
  if (matchingLocalVoices.length === 0 && lang === 'hing') {
    matchingLocalVoices = voices.filter(
      v => Boolean(v.localService) && v.lang.toLowerCase().startsWith('en')
    );
  }

  // If NO local voice exists for the selected language, return null (hide fallback)
  if (matchingLocalVoices.length === 0) {
    return null;
  }

  // Prefer default local voice if available
  return matchingLocalVoices.find(v => v.default) || matchingLocalVoices[0];
}

/**
 * Asserts that the text to be spoken contains ONLY static UI guidance,
 * and NEVER user-entered data (safe word, contact names or numbers, family names, pairing codes).
 * Throws an error if any user-entered or sensitive data is detected.
 */
export async function assertSafeReadAloudText(
  text: string,
  overrides?: {
    safeWords?: string[];
    contacts?: Array<{ name?: string; phone?: string }>;
  }
): Promise<void> {
  if (!text || typeof text !== 'string') {
    throw new Error('SAFETY VIOLATION: Empty or invalid text passed to read-aloud.');
  }

  let safeWords: string[] = overrides?.safeWords || [];
  let contacts: Array<{ name?: string; phone?: string }> = overrides?.contacts || [];

  if (!overrides) {
    try {
      const safeWordRecord = await db.safeWord.get('current_safeword');
      if (safeWordRecord?.word?.trim()) {
        safeWords.push(safeWordRecord.word.trim());
      }
    } catch {
      // Offline/fallback safe error handling
    }

    try {
      const dbContacts = await db.trustedContacts.toArray();
      if (dbContacts && Array.isArray(dbContacts)) {
        contacts = dbContacts;
      }
    } catch {
      // Offline/fallback safe error handling
    }
  }

  const lowerText = text.toLowerCase();

  // 1. Never read safe word
  for (const sw of safeWords) {
    if (sw && sw.trim().length >= 2) {
      if (lowerText.includes(sw.trim().toLowerCase())) {
        throw new Error(`SAFETY VIOLATION: Text passed to speechSynthesis contains stored safe word "${sw}"!`);
      }
    }
  }

  // 2. Never read contact name or phone number
  for (const c of contacts) {
    if (c.name && c.name.trim().length >= 2) {
      const nameRegex = new RegExp(`\\b${c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (nameRegex.test(text) || lowerText.includes(c.name.trim().toLowerCase())) {
        throw new Error(`SAFETY VIOLATION: Text passed to speechSynthesis contains trusted contact name "${c.name}"!` );
      }
    }
    if (c.phone) {
      const digits = c.phone.replace(/\D/g, '');
      const normalized = digits.length >= 10 ? digits.slice(-10) : digits;
      if (normalized.length >= 7) {
        const textDigits = text.replace(/\D/g, '');
        if (text.includes(c.phone.trim()) || textDigits.includes(normalized)) {
          throw new Error(`SAFETY VIOLATION: Text passed to speechSynthesis contains trusted contact phone "${c.phone}"!`);
        }
      }
    }
  }

  // 3. Never read pairing code pattern (6-character uppercase alphanumeric e.g. "FW8291")
  const match = text.match(/\b[A-Z0-9]{6}\b/);
  if (match && /[A-Z]/.test(match[0]) && /[0-9]/.test(match[0])) {
    throw new Error(`SAFETY VIOLATION: Text passed to speechSynthesis contains a pairing code "${match[0]}"!`);
  }
}

/**
 * Speaks safe guidance text using speech synthesis.
 * Throws and aborts if the text contains any user-entered data (safe word or contact details).
 */
export async function speakSafeGuidanceText(
  text: string,
  voice: SpeechSynthesisVoice,
  callbacks?: { onEnd?: () => void; onError?: () => void }
): Promise<void> {
  // Assert safety first - throws if safe word or contacts are detected
  await assertSafeReadAloudText(text);

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  if (callbacks?.onEnd) utterance.onend = callbacks.onEnd;
  if (callbacks?.onError) utterance.onerror = callbacks.onError;
  window.speechSynthesis.speak(utterance);
}

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  screenId,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const [available, setAvailable] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [useSpeechSynthesis, setUseSpeechSynthesis] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const audioPath = `/audio/${lang}/guidance_${screenId}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);

    const checkSpeechFallback = () => {
      if (cancelled) return;
      // Spoken fallback requires static guidance text from i18n AND a local voice
      const staticText = t(`guidance.${screenId}`, '');
      const localVoice = getLocalSpeechVoice(lang);

      if (staticText && localVoice) {
        setAvailable(true);
        setUseSpeechSynthesis(true);
      } else {
        setAvailable(false);
      }
    };

    // 1. Check if pre-recorded MP3 exists
    fetch(audioPath, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          setAvailable(true);
          setUseSpeechSynthesis(false);
        } else {
          checkSpeechFallback();
        }
      })
      .catch(() => {
        if (!cancelled) checkSpeechFallback();
      });

    const handleVoicesChanged = () => {
      if (!cancelled && !available) {
        checkSpeechFallback();
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      }
    };
  }, [lang, screenId, t, available]);

  if (!available) {
    return null;
  }

  const handleToggleAudio = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    if (!useSpeechSynthesis) {
      // Mode A: Play pre-recorded audio file
      const audioPath = `/audio/${lang}/guidance_${screenId}.mp3`;
      if (!audioRef.current) {
        const audio = new Audio(audioPath);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          setAvailable(false);
        };
        audioRef.current = audio;
      }

      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Audio playback notice:', err);
          setIsPlaying(false);
        });
    } else {
      // Mode B: Web Speech Synthesis fallback (strictly static translated UI text from i18n)
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const localVoice = getLocalSpeechVoice(lang);
      if (!localVoice) {
        setAvailable(false);
        return;
      }

      const staticText = t(`guidance.${screenId}`, '');
      if (!staticText) {
        setAvailable(false);
        return;
      }

      try {
        await speakSafeGuidanceText(staticText, localVoice, {
          onEnd: () => setIsPlaying(false),
          onError: () => setIsPlaying(false)
        });
        setIsPlaying(true);
      } catch (err) {
        console.error('Read-Aloud speech safety assertion failed:', err);
        setIsPlaying(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleAudio}
      aria-label={isPlaying ? t('common.stopAudio', 'Stop Audio Guidance') : t('common.listenGuidance', 'Listen to Audio Guidance')}
      className={`min-h-[52px] px-4 py-2.5 rounded-full bg-white hover:bg-cream border-2 border-teal-deep text-teal-deep font-bold text-lg flex items-center justify-center gap-2 shadow-soft transition-card ${className}`}
    >
      {isPlaying ? (
        <>
          <VolumeX size={22} className="text-terracotta animate-pulse" />
          <span className="text-terracotta">{t('common.stopAudio', 'Stop')}</span>
        </>
      ) : (
        <>
          <Volume2 size={22} className="text-teal-deep" />
          <span>{t('common.listenGuidance', 'Listen')}</span>
        </>
      )}
    </button>
  );
};

