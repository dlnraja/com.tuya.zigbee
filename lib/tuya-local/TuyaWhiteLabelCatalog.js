'use strict';

/**
 * TuyaWhiteLabelCatalog.js - Wi-Fi brands that ship Tuya modules under their own app.
 *
 * WHY: users search for "Lidl", "Moes", "Nedis"... not "Tuya". All of these speak the same
 * Tuya LAN protocol (3.1-3.5, TCP 6668, UDP 6666/6667/7000) once device_id + local_key are
 * known, so they pair through the wifi_* drivers. What differs is HOW to get the key:
 *   - 'sharing_qr'  : Smart Life / Tuya Smart account -> User Code + QR (TuyaSharingClient)
 *   - 'iot_link'    : Tuya IoT Platform project linked to a Smart Life / Tuya Smart account
 *   - 'move_to_smartlife' : brand app account is separate -> re-add device in Smart Life first
 *   - 'manual'      : device_id + local_key from tinytuya wizard / tuya-cli / API Explorer
 *
 * Sources (facts only): TinyTuya README (wizard / Smart Life link), Home Assistant Tuya +
 * make-all/tuya-local docs (QR login is Smart Life / Tuya Smart only), community reports.
 * Brand list is intentionally conservative - only brands widely documented as Tuya-based.
 */

const KEY_STRATEGIES = Object.freeze({
  sharing_qr: 'Smart Life / Tuya Smart: User Code + one QR scan (no developer account)',
  iot_link: 'Tuya IoT Platform project with "Link App Account" (Smart Life / Tuya Smart)',
  move_to_smartlife: 'Remove from the brand app, add the same device in Smart Life, then use the QR',
  manual: 'Enter device ID + local key obtained elsewhere (tinytuya wizard, tuya-cli, API Explorer)',
});

