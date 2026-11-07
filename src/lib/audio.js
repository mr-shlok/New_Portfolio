// Cinematic Web Audio Engine
// Generates ambient atmospheric soundscapes & tactile UI sound effects
// completely synthesized via Web Audio API (no external asset dependencies).

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.nodes = [];
    this.lfo = null;
  }

  _init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    this._startAmbient();
  }

  _startAmbient() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub Drone Oscillator (55Hz root - A1)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(55, now);

    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(110, now);
    subFilter.Q.setValueAtTime(2.5, now);

    // Warm Harmonic Pad Oscillator (110Hz - A2, slightly detuned +5 cents)
    const padOsc1 = this.ctx.createOscillator();
    padOsc1.type = 'sawtooth';
    padOsc1.frequency.setValueAtTime(110, now);
    padOsc1.detune.setValueAtTime(6, now);

    // Perfect Fifth Oscillator (164.8Hz - E3, detuned -5 cents)
    const padOsc2 = this.ctx.createOscillator();
    padOsc2.type = 'sawtooth';
    padOsc2.frequency.setValueAtTime(164.81, now);
    padOsc2.detune.setValueAtTime(-6, now);

    // Shimmering High Harmonic (220Hz - A3, triangle)
    const padOsc3 = this.ctx.createOscillator();
    padOsc3.type = 'triangle';
    padOsc3.frequency.setValueAtTime(220, now);

    // Pad lowpass filter with slow LFO modulation
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(380, now);
    padFilter.Q.setValueAtTime(1.8, now);

    // LFO for breathing filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, now); // ~5.5s breathing period

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(160, now);

    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);

    // Connect oscillators
    subOsc.connect(subFilter);
    subFilter.connect(this.ambientGain);

    padOsc1.connect(padFilter);
    padOsc2.connect(padFilter);
    padOsc3.connect(padFilter);
    padFilter.connect(this.ambientGain);

    // Start all
    subOsc.start(now);
    padOsc1.start(now);
    padOsc2.start(now);
    padOsc3.start(now);
    lfo.start(now);

    this.nodes = [subOsc, padOsc1, padOsc2, padOsc3, lfo];
  }

  toggle() {
    this._init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;

    if (this.enabled) {
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.18, now + 1.2);
      this.playSuccess();
    } else {
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0, now + 0.6);
      this.playClick();
    }

    return this.enabled;
  }

  playHover() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(3.0, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.025);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.028);
    } catch { /* benign */ }
  }

  playClick() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch { /* benign */ }
  }

  playExpand() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch { /* benign */ }
  }

  playSuccess() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      [
        { f: 523.25, at: 0 },
        { f: 659.25, at: 0.08 },
        { f: 783.99, at: 0.16 },
      ].forEach(({ f, at }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + at);

        gain.gain.setValueAtTime(0.04, now + at);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + at);
        osc.stop(now + at + 0.25);
      });
    } catch { /* benign */ }
  }
}

export const sound = new SoundEngine();
