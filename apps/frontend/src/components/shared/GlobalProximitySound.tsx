'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useSoundStore } from '@/store/useSoundStore';
import { Volume2, X } from 'lucide-react';

const PROXIMITY_SOUNDS = [
  '/sounds/7-eleven.mp3',
  '/sounds/doorbell.mp3',
  '/sounds/walls-icecream.mp3',
];

// Silent data URI for unlocking Web Audio & HTML5 Audio
const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export function GlobalProximitySound() {
  const { presence, latestPresenceAlert } = useWebSocket();
  const { soundEnabled, testSoundTrigger } = useSoundStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerKeyRef = useRef<string | null>(null);
  const prevPresentRef = useRef<boolean | null>(null);
  const prevTestTriggerRef = useRef<number>(testSoundTrigger);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Helper: Unlock audio engine on browser
  const unlockAudio = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
      }
      if (audioRef.current) {
        const prevSrc = audioRef.current.src;
        if (!prevSrc) {
          audioRef.current.src = SILENT_AUDIO_URI;
        }
        audioRef.current.volume = 0.01;
        const p = audioRef.current.play();
        if (p) {
          p.then(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            setAutoplayBlocked(false);
            console.log('[PROXIMITY SOUND] Audio engine unlocked via user interaction');
          }).catch(() => {
            // Still waiting for eligible user gesture
          });
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Set up one-time interaction listeners on window to automatically unlock audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('click', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [unlockAudio]);

  // Preload sound files in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    PROXIMITY_SOUNDS.forEach((src) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
    });

    const el = audioRef.current;
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      if (el) {
        el.pause();
      }
    };
  }, []);

  // Play audio for a given duration (default 5000ms = 5 seconds)
  const playSound = useCallback(
    (src: string, durationMs = 5000, volume = 0.8) => {
      if (!audioRef.current) return;

      // Clear any pending stop timer
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.volume = volume;

      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            setAutoplayBlocked(false);
            console.log(`[PROXIMITY SOUND] 🔊 Playing "${src}" for ${durationMs / 1000}s`);

            // Stop playback after exact duration
            stopTimeoutRef.current = setTimeout(() => {
              if (audioRef.current === audio) {
                audio.pause();
                audio.currentTime = 0;
                console.log('[PROXIMITY SOUND] Playback completed (5s timeout)');
              }
            }, durationMs);
          })
          .catch((err: unknown) => {
            console.warn(
              '[PROXIMITY SOUND] ⚠️ Autoplay blocked by browser. User interaction needed:',
              err,
            );
            setAutoplayBlocked(true);
          });
      }
    },
    [],
  );

  // Stop immediately if sound is toggled off
  useEffect(() => {
    if (!soundEnabled) {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    }
  }, [soundEnabled]);

  // Play test sound when user enables sound or triggers test
  useEffect(() => {
    if (testSoundTrigger > prevTestTriggerRef.current) {
      prevTestTriggerRef.current = testSoundTrigger;
      if (soundEnabled) {
        // Play brief 0.6s preview chime so user knows sound works
        playSound('/sounds/doorbell.mp3', 600, 0.7);
      }
    }
  }, [testSoundTrigger, soundEnabled, playSound]);

  // Main listener: Trigger proximity sound when person approaches
  useEffect(() => {
    // Unique key to identify new presence event: timestamp or transition
    const reportedAt = latestPresenceAlert?.reportedAt || presence?.reportedAt || null;
    const isPresent = Boolean(latestPresenceAlert || presence?.present === true);
    const wasPresent = prevPresentRef.current;

    // Trigger condition:
    // 1. Is currently present
    // 2. AND either:
    //    a) Timestamp is new and non-null
    //    b) Transitioned from not present (false/null) to present
    const isNewTimestamp = reportedAt && reportedAt !== lastTriggerKeyRef.current;
    const isNewTransition = isPresent && !wasPresent;

    if (isPresent && (isNewTimestamp || isNewTransition)) {
      if (reportedAt) {
        lastTriggerKeyRef.current = reportedAt;
      } else {
        lastTriggerKeyRef.current = `trans-${Date.now()}`;
      }

      console.log(
        `[PROXIMITY SOUND] Presence detected (timestamp: ${reportedAt}, transition: ${isNewTransition}, soundEnabled: ${soundEnabled})`,
      );

      if (soundEnabled) {
        // Randomly pick 1 of 3 sounds
        const randomIndex = Math.floor(Math.random() * PROXIMITY_SOUNDS.length);
        const selectedSound = PROXIMITY_SOUNDS[randomIndex];
        playSound(selectedSound, 5000, 0.85);
      }
    }

    prevPresentRef.current = presence?.present ?? null;
  }, [latestPresenceAlert, presence, soundEnabled, playSound]);

  return (
    <>
      {/* Hidden persistent audio element in DOM */}
      <audio ref={audioRef} preload="auto" aria-hidden="true" className="hidden" />

      {/* Floating notice if browser blocked autoplay before user click */}
      {autoplayBlocked && soundEnabled && (
        <div
          role="alert"
          onClick={() => {
            unlockAudio();
            // Try playing a quick chime
            playSound('/sounds/doorbell.mp3', 600, 0.7);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-500/95 px-4 py-3 text-white shadow-xl backdrop-blur-md cursor-pointer hover:bg-amber-600 transition-all animate-bounce"
        >
          <Volume2 className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">คลิกที่นี่เพื่อเปิดเสียงแจ้งเตือน</p>
            <p className="text-xs text-amber-100">
              เบราว์เซอร์ต้องการให้คลิกหน้าจอ 1 ครั้งก่อนเล่นเสียงอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAutoplayBlocked(false);
            }}
            className="ml-2 rounded-lg p-1 hover:bg-black/10"
            title="ปิดข้อความ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