const BRANDS = Object.freeze([
  { id: 'smartlife', label: 'Smart Life', app: 'Smart Life', aliases: ['smart life', 'smart_life', 'tuyasmartlife'], strategies: ['sharing_qr', 'iot_link', 'manual'] },
  { id: 'tuyasmart', label: 'Tuya Smart', app: 'Tuya Smart', aliases: ['tuya', 'tuya smart', 'tuya_smart'], strategies: ['sharing_qr', 'iot_link', 'manual'] },
  { id: 'lidl', label: 'Lidl Silvercrest / Livarno', app: 'Lidl Home', aliases: ['silvercrest', 'livarno', 'livarnolux', 'parkside', 'lidlhome'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'moes', label: 'Moes', app: 'MOES', aliases: ['moeshouse', 'moesgo'], strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
  { id: 'nedis', label: 'Nedis SmartLife', app: 'Nedis SmartLife', aliases: ['nedissmartlife'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'gosund', label: 'Gosund', app: 'Gosund', aliases: ['nitetronic'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'avatto', label: 'Avatto', app: 'Avatto / Smart Life', aliases: ['avattohome'], strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
  { id: 'blitzwolf', label: 'BlitzWolf', app: 'BlitzWolf', aliases: ['bw', 'blitzhome'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'lsc', label: 'LSC Smart Connect (Action)', app: 'LSC Smart Connect', aliases: ['action', 'lscsmartconnect'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'zemismart', label: 'Zemismart', app: 'Zemismart / Smart Life', aliases: ['zemi'], strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
  // P3404: widely documented EU/US/AU Tuya-based Wi-Fi white-label brands
  { id: 'woox', label: 'Woox Home', app: 'WOOX Home', aliases: ['wooxhome'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'hama', label: 'Hama Smart Home', app: 'Hama Smart Home', aliases: ['hamasmarthome', 'hamasmart'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'calex', label: 'Calex Smart', app: 'Calex Smart', aliases: ['calexsmart'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'nous', label: 'Nous Smart Home', app: 'Nous Smart Home', aliases: ['noussmart', 'noussmarthome'], strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] },
  { id: 'aubess', label: 'Aubess', app: 'Smart Life', aliases: ['aubesssmart'], strategies: ['sharing_qr', 'move_to_smartlife', 'manual'] },
  { id: 'bseed', label: 'Bseed', app: 'Smart Life', aliases: ['bseedsmart'], strategies: ['sharing_qr', 'move_to_smartlife', 'manual'] },
  { id: 'loratap', label: 'LoraTap', app: 'Smart Life', aliases: ['loratapsmart'], strategies: ['sharing_qr', 'move_to_smartlife', 'manual'] },
  { id: 'teckin', label: 'Teckin', app: 'Smart Life', aliases: ['teckinsmart'], strategies: ['sharing_qr', 'move_to_smartlife', 'manual'] },
  { id: 'treatlife', label: 'Treatlife', app: 'Treatlife', aliases: ['treatlifesmart'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'feit', label: 'Feit Electric', app: 'Feit Electric', aliases: ['feitelectric'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'denver', label: 'Denver Smart Home', app: 'Denver Smart Home', aliases: ['denversmarthome'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'kogan', label: 'Kogan SmarterHome', app: 'Kogan SmarterHome', aliases: ['smarterhome', 'kogansmarterhome'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'gridconnect', label: 'Grid Connect (Arlec / Bunnings)', app: 'Grid Connect', aliases: ['arlec', 'bunnings', 'deta'], strategies: ['move_to_smartlife', 'manual'] },
  { id: 'brilliant', label: 'BrilliantSmart', app: 'BrilliantSmart', aliases: ['brilliantsmart'], strategies: ['move_to_smartlife', 'manual'] },
]);

function normalizeBrand(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) {return null;}
  return BRANDS.find((b) => b.id === s
    || (Array.isArray(b.aliases) && b.aliases.some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, '') === s))
    || b.label.toLowerCase().replace(/[^a-z0-9]/g, '').includes(s)
    || b.app.toLowerCase().replace(/[^a-z0-9]/g, '') === s) || null;
}

/** Ordered, human-readable key-retrieval advice for a brand (unknown -> generic Tuya advice). */
function keyRetrievalAdvice(raw) {
  const brand = normalizeBrand(raw) || { id: 'unknown', label: String(raw || 'Tuya-based'), app: '?', strategies: ['move_to_smartlife', 'sharing_qr', 'manual'] };
  return {
    brand: brand.id,
    label: brand.label,
    app: brand.app,
    nativeSharing: brand.strategies[0] === 'sharing_qr',
    steps: brand.strategies.map((k) => ({ strategy: k, text: KEY_STRATEGIES[k] })),
  };
}

/** UI-ready list of all documented Tuya-based Wi-Fi white-label brands. */
function listBrandsForUi() {
  return BRANDS.map((b) => ({
    id: b.id,
    label: b.label,
    app: b.app,
    nativeSharing: b.strategies[0] === 'sharing_qr',
  }));
}

const LOCALIZED_TIPS = Object.freeze({
  key_rotated: {
    en: 'Resetting or re-pairing a Tuya/SmartLife/Lidl/LSC Wi-Fi device rotates its local_key immediately. Open Device -> Maintenance -> Repair to refresh the key.',
    fr: 'Réinitialiser ou réappairer un appareil Wi-Fi Tuya/SmartLife/Lidl/LSC change immédiatement sa local_key. Ouvrez Appareil -> Maintenance -> Réparer pour la rafraîchir.',
    nl: 'Het resetten of opnieuw koppelen van een Tuya/SmartLife/Lidl/LSC wifi-apparaat vernieuwt de local_key direct. Open Apparaat -> Onderhoud -> Repareren om de sleutel te verversen.',
    de: 'Beim Zurücksetzen oder erneuten Koppeln eines Tuya/SmartLife/Lidl/LSC-WLAN-Geräts ändert sich der local_key sofort. Öffne Gerät -> Wartung -> Reparieren zum Aktualisieren.',
  },
  native_qr: {
    en: 'Open Smart Life / Tuya Smart -> Me -> Settings -> Account and Security -> User Code, enter it here and scan the QR code (no developer account needed).',
    fr: 'Ouvrez Smart Life / Tuya Smart -> Moi -> Paramètres -> Compte et sécurité -> Code utilisateur, saisissez-le ici puis scannez le QR code (sans compte développeur).',
    nl: 'Open Smart Life / Tuya Smart -> Ik -> Instellingen -> Account en beveiliging -> Gebruikerscode, vul deze in en scan de QR-code (geen ontwikkelaarsaccount nodig).',
    de: 'Öffne Smart Life / Tuya Smart -> Ich -> Einstellungen -> Konto und Sicherheit -> Benutzercode, gib ihn hier ein und scanne den QR-Code (kein Entwicklerkonto nötig).',
  },
  move_oem: {
    en: '{label} ({app}) uses a separate OEM cloud account. Remove the device from {app}, add it in Smart Life (or Tuya Smart), then link via User Code + QR.',
    fr: '{label} ({app}) utilise un compte OEM séparé. Supprimez l\'appareil de {app}, ajoutez-le dans Smart Life (ou Tuya Smart), puis liez-le via Code utilisateur + QR.',
    nl: '{label} ({app}) gebruikt een apart OEM-account. Verwijder het apparaat uit {app}, voeg het toe in Smart Life (of Tuya Smart) en koppel via Gebruikerscode + QR.',
    de: '{label} ({app}) nutzt ein separates OEM-Konto. Entferne das Gerät aus {app}, füge es in Smart Life (oder Tuya Smart) hinzu und verknüpfe es per Benutzercode + QR.',
  },
});

/** P3408: Localized pairing & key-rotation tip for SmartLife / OEM apps (Lidl, LSC, Nedis, etc.). */
function getLocalizedPairingTip(brandOrKey, lang = 'en') {
  const l = ['en', 'fr', 'nl', 'de'].includes(String(lang || '').toLowerCase().slice(0, 2))
    ? String(lang).toLowerCase().slice(0, 2)
    : 'en';
  if (String(brandOrKey || '').toLowerCase() === 'key_rotated') {
    return LOCALIZED_TIPS.key_rotated[l];
  }
  const brand = normalizeBrand(brandOrKey);
  if (!brand || brand.strategies[0] === 'sharing_qr') {
    return LOCALIZED_TIPS.native_qr[l];
  }
  return LOCALIZED_TIPS.move_oem[l]
    .replace(/\{label\}/g, brand.label)
    .replace(/\{app\}/g, brand.app);
}

module.exports = {
  KEY_STRATEGIES,
  BRANDS,
  normalizeBrand,
  keyRetrievalAdvice,
  listBrandsForUi,
  getLocalizedPairingTip,
};
