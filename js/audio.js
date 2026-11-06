/* Kritzelkrieg – Soundsystem: Effekte und prozeduraler Soundtrack (WebAudio, keine Dateien).
 * Jedes Kapitel hat einen eigenen Song (Tonart, Tempo, Melodie aus einem Seed), Bosse einen treibenden Boss-Track. */
(function (root) {
  'use strict';
  let ac = null, master = null, sfxBus = null, musicBus = null, delay = null, noiseBuf = null;
  let sfxOn = true, musicOn = true;
  const last = {};
  let coinStreak = 0, coinLast = 0;
  // Sound-Pooling: aktive Stimmen zählen, leise Effekte bei Überlast weglassen
  let voices = 0, sfxVol = 0.9, musicVol = 0.8;
  const MAXV = 40;
  const PRIO = { swing: 1, hit: 1, coin: 1, tick: 1, star: 1, buy: 2, dodge: 2, block: 2, parry: 3, counter: 2, hurt: 2, kill: 1, warn: 3, ko: 3, revive: 3, roar: 3, level: 3, reveal: 3, burst: 3, jackpot: 3, chest: 3, ach: 3, ascend: 3, daily: 3, planeCatch: 3 };
  function track(node, dur) { voices++; node.onended = () => { voices = Math.max(0, voices - 1); }; void dur; }

  function ensure() {
    if (ac) { if (ac.state === 'suspended' && (sfxOn || musicOn) && !document.hidden) ac.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ac.createGain(); master.gain.value = 0.8;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
      // kleines Echo für die Melodie
      delay = ac.createDelay(1); delay.delayTime.value = 0.27;
      const fb = ac.createGain(); fb.gain.value = 0.28;
      const dl = ac.createGain(); dl.gain.value = 0.35;
      delay.connect(fb); fb.connect(delay); delay.connect(dl); dl.connect(musicBus);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; return false; }
    return true;
  }
  // iOS: AudioContext muss in einer Nutzer-Geste gestartet werden.
  function unlock() {
    if (!(sfxOn || musicOn) || !ensure()) return;
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource();
    s.buffer = b; s.connect(master); s.start(0);
    startSeq();
  }

  /* ---------- Bausteine ---------- */
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function tone(freq, dur, type, vol, opt) {
    opt = opt || {};
    const t0 = opt.at != null ? opt.at : ac.currentTime + (opt.delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t0 + dur);
    if (opt.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = opt.vib; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
    const atk = opt.attack || 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opt.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp; o.connect(f); node = f; }
    node.connect(g); g.connect(opt.bus || sfxBus);
    if (opt.send) g.connect(delay);
    if (!opt.bus || opt.bus === sfxBus) track(o, dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, freq, q, type, opt) {
    opt = opt || {};
    const t0 = opt.at != null ? opt.at : ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q || 1;
    if (opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(opt.bus || sfxBus);
    if (!opt.bus || opt.bus === sfxBus) track(s, dur);
    s.start(t0); s.stop(t0 + dur);
  }
  function limit(name, ms) {
    const n = performance.now();
    if (last[name] && n - last[name] < ms) return false;
    last[name] = n; return true;
  }

  /* ---------- Effekte ---------- */
  const SFX = {
    hit(crit) {
      if (!limit('hit', 40)) return;
      noise(0.07, crit ? 0.55 : 0.32, crit ? 1900 : 950, 0.8);
      tone(crit ? 280 : 175 + Math.random() * 30, 0.1, 'triangle', crit ? 0.4 : 0.24, { slide: 55 });
      if (crit) tone(1400, 0.12, 'square', 0.05, { slide: 2200 });
    },
    coin() {
      if (!limit('coin', 55)) return;
      const n = performance.now();
      coinStreak = n - coinLast < 700 ? Math.min(14, coinStreak + 1) : 0; coinLast = n;
      const f = 1320 * Math.pow(2, coinStreak / 12);
      tone(f, 0.07, 'square', 0.05); tone(f * 1.5, 0.1, 'square', 0.04, { delay: 0.045 });
    },
    kill() { if (!limit('kill', 70)) return; noise(0.14, 0.3, 500, 0.6, 'lowpass', { sweep: 120 }); tone(220, 0.12, 'square', 0.06, { slide: 90 }); },
    roar() { tone(95, 0.9, 'sawtooth', 0.22, { slide: 55, vib: 9, lp: 900 }); tone(142, 0.9, 'sawtooth', 0.14, { slide: 70, vib: 7, lp: 700 }); noise(0.8, 0.3, 300, 0.7, 'lowpass', { sweep: 120 }); },
    level() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.09, { delay: i * 0.07, lp: 3000 })); tone(262, 0.6, 'triangle', 0.2, { delay: 0.3 }); },
    buy() { if (!limit('buy', 45)) return; tone(660 + Math.random() * 80, 0.06, 'square', 0.07, { slide: 990 }); noise(0.04, 0.1, 4000, 1.5, 'highpass'); },
    milestone() { [784, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, { delay: i * 0.09 })); },
    skill() { noise(0.35, 0.28, 500, 0.5, 'bandpass', { sweep: 3000 }); tone(220, 0.35, 'sawtooth', 0.1, { slide: 880, lp: 2000 }); },
    meteor() { noise(0.8, 0.6, 1800, 0.5, 'lowpass', { sweep: 80 }); tone(110, 0.7, 'sine', 0.5, { slide: 30 }); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, { delay: i * 0.14 })); },
    ach() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'sine', 0.16, { delay: i * 0.07 })); },
    ascend() { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, { delay: i * 0.08 })); },
    fire() { noise(0.8, 0.45, 600, 0.6, 'bandpass', { sweep: 1600 }); noise(0.8, 0.3, 200, 0.5, 'lowpass'); },
    laser() { tone(1800, 0.35, 'square', 0.1, { slide: 200 }); tone(1200, 0.35, 'sawtooth', 0.06, { slide: 150, lp: 3000 }); },
    magic() { [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.18, 'sine', 0.09, { delay: i * 0.04 })); },
    hiss() { noise(0.5, 0.3, 5000, 0.8, 'highpass'); },
    slam() { tone(80, 0.35, 'sine', 0.55, { slide: 35 }); noise(0.3, 0.4, 400, 0.6, 'lowpass', { sweep: 100 }); },
    chest(roll) { noise(0.15, 0.2, 900, 3, 'bandpass', { sweep: 400 }); [659, 784, 988].slice(0, roll >= 5 ? 3 : 2).forEach((f, i) => tone(f * (roll >= 5 ? 1.25 : 1), 0.2, 'square', 0.08, { delay: 0.08 + i * 0.07 })); },
    jackpot() { for (let i = 0; i < 10; i++) tone(523 * Math.pow(2, i / 7), 0.14, 'square', 0.07, { delay: i * 0.045 }); [523, 659, 784, 1047].forEach(f => tone(f, 0.9, 'triangle', 0.1, { delay: 0.5 })); },
    plane() { noise(0.6, 0.18, 800, 0.8, 'bandpass', { sweep: 2500 }); tone(1568, 0.3, 'sine', 0.05, { vib: 12 }); },
    planeCatch() { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.14, 'sine', 0.12, { delay: i * 0.05 })); },
    combo(n) { const st = Math.min(12, Math.floor(n / 25) * 2); tone(523 * Math.pow(2, st / 12), 0.12, 'square', 0.08); tone(784 * Math.pow(2, st / 12), 0.16, 'square', 0.07, { delay: 0.06 }); },
    page() { noise(0.18, 0.18, 2500, 0.8, 'bandpass', { sweep: 700 }); },
    star() { if (!limit('star', 120)) return; tone(1568, 0.1, 'sine', 0.12); tone(2093, 0.16, 'sine', 0.1, { delay: 0.06 }); },
    equip() { tone(440, 0.06, 'square', 0.07); tone(660, 0.1, 'square', 0.07, { delay: 0.05 }); },
    tick() { tone(1800, 0.025, 'square', 0.05); },
    win() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, { delay: i * 0.08 })); },
    charge(i) { const f = 330 * Math.pow(2, (i || 0) * 3 / 12); tone(f, 0.28, 'sawtooth', 0.08, { slide: f * 1.5, lp: 2500 }); noise(0.2, 0.08, 1200 + (i || 0) * 400, 1, 'bandpass'); },
    burst(r) { noise(0.5, 0.4, 900, 0.5, 'lowpass', { sweep: 4000 }); tone(220 * Math.pow(2, (r || 0) / 4), 0.5, 'triangle', 0.25, { slide: 880 }); },
    reveal(r) {
      r = r || 0;
      if (r <= 1) { tone(660 + r * 220, 0.12, 'triangle', 0.12); return; }
      if (r <= 3) { [523, 659, 784, 1047].slice(0, r + 1).forEach((f, i) => tone(f * (r === 3 ? 1.12 : 1), 0.16, 'square', 0.07, { delay: i * 0.05, lp: 3200 })); return; }
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'square', 0.08, { delay: i * 0.06, lp: 3500 }));
      [262, 330, 392, 523].forEach(f => tone(f * (r >= 5 ? 1.06 : 1), 1.2, 'triangle', 0.1, { delay: 0.35 }));
      if (r >= 5) for (let i = 0; i < 8; i++) tone(2093 * Math.pow(2, i / 12), 0.1, 'sine', 0.06, { delay: 0.5 + i * 0.05 });
    },
    swing(a) {
      a = a || {};
      if (!limit('swing', a.crit || a.heavy ? 30 : 55)) return;
      const w = a.w || 'fist', v = 0.9 + Math.random() * 0.2;
      switch (w) {
        case 'sword': case 'dual': noise(0.12, 0.22, 3200 * v, 1.2, 'highpass', { sweep: 1800 }); tone(1150 * v, 0.1, 'triangle', 0.08, { slide: 800 }); break;
        case 'dagger': noise(0.06, 0.18, 4500 * v, 2, 'bandpass'); tone(1600 * v, 0.05, 'square', 0.04); break;
        case 'axe': tone(95 * v, 0.2, 'sine', 0.35, { slide: 45 }); noise(0.16, 0.3, 600, 0.6, 'lowpass', { sweep: 150 }); break;
        case 'rapier': tone(2100 * v, 0.12, 'sine', 0.08, { slide: 1600 }); noise(0.05, 0.12, 5000, 2, 'highpass'); break;
        case 'magic': tone(420 * v, 0.18, 'sine', 0.12, { slide: 1300 }); tone(1800, 0.12, 'sine', 0.04, { delay: 0.06 }); break;
        default: noise(0.07, 0.28, 900 * v, 0.8); tone(170 * v, 0.09, 'triangle', 0.22, { slide: 55 });
      }
      if (a.heavy) { tone(70, 0.25, 'sine', 0.35, { slide: 35 }); noise(0.2, 0.25, 300, 0.6, 'lowpass'); }
      if (a.crit) { tone(1400, 0.12, 'square', 0.05, { slide: 2400 }); noise(0.1, 0.35, 1800, 0.8); }
    },
    dodge() { noise(0.18, 0.22, 900, 0.9, 'bandpass', { sweep: 2600 }); },
    block() { tone(320, 0.12, 'square', 0.1, { lp: 2500 }); noise(0.1, 0.25, 2600, 5, 'bandpass'); },
    parry() { tone(1760, 0.5, 'sine', 0.15); tone(2637, 0.4, 'sine', 0.08, { delay: 0.01 }); noise(0.05, 0.2, 6000, 3, 'highpass'); },
    counter() { noise(0.14, 0.25, 2500, 1, 'highpass', { sweep: 900 }); tone(500, 0.18, 'sawtooth', 0.08, { slide: 1400, lp: 3000 }); },
    hurt() { if (!limit('hurt', 90)) return; tone(220, 0.16, 'square', 0.1, { slide: 110, lp: 1400 }); noise(0.1, 0.2, 700, 0.8); },
    warn() { tone(880, 0.12, 'square', 0.08); tone(880, 0.12, 'square', 0.08, { delay: 0.16 }); },
    ko() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, { delay: i * 0.12 })); noise(0.4, 0.3, 300, 0.6, 'lowpass'); },
    revive() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, { delay: i * 0.07 })); },
    daily() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, { delay: i * 0.08 })); }
  };

  function play(name, arg) {
    if (!sfxOn || !ac || ac.state !== 'running') return;
    const pr = PRIO[name] || 2;
    if ((voices > MAXV && pr < 3) || (voices > MAXV * 0.6 && pr < 2)) return;
    sfxBus.gain.setTargetAtTime(0.55 * sfxVol * (voices > 18 ? 0.75 : 1), ac.currentTime, 0.05);
    try { SFX[name] && SFX[name](arg); } catch (e) { /* Audio ist optional */ }
  }

  /* ---------- Musik ---------- */
  const MAJOR = { I: [0, 4, 7], ii: [2, 5, 9], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16] };
  const MINOR = { i: [0, 3, 7], iv: [5, 8, 12], v: [7, 10, 14], III: [3, 7, 10], VI: [8, 12, 15], VII: [10, 14, 17] };
  const PENTA_MAJ = [0, 2, 4, 7, 9], PENTA_MIN = [0, 3, 5, 7, 10];
  const ZONE_SONGS = [
    { root: 60, minor: false, bpm: 108, prog: ['I', 'V', 'vi', 'IV'] },
    { root: 62, minor: false, bpm: 100, prog: ['I', 'vi', 'IV', 'V'] },
    { root: 57, minor: false, bpm: 112, prog: ['I', 'IV', 'vi', 'V'] },
    { root: 57, minor: true, bpm: 118, prog: ['i', 'VI', 'III', 'VII'] },
    { root: 55, minor: false, bpm: 104, prog: ['I', 'V', 'IV', 'V'] },
    { root: 59, minor: true, bpm: 96, prog: ['i', 'iv', 'VI', 'v'] },
    { root: 61, minor: false, bpm: 110, prog: ['IV', 'V', 'vi', 'I'] }
  ];
  const BOSS_SONG = { root: 57, minor: true, bpm: 146, prog: ['i', 'i', 'VI', 'VII'], boss: true };

  function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  function buildSong(def, seed) {
    const R = rngFrom(seed);
    const chords = def.prog.map(n => (def.minor ? MINOR : MAJOR)[n] || [0, 4, 7]);
    const scale = def.minor ? PENTA_MIN : PENTA_MAJ;
    const pool = [];
    for (let o = 0; o < 3; o++) for (const s of scale) pool.push(s + o * 12);
    const rhythms = def.boss
      ? [[1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 1, 1, 0, 1, 0, 1]]
      : [[1, 0, 1, 1, 0, 1, 0, 0], [1, 0, 0, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1, 0, 0]];
    function phrase() {
      let idx = 6 + Math.floor(R() * 3);
      return chords.map(ch => {
        const rh = rhythms[Math.floor(R() * rhythms.length)];
        return rh.map((on, i) => {
          if (!on) return null;
          if (i === 0 || i === 4) {
            // Akkordton in der Nähe
            let best = idx, bd = 99;
            for (let k = 0; k < pool.length; k++) { const pc = pool[k] % 12; if (ch.some(c => c % 12 === pc)) { const dd = Math.abs(k - idx) + R() * 1.5; if (dd < bd) { bd = dd; best = k; } } }
            idx = best;
          } else idx = Math.max(2, Math.min(pool.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)]));
          return pool[idx];
        });
      });
    }
    const A = phrase(), Bp = phrase();
    const A2 = A.map((bar, i) => i === 3 ? Bp[3] : bar);
    return { def, chords, melody: [A, A2, Bp, A], bars: 16 };
  }

  let song = null, songKey = '', step = 0, nextTime = 0, timer = null, wantKey = 'z0';
  function setTrack(key) {
    wantKey = key;
    if (!ac || key === songKey) return;
    switchSong();
  }
  function switchSong() {
    songKey = wantKey;
    const boss = wantKey === 'boss';
    const zi = boss ? 0 : (+wantKey.slice(1) || 0);
    const def = boss ? BOSS_SONG : ZONE_SONGS[zi % ZONE_SONGS.length];
    song = buildSong(def, boss ? 777 : 1000 + zi * 31);
    step = 0;
    if (ac) nextTime = ac.currentTime + 0.08;
  }
  function startSeq() {
    if (timer || !ac) return;
    if (!song || songKey !== wantKey) switchSong();
    nextTime = ac.currentTime + 0.1;
    timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    if (!musicOn) { nextTime = ac.currentTime + 0.05; return; }
    if (songKey !== wantKey) switchSong();
    const spb = 60 / song.def.bpm / 4; // Sechzehntel
    while (nextTime < ac.currentTime + 0.12) { playStep(step, nextTime, spb); nextTime += spb; step = (step + 1) % (song.bars * 16); }
  }
  function playStep(st, at, spb) {
    const d = song.def, boss = !!d.boss;
    const bar = Math.floor(st / 16), s16 = st % 16, beat = s16 % 4 === 0;
    const chord = song.chords[bar % 4];
    const root = d.root - 12;
    const bus = musicBus;
    // Schlagzeug
    if (boss ? beat : (s16 === 0 || s16 === 8 || s16 === 10)) kick(at);
    if (s16 === 4 || s16 === 12) snare(at);
    if (boss ? true : s16 % 2 === 0) hat(at, s16 % 4 === 2 ? 0.07 : 0.04);
    if (!boss && bar % 8 === 7 && s16 >= 12) snare(at, 0.12);
    // Bass
    if (boss) { if (s16 % 2 === 0) tone(midi(root + chord[0] + (s16 % 4 === 2 ? 12 : 0)), spb * 1.6, 'square', 0.085, { at, lp: 700, bus }); }
    else if (s16 % 4 === 0) {
      const n = [chord[0], chord[0], chord[2] - 12, chord[0] + 12][s16 / 4];
      tone(midi(root + n), spb * 3.2, 'triangle', 0.2, { at, bus });
    }
    // Akkorde
    if (boss) {
      if (s16 % 2 === 1) { const n = chord[(s16 >> 1) % 3]; tone(midi(d.root + 12 + n), spb * 0.9, 'square', 0.03, { at, lp: 2500, bus }); }
    } else if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) {
      for (const n of chord) tone(midi(d.root + n), spb * 1.5, 'square', 0.022, { at, lp: 1600, bus });
    }
    // Melodie (Achtel)
    if (s16 % 2 === 0) {
      const sec = Math.floor(bar / 4) % 4, mbar = bar % 4;
      const n = song.melody[sec][mbar][s16 / 2];
      if (n != null) tone(midi(d.root + 12 + n), spb * (boss ? 1.8 : 2.6), boss ? 'sawtooth' : 'square', boss ? 0.05 : 0.055, { at, vib: 5, lp: boss ? 2600 : 3200, bus, send: true });
    }
  }
  function kick(at) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    g.gain.setValueAtTime(0.5, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + 0.2);
  }
  function snare(at, v) { noise(0.13, v || 0.16, 1800, 0.7, 'bandpass', { at, bus: musicBus }); tone(190, 0.08, 'triangle', 0.08, { at, bus: musicBus }); }
  function hat(at, v) { noise(0.03, v, 7500, 1, 'highpass', { at, bus: musicBus }); }

  function applyMusic() {
    if (!ac) return;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setTargetAtTime(musicOn ? 0.32 * musicVol : 0, ac.currentTime, 0.15);
  }

  root.KK_AUDIO = {
    unlock, play, setTrack,
    setSfx(v) { sfxOn = !!v; if (ac && (sfxOn || musicOn)) ac.resume(); },
    setVolumes(m, f) { musicVol = m; sfxVol = f; applyMusic(); },
    get voices() { return voices; },
    setMusic(v) { musicOn = !!v; applyMusic(); },
    setEnabled(v) { this.setSfx(v); },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && (sfxOn || musicOn)) ac.resume(); },
    get sfx() { return sfxOn; }, get music() { return musicOn; }
  };
})(window);
