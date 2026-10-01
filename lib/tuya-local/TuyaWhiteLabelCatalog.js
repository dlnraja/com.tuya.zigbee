'use strict';

/**
 * TuyaWhiteLabelCatalog.js — Wi-Fi brands that ship Tuya modules under their own app.
 *
 * WHY: users search for "Lidl", "Moes", "Nedis"… not "Tuya". All of these speak the same
 * Tuya LAN protocol (3.1–3.5, TCP 6668, UDP 6666/6667/7000) once device_id + local_key are
 * known, so they pair through the wifi_* drivers. What differs is HOW to get the key:
 *   - 'sharing_qr'  : Smart Life / Tuya Smart account → User Code + QR (TuyaSharingClient)
 *   - 'iot_link'    : Tuya IoT Platform project linked to a Smart Life / Tuya Smart account
 *   - 'move_to_smartlife' : brand app account is separate → re-add device in Smart Life first
 *   - 'manual'      : device_id + local_key from tinytuya wizard / tuya-cli / API Explorer
 *
 * Sources (facts only): TinyTuya README (wizard / Smart Life link), Home Assistant Tuya +
 * make-all/tuya-local docs (QR login is Smart Life / Tuya Smart only), community reports.
 * Brand list is intentionally conservative — only brands widely documented as Tuya-based.
 */

const KEY_STRATEGIES = Object.freeze({
  sharing_qr: 'Smart Life / Tuya Smart: User Code + one QR scan (no developer account)',
  iot_link: 'Tuya IoT Platform project with "Link App Account" (Smart Life / Tuya Smart)',
  move_to_smartlife: 'Remove from the brand app, add the same device in Smart Life, then use the QR',
  manual: 'Enter device ID + local key obtained elsewhere (tinytuya wizard, tuya-cli, API Explorer)',
});

const BRANDS = Object.freeze([
  { id: 'smartlife', label: 'Smart Life', app: 'Smart Life', strategies: ['sharing_qr', 'iot_link', 'manual'] },
  { id: 'tuyasmart', label: 'Tuya Smart', app: 'Tuya Smart', strategies: ['sharing_qr', 'iot_link', 'manual'] },
  { id: 'lidl', label: 'Lidl Silvercrest / Livarno', app: 'Lidl Home', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'moes', label: 'Moes', app: 'MOES', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'nedis', label: 'Nedis SmartLife', app: 'Nedis SmartLife', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'gosund', label: 'Gosund', app: 'Gosund', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'avatto', label: 'Avatto', app: 'Avatto / Smart Life', strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
  { id: 'blitzwolf', label: 'BlitzWolf', app: 'BlitzWolf', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'lsc', label: 'LSC Smart Connect (Action)', app: 'LSC Smart Connect', strategies: ['move_to_smartlife', 'manual'] },
  { id: 'zemismart', label: 'Zemismart', app: 'Zemismart / Smart Life', strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
]);

function normalizeBrand(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) {return null;}
  return BRANDS.find((b) => b.id === s || b.label.toLowerCase().replace(/[^a-z0-9]/g, '').includes(s)
    || b.app.toLowerCase().replace(/[^a-z0-9]/g, '') === s) || null;
}

/** Ordered, human-readable key-retrieval advice for a brand (unknown → generic Tuya advice). */
function keyRetrievalAdvice(raw) {
  const brand = normalizeBrand(raw) || { id: 'unknown', label: String(raw || 'Tuya-based'), app: '?', strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] };
  return {
    brand: brand.id,
    label: brand.label,
    nativeSharing: brand.strategies[0] === 'sharing_qr',
    steps: brand.strategies.map((k) => ({ strategy: k, text: KEY_STRATEGIES[k] })),
  };
}

module.exports = { KEY_STRATEGIES, BRANDS, normalizeBrand, keyRetrievalAdvice };
