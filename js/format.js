/* Kritzelkrieg – Zahlen- und Zeitformat. */
(function (root) {
  'use strict';
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
    'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];
  let sci = false;

  function letters(i) {
    // nach Vg: aa, ab, … zz
    const a = 'abcdefghijklmnopqrstuvwxyz';
    const k = i - SUFFIX.length;
    return a[Math.floor(k / 26) % 26] + a[k % 26];
  }

  function trim(x, digits) {
    const s = x.toFixed(digits);
    return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
  }

  function fmt(n, opts) {
    if (n == null || Number.isNaN(n)) return '0';
    if (!Number.isFinite(n)) return '∞';
    const neg = n < 0; n = Math.abs(n);
    let out;
    if (n < 1000) {
      const small = opts && opts.decimals;
      out = n < 10 && small ? trim(n, 1) : String(Math.floor(n));
    } else if (sci) {
      const e = Math.floor(Math.log10(n));
      out = (n / Math.pow(10, e)).toFixed(2) + 'e' + e;
    } else {
      let i = Math.floor(Math.log10(n) / 3);
      let v = n / Math.pow(1000, i);
      if (v >= 999.995) { v /= 1000; i++; }
      const sfx = i < SUFFIX.length ? SUFFIX[i] : letters(i);
      out = (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + sfx;
    }
    return (neg ? '−' : '') + out;
  }

  function dur(sec) {
    sec = Math.max(0, Math.floor(sec));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (d > 0) return `${d} T ${h} h`;
    if (h > 0) return `${h} h ${m} min`;
    if (m > 0) return `${m} min ${s} s`;
    return `${s} s`;
  }

  function pct(x) { return trim(x * 100, x < 0.1 ? 1 : 0) + ' %'; }

  const FMT = { fmt, dur, pct, setSci(v) { sci = !!v; }, get sci() { return sci; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = FMT;
  else root.KK_FMT = FMT;
})(typeof window !== 'undefined' ? window : globalThis);
