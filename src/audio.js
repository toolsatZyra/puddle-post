// All sound is synthesized locally. Silence is the default and no audio context
// is opened until the player explicitly enables sound.
export class Sound {
  constructor() { this.enabled = false; this.context = null; }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) { try { this.context ||= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume().catch(() => {}); this.chime(); } catch { this.enabled = false; } }
    else this.context?.suspend().catch(() => {});
    return this.enabled;
  }
  note(freq, end, seconds, volume, delay = 0, type = 'sine') {
    if (!this.enabled || this.context?.state !== 'running') return;
    const c = this.context, t = c.currentTime + delay, osc = c.createOscillator(), gain = c.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(end, t + seconds); gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + .012); gain.gain.exponentialRampToValueAtTime(.0001, t + seconds); osc.connect(gain); gain.connect(c.destination); osc.start(t); osc.stop(t + seconds + .02); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  lift() { this.note(390, 580, .11, .018); }
  chime() { this.note(660, 660, .23, .035); this.note(880, 880, .3, .025, .095); this.note(1100, 1100, .38, .02, .19); }
  bump() { this.note(160, 65, .26, .04, 0, 'triangle'); }
  pause() { this.context?.suspend().catch(() => {}); }
  resume() { if (this.enabled) this.context?.resume().catch(() => {}); }
}
