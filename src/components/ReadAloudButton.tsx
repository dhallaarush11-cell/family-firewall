import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';

interface ReadAloudButtonProps {
  screenId: string;
  className?: string;
}

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  screenId,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const [available, setAvailable] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const audioPath = `/audio/${lang}/guidance_${screenId}.mp3`;

    // Reset audio instance if lang or screen changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);

    // Check if the pre-recorded audio clip exists
    fetch(audioPath, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const contentType = res.headers.get('content-type') || '';
        // If status is 200 OK and not HTML (SPA rewrite catchall)
        if (res.ok && !contentType.includes('text/html')) {
          setAvailable(true);
        } else {
          setAvailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [lang, screenId]);

  if (!available) {
    return null;
  }

  const handleToggleAudio = () => {
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

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Audio playback notice:', err);
          setIsPlaying(false);
        });
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
