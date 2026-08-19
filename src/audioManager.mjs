export function createAudioManager() {
  let context = null;

  function ensureContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    return context;
  }

  function ping(frequency = 320, duration = 0.04, volume = 0.02) {
    const ctx = ensureContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  return {
    button() {
      ping(340, 0.03, 0.018);
    },
    interact() {
      ping(420, 0.05, 0.024);
    },
    footsteps() {
      ping(180, 0.02, 0.01);
    },
    ambient() {},
    nightclub() {}
  };
}
