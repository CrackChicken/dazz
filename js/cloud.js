/* Kritzelkrieg – optionaler Cloud-Spielstand.
 * Funktioniert nur, wenn die Seite als claude.ai-Artifact läuft (window.claude.use).
 * Dann wird der Spielstand im privaten Bereich des Spielers gespeichert, damit man
 * auf iPhone und PC mit demselben Stand weiterspielen kann. Sonst: nur localStorage. */
(function (root) {
  'use strict';
  let ref = null, busy = false, readonly = false;
  let status = 'off'; // off | connecting | on | readonly | error
  let lastWrite = 0;
  const listeners = [];

  function setStatus(s) { status = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* ignore */ } }); }
  function timeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }

  function deviceId() {
    try {
      let id = localStorage.getItem('kritzelkrieg-device');
      if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('kritzelkrieg-device', id); }
      return id;
    } catch (e) { return 'tmp-' + Math.random().toString(36).slice(2, 8); }
  }
  const DEVICE = deviceId();

  async function init() {
    const c = root.claude;
    if (!c || typeof c.use !== 'function') { setStatus('off'); return null; }
    setStatus('connecting');
    try {
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      if (!db || !user) { setStatus('off'); return null; }
      const id = await user.id();
      if (!id) { setStatus('off'); return null; }
      ref = db.doc('data/users/' + id + '/save');
      const snap = await timeout(ref.get(), 10000);
      setStatus('on');
      return snap.exists ? snap.data() : null;
    } catch (e) {
      setStatus(ref ? 'error' : 'off');
      return null;
    }
  }

  async function fetch() {
    if (!ref || status === 'off') return null;
    try { const snap = await timeout(ref.get(), 8000); return snap.exists ? snap.data() : null; }
    catch (e) { return null; }
  }

  async function save(json, savedAt) {
    if (!ref || busy || readonly) return false;
    busy = true;
    try {
      await ref.set({ json, savedAt, device: DEVICE, v: 1 });
      lastWrite = Date.now();
      if (status !== 'on') setStatus('on');
      return true;
    } catch (e) {
      if (e && e.code === 'invalid_argument') { readonly = true; setStatus('readonly'); }
      else if (e && e.code === 'revoked') { ref = null; setStatus('off'); }
      else setStatus('error');
      return false;
    } finally { busy = false; }
  }

  root.KK_CLOUD = {
    init, fetch, save, DEVICE,
    get status() { return status; },
    get lastWrite() { return lastWrite; },
    get available() { return !!ref && !readonly; },
    onStatus(fn) { listeners.push(fn); }
  };
})(window);
