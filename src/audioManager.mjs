export function createAudioManager() {
  let context = null;
  let config = {
    muted: false,
    sfxVolume: 0.6,
    musicVolume: 0.45,
    ambientVolume: 0.5
  };

  function ensureContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    return context;
  }

  function ping(frequency = 320, duration = 0.04, volume = 0.02, channel = "sfx") {
    const ctx = ensureContext();
    if (!ctx) return;
    const channelVolume = channel === "music" ? config.musicVolume : channel === "ambient" ? config.ambientVolume : config.sfxVolume;
    if (config.muted || channelVolume <= 0) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = volume * Math.max(0, Math.min(1, channelVolume));
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  return {
    applySettings(next = {}) {
      config = {
        ...config,
        muted: Boolean(next.muted),
        sfxVolume: Number.isFinite(next.sfxVolume) ? Math.max(0, Math.min(1, next.sfxVolume)) : config.sfxVolume,
        musicVolume: Number.isFinite(next.musicVolume) ? Math.max(0, Math.min(1, next.musicVolume)) : config.musicVolume,
        ambientVolume: Number.isFinite(next.ambientVolume) ? Math.max(0, Math.min(1, next.ambientVolume)) : config.ambientVolume
      };
    },
    button() {
      ping(340, 0.03, 0.02, "sfx");
    },
    interact() {
      ping(420, 0.05, 0.026, "sfx");
    },
    footsteps() {
      ping(180, 0.02, 0.014, "ambient");
    },
    ambient() {
      ping(160, 0.08, 0.012, "ambient");
    },
    nightclub() {
      ping(240, 0.06, 0.016, "music");
    }
  };
}
