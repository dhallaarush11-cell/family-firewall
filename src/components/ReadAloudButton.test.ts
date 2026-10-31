import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  assertSafeReadAloudText,
  getLocalSpeechVoice,
  speakSafeGuidanceText
} from './ReadAloudButton';
import { db } from '../db';

describe('ReadAloudButton Safety and Local Speech Synthesis Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db.safeWord, 'get').mockResolvedValue(undefined);
    vi.spyOn(db.trustedContacts, 'toArray').mockResolvedValue([]);
  });

  describe('assertSafeReadAloudText - Never read user-entered data', () => {
    it('succeeds for pure static translated UI guidance text from i18n', async () => {
      const staticI18nText =
        'Namaste! You are safe at home. Practice a simulated scam call anytime, or tap the orange Pause button if you ever feel pressured.';
      await expect(assertSafeReadAloudText(staticI18nText)).resolves.toBeUndefined();
    });

    it('fails if text contains the stored safe word from safeWord table', async () => {
      const storedWord = 'Neeli Cycle';
      vi.spyOn(db.safeWord, 'get').mockResolvedValue({
        id: 'current_safeword',
        word: storedWord,
        updatedAt: Date.now()
      });

      const textWithSafeWord = `Welcome to Family Firewall. Our secret word is Neeli Cycle so remember it.`;

      await expect(assertSafeReadAloudText(textWithSafeWord)).rejects.toThrow(
        /SAFETY VIOLATION: Text passed to speechSynthesis contains stored safe word "Neeli Cycle"!/
      );
    });

    it('fails if text contains a trusted contact name from trustedContacts table', async () => {
      vi.spyOn(db.safeWord, 'get').mockResolvedValue(undefined);
      vi.spyOn(db.trustedContacts, 'toArray').mockResolvedValue([
        {
          id: 1,
          name: 'Uncle Ramesh',
          phone: '9876543210',
          relationship: 'Uncle',
          priority: 1,
          createdAt: Date.now()
        }
      ]);

      const textWithContactName = 'Please call Uncle Ramesh immediately if you feel pressured.';

      await expect(assertSafeReadAloudText(textWithContactName)).rejects.toThrow(
        /SAFETY VIOLATION: Text passed to speechSynthesis contains trusted contact name "Uncle Ramesh"!/
      );
    });

    it('fails if text contains a trusted contact phone number from trustedContacts table', async () => {
      vi.spyOn(db.safeWord, 'get').mockResolvedValue(undefined);
      vi.spyOn(db.trustedContacts, 'toArray').mockResolvedValue([
        {
          id: 1,
          name: 'Priya',
          phone: '+91 98765 43210',
          relationship: 'Daughter',
          priority: 1,
          createdAt: Date.now()
        }
      ]);

      const textWithPhoneNumber = 'Call +91 98765 43210 for emergency help.';

      await expect(assertSafeReadAloudText(textWithPhoneNumber)).rejects.toThrow(
        /SAFETY VIOLATION: Text passed to speechSynthesis contains trusted contact phone "\+91 98765 43210"!/
      );
    });

    it('fails if text contains pairing codes (user-entered pairing session tokens)', async () => {
      const textWithPairingCode = 'Your pairing code is FW8291. Connect with your family.';
      await expect(assertSafeReadAloudText(textWithPairingCode)).rejects.toThrow(
        /SAFETY VIOLATION: Text passed to speechSynthesis contains a pairing code "FW8291"!/
      );
    });

    it('rejects empty or invalid text', async () => {
      await expect(assertSafeReadAloudText('')).rejects.toThrow(/SAFETY VIOLATION/);
      // @ts-expect-error testing invalid input
      await expect(assertSafeReadAloudText(null)).rejects.toThrow(/SAFETY VIOLATION/);
    });
  });

  describe('getLocalSpeechVoice - Local voice preference and network voice exclusion', () => {
    it('prefers a voice with localService: true for the requested language', () => {
      const mockVoices = [
        {
          name: 'Google US English (Network)',
          lang: 'en-US',
          localService: false,
          default: false
        },
        {
          name: 'Microsoft David (Desktop Local)',
          lang: 'en-US',
          localService: true,
          default: true
        }
      ] as SpeechSynthesisVoice[];

      const selected = getLocalSpeechVoice('en', mockVoices);
      expect(selected).not.toBeNull();
      expect(selected?.name).toBe('Microsoft David (Desktop Local)');
      expect(selected?.localService).toBe(true);
    });

    it('hides spoken fallback (returns null) rather than using a network voice when no local voice exists', () => {
      // All available voices for Hindi are remote / cloud / network voices (localService: false)
      const mockNetworkOnlyVoices = [
        {
          name: 'Google हिन्दी (Cloud / Network)',
          lang: 'hi-IN',
          localService: false,
          default: true
        },
        {
          name: 'Microsoft Swara Online (Network)',
          lang: 'hi-IN',
          localService: false,
          default: false
        }
      ] as SpeechSynthesisVoice[];

      const selected = getLocalSpeechVoice('hi', mockNetworkOnlyVoices);
      // HARD REQUIREMENT: "if no local voice exists for the selected language, hide the spoken fallback rather than using a network voice."
      expect(selected).toBeNull();
    });

    it('hides spoken fallback when no voices match the requested language', () => {
      const mockVoices = [
        {
          name: 'French Local Voice',
          lang: 'fr-FR',
          localService: true,
          default: true
        }
      ] as SpeechSynthesisVoice[];

      const selected = getLocalSpeechVoice('hi', mockVoices);
      expect(selected).toBeNull();
    });

    it('for Hinglish, prefers local Hindi voice; falls back to local English voice if no local Hindi voice exists', () => {
      const mockVoicesWithLocalEnglishOnly = [
        {
          name: 'Google Hindi (Cloud Network)',
          lang: 'hi-IN',
          localService: false,
          default: false
        },
        {
          name: 'Microsoft Mark (Local English)',
          lang: 'en-US',
          localService: true,
          default: true
        }
      ] as SpeechSynthesisVoice[];

      const selected = getLocalSpeechVoice('hing', mockVoicesWithLocalEnglishOnly);
      expect(selected).not.toBeNull();
      expect(selected?.name).toBe('Microsoft Mark (Local English)');
      expect(selected?.localService).toBe(true);
    });
  });

  describe('speakSafeGuidanceText - speechSynthesis execution safety', () => {
    it('aborts and throws without calling speechSynthesis.speak if text contains safe word', async () => {
      const storedWord = 'Shanti Niwas';
      vi.spyOn(db.safeWord, 'get').mockResolvedValue({
        id: 'current_safeword',
        word: storedWord,
        updatedAt: Date.now()
      });

      const speakSpy = vi.fn();
      const cancelSpy = vi.fn();

      const mockSpeechSynthesis = {
        speak: speakSpy,
        cancel: cancelSpy,
        getVoices: () => []
      } as unknown as SpeechSynthesis;

      (globalThis as unknown as { window: { speechSynthesis: SpeechSynthesis } }).window = {
        speechSynthesis: mockSpeechSynthesis
      };
      (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
        text: string;
        voice: unknown;
        lang: string = '';
        constructor(text: string) {
          this.text = text;
        }
      };

      const mockVoice = {
        name: 'Local Voice',
        lang: 'en-US',
        localService: true,
        default: true
      } as SpeechSynthesisVoice;

      const badText = 'Our secret safe word is Shanti Niwas.';

      await expect(speakSafeGuidanceText(badText, mockVoice)).rejects.toThrow(
        /SAFETY VIOLATION/
      );
      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('aborts and throws without calling speechSynthesis.speak if text contains contact phone', async () => {
      vi.spyOn(db.trustedContacts, 'toArray').mockResolvedValue([
        {
          id: 1,
          name: 'Beta',
          phone: '9876543210',
          relationship: 'Son',
          priority: 1,
          createdAt: Date.now()
        }
      ]);

      const speakSpy = vi.fn();
      const cancelSpy = vi.fn();

      const mockSpeechSynthesis = {
        speak: speakSpy,
        cancel: cancelSpy,
        getVoices: () => []
      } as unknown as SpeechSynthesis;

      (globalThis as unknown as { window: { speechSynthesis: SpeechSynthesis } }).window = {
        speechSynthesis: mockSpeechSynthesis
      };
      (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
        text: string;
        voice: unknown;
        lang: string = '';
        constructor(text: string) {
          this.text = text;
        }
      };

      const mockVoice = {
        name: 'Local Voice',
        lang: 'en-US',
        localService: true,
        default: true
      } as SpeechSynthesisVoice;

      const badText = 'Contact 9876543210 immediately for verification.';

      await expect(speakSafeGuidanceText(badText, mockVoice)).rejects.toThrow(
        /SAFETY VIOLATION/
      );
      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('successfully calls speechSynthesis.speak with local voice for static translated UI guidance', async () => {
      const speakSpy = vi.fn();
      const cancelSpy = vi.fn();

      const mockSpeechSynthesis = {
        speak: speakSpy,
        cancel: cancelSpy,
        getVoices: () => []
      } as unknown as SpeechSynthesis;

      (globalThis as unknown as { window: { speechSynthesis: SpeechSynthesis } }).window = {
        speechSynthesis: mockSpeechSynthesis
      };
      (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
        text: string;
        voice: unknown;
        lang: string = '';
        constructor(text: string) {
          this.text = text;
        }
      };

      const mockVoice = {
        name: 'Local Voice',
        lang: 'en-US',
        localService: true,
        default: true
      } as SpeechSynthesisVoice;

      const staticI18nText = 'Namaste! You are safe at home.';

      await speakSafeGuidanceText(staticI18nText, mockVoice);

      expect(cancelSpy).toHaveBeenCalled();
      expect(speakSpy).toHaveBeenCalledTimes(1);
      const callArg = speakSpy.mock.calls[0][0];
      expect(callArg.text).toBe(staticI18nText);
      expect(callArg.voice).toBe(mockVoice);
    });
  });
});
