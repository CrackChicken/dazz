/* Kritzelkrieg – kleine Synth-Soundeffekte (WebAudio, keine Dateien). */
(function (root) {
  'use strict';
  let ac = null, master = null, noiseBuf = null, enabled = true;
  const last = {};

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; return false; }
    return true;
  }
  // iOS: AudioContext muss in einer Nutzer-Geste gestartet werden.
  function unlock() {
    if (!enabled || !ensure()) return;
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource();
    s.buffer = b; s.connect(master); s.start(0);
  }

  function limit(name, ms) {
    const n = performance.now();
    if (last[name] && n - last[name] < ms) return false;
    last[name] = n; return true;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, freq, q, type) {
    const t0 = ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur);
  }

  const SFX = {
    hit(crit) {
      if (!limit('hit', 45)) return;
      noise(0.07, crit ? 0.5 : 0.3, crit ? 1800 : 900, 0.8);
      tone(crit ? 260 : 170, 0.09, 'triangle', crit ? 0.35 : 0.22, 60);
    },
    coin() { if (!limit('coin', 90)) return; tone(1320, 0.07, 'square', 0.06); tone(1760, 0.09, 'square', 0.05, null, 0.05); },
    kill() { if (!limit('kill', 80)) return; noise(0.12, 0.25, 400, 0.6, 'lowpass'); },
    boss() { tone(110, 0.45, 'sawtooth', 0.12, 70); tone(165, 0.45, 'sawtooth', 0.08, 98); },
    level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, null, i * 0.08)); },
    buy() { if (!limit('buy', 50)) return; noise(0.05, 0.18, 3500, 1.5, 'highpass'); },
    skill() { noise(0.35, 0.25, 600, 0.5); tone(220, 0.3, 'sine', 0.15, 660); },
    meteor() { noise(0.6, 0.5, 220, 0.6, 'lowpass'); tone(90, 0.6, 'sine', 0.4, 40); },
    fail() { tone(300, 0.35, 'triangle', 0.18, 120); },
    ach() { [784, 988, 1175].forEach((f, i) => tone(f, 0.14, 'sine', 0.15, null, i * 0.07)); },
    ascend() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, null, i * 0.09)); }
  };

  function play(name, arg) {
    if (!enabled || !ac || ac.state !== 'running') return;
    try { SFX[name] && SFX[name](arg); } catch (e) { /* Audio ist optional */ }
  }

  root.KK_AUDIO = {
    unlock, play,
    setEnabled(v) { enabled = !!v; if (!ac) return; if (enabled) ac.resume(); else ac.suspend(); },
    get enabled() { return enabled; }
  };
})(window);
