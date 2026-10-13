import { create } from 'zustand';

interface SoundStore {
  soundEnabled: boolean;
  testSoundTrigger: number;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  triggerTestSound: () => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  soundEnabled: true,
  testSoundTrigger: 0,
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('proximity_sound_enabled', String(next));
        } catch {
          // ignore storage failure
        }
      }
      return {
        soundEnabled: next,
        // If enabling sound, trigger a brief test chime so user verifies and unlocks audio
        testSoundTrigger: next ? state.testSoundTrigger + 1 : state.testSoundTrigger,
      };
    }),
  setSoundEnabled: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('proximity_sound_enabled', String(enabled));
      } catch {
        // ignore storage failure
      }
    }
    set((state) => ({
      soundEnabled: enabled,
      testSoundTrigger: enabled ? state.testSoundTrigger + 1 : state.testSoundTrigger,
    }));
  },
  triggerTestSound: () =>
    set((state) => ({
      testSoundTrigger: state.testSoundTrigger + 1,
    })),
}));

// Hydrate from localStorage in browser environment
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('proximity_sound_enabled');
    if (saved !== null) {
      useSoundStore.setState({ soundEnabled: saved !== 'false' });
    }
  } catch {
    // ignore
  }
}
