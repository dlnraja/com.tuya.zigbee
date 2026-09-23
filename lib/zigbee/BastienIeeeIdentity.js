'use strict';

/**
 * P2667 / P2694 / P2703 — Bastien Developer Tools IEEE → sacred couple map
 *
 * Homey Zigbee tools show Unknown / « Appareil Zigbee » when interview lost
 * OR when the device was paired under Homey native Zigbee instead of Bastien.
 * Never invent couples — only live-interviewed / DevTools-confirmed SSOT.
 *
 * Contre quoi (Chrome DevTools live 2026-09-23 18:48 Europe/Paris):
 * - Node 3  7c:c6:b6:ff:fe:a3:e1:58 → axpdxqgu+TS0041 as « Appareil Zigbee » (WRONG_APP)
 * - Node 7  a4:c1:38:5b:91:98:dd:55 → vsxvaj9i+TS0043 as « Appareil Zigbee » (WRONG_APP, new IEEE)
 * - Node 18 a4:c1:38:e6:69:60:4a:6f → dzwgk7e2+TS0042 OK « 2-Boutons… »
 * - Node 14 a4:c1:38:bb:8f:37:ee:17 → STALE ghost old TS0042
 * - Node 15 a4:c1:38:c1:17:76:42:f4 → fllyghyj SNZB-02 Unknown
 * - Node 19 a4:c1:38:e6:74:3a:00:da → NEED_INTERVIEW (never invent)
 */

const IEEE_COUPLES = Object.freeze({
  '7c:c6:b6:ff:fe:a3:e1:58': {
    mfr: '_TZ3000_axpdxqgu',
    pid: 'TS0041',
    driver: 'button_wireless_1',
    patch: 'P2703',
    nodeHint: 3,
    status: 'WRONG_APP_HOMEY',
    action: 'Remove « Appareil Zigbee » → Apps → Zigbee Bastien → Bouton sans fil 1 (wake-tap). NOT Homey Zigbee.',
  },
  // Stale IEEE after Bastien re-paired TS0042 under a new IEEE (Node 18 live).
  'a4:c1:38:bb:8f:37:ee:17': {
    mfr: '_TZ3000_dzwgk7e2',
    pid: 'TS0042',
    driver: 'button_wireless_2',
    patch: 'P2636',
    nodeHint: 14,
    status: 'STALE_GHOST',
    action: 'Remove orphan Unknown Node only — live remote is Node 18 (e6:69:60:4a:6f)',
  },
  'a4:c1:38:e6:69:60:4a:6f': {
    mfr: '_TZ3000_dzwgk7e2',
    pid: 'TS0042',
    driver: 'button_wireless_2',
    patch: 'P2702',
    nodeHint: 18,
    status: 'OK_LIVE',
    action: 'Update Bastien ≥1.0.80 for snappy Flow→relay; Flow Bouton appuyé (not Zigbee canaux)',
  },
  'a4:c1:38:c1:17:76:42:f4': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    nodeHint: 15,
    status: 'UNKNOWN_LIVE',
    action: 'Remove Unknown Node → Zigbee Bastien → Climate Sensor (SNZB-02)',
  },
  // Prior IEEE (OFF_MESH as of evening scan) — keep for re-pair guidance
  'a4:c1:38:f6:3d:2d:c9:79': {
    mfr: '_TZ3000_vsxvaj9i',
    pid: 'TS0043',
    driver: 'button_wireless_3',
    patch: 'P2625',
    status: 'OFF_MESH',
    action: 'If this IEEE returns: pair Zigbee Bastien → Bouton 3 (NOT Homey Zigbee).',
  },
  // WHY(P2703 / Chrome 2026-09-23 18:48): live vsxvaj9i reappeared as Homey « Appareil Zigbee » Node 7
  'a4:c1:38:5b:91:98:dd:55': {
    mfr: '_TZ3000_vsxvaj9i',
    pid: 'TS0043',
    driver: 'button_wireless_3',
    patch: 'P2703',
    nodeHint: 7,
    status: 'WRONG_APP_HOMEY',
    action: 'Remove « Appareil Zigbee » → Zigbee Bastien → Bouton sans fil 3. Flow Bouton appuyé (not canaux).',
  },
  'a4:c1:38:f7:14:92:cb:c8': {
    mfr: '_TZ3000_ltt60asa',
    pid: 'TS0004',
    driver: 'switch_4gang',
    patch: 'P2634',
    nodeHint: 20,
    status: 'OK_LIVE',
    action: 'Already OK as Eclairage salon — verify 4 channels',
  },
  'a4:c1:38:a0:cf:8c:0f:7a': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    nodeHint: 10,
    status: 'OK_LIVE',
    action: 'OK (Sous sol)',
  },
  'a4:c1:38:b2:2c:24:81:b1': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    nodeHint: 12,
    status: 'OK_LIVE',
    action: 'OK (chambre principal)',
  },
  'a4:c1:38:09:4f:ff:ff:ff': {
    mfr: 'eWeLink',
    pid: 'CK-TLSR8656-SS5-01(7014)',
    driver: 'climate_sensor',
    patch: 'P2622',
    nodeHint: 4,
    status: 'OK_LIVE',
    action: 'OK (salon/cuisine TH)',
  },
});

/** IEEE seen live as Unknown with no verified interview — never invent mfr+pid. */
const NEED_INTERVIEW_IEEE = Object.freeze([
  'a4:c1:38:e6:74:3a:00:da', // Node 19 2026-09-23 evening — near TS0042 OUI, identity unknown
]);

function normIeee(ieee) {
  return String(ieee || '')
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/gi, '')
    .replace(/(.{2})(?=.)/g, '$1:');
}

function lookupBastienIeee(ieee) {
  const key = String(ieee || '').trim().toLowerCase();
  if (IEEE_COUPLES[key]) return { ieee: key, ...IEEE_COUPLES[key] };
  const compact = key.replace(/:/g, '');
  for (const [k, v] of Object.entries(IEEE_COUPLES)) {
    if (k.replace(/:/g, '') === compact) return { ieee: k, ...v };
  }
  return null;
}

function isNeedInterviewIeee(ieee) {
  const key = String(ieee || '').trim().toLowerCase();
  const compact = key.replace(/:/g, '');
  return NEED_INTERVIEW_IEEE.some((i) => i === key || i.replace(/:/g, '') === compact);
}

function listUnknownNodeActions() {
  return Object.entries(IEEE_COUPLES)
    .filter(([, v]) =>
      v.status === 'UNKNOWN_LIVE'
      || v.status === 'OFF_MESH'
      || v.status === 'STALE_GHOST'
      || v.status === 'WRONG_APP_HOMEY')
    .map(([ieee, v]) => ({ ieee, ...v }));
}

module.exports = {
  IEEE_COUPLES,
  NEED_INTERVIEW_IEEE,
  normIeee,
  lookupBastienIeee,
  isNeedInterviewIeee,
  listUnknownNodeActions,
};
