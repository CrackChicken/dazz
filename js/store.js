/* Kritzelkrieg – Premium-Shop (nur Vorschau).
 * Zahlungen sind bewusst deaktiviert. Diese Datei ist die Stelle, an der später ein echter
 * Zahlungsanbieter angeschlossen wird, ohne das Spiel selbst zu ändern:
 *   - iOS: Apple In-App-Käufe brauchen eine native Hülle (z. B. Capacitor mit einem StoreKit-Plugin).
 *   - PC/Steam: Steam-Mikrotransaktionen brauchen eine Desktop-Hülle (z. B. Electron) mit Steamworks.
 * Ein Anbieter implementiert { id, available(), products(), purchase(productId) }.
 * Grundsatz: nur Kosmetik, keine Spielvorteile (kein Pay-to-Win). */
(function (root) {
  'use strict';
  const C = root.KK_CONTENT;

  const noneProvider = {
    id: 'none',
    available() { return false; },
    products() { return []; },
    purchase() { return Promise.reject(new Error('Käufe sind noch nicht verfügbar.')); }
  };
  let provider = noneProvider;

  root.KK_STORE = {
    get provider() { return provider.id; },
    get enabled() { return provider.available(); },
    catalog() { return C.shop; },
    // Später: KK_STORE.use(appleProvider) oder KK_STORE.use(steamProvider)
    use(p) { if (p && typeof p.purchase === 'function') provider = p; },
    purchase(id) { return provider.purchase(id); }
  };
})(window);
