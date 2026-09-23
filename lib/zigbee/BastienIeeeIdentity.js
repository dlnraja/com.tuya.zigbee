'use strict';

/**
 * P2667 / P2694 — Bastien Developer Tools "Unknown Node" IEEE → sacred couple map
 *
 * Homey Zigbee tools show Unknown when interview lost mfr/pid but the IEEE
 * was previously live-interviewed. Never invent new couples — only SSOT.
 *
 * Contre quoi (Bastien live 2026-09-21 + 2026-09-23 DevTools dump):
 * - 7c:c6:b6:ff:fe:a3:e1:58 → axpdxqgu+TS0041 (P2630) — still Unknown Node #3
 * - a4:c1:38:bb:8f:37:ee:17 → stale ghost of old TS0042 (re-paired as e6:69…)
 * - a4:c1:38:e6:69:60:4a:6f → live dzwgk7e2+TS0042 Node #17 (P2693 tip ≥1.0.69)
 * - a4:c1:38:c1:17:76:42:f4 → fllyghyj+SNZB-02 (interview lost → Unknown #14)
 * - a4:c1:38:f6:3d:2d:c9:79 → vsxvaj9i+TS0043 OFF MESH (re-pair)
 * - a4:c1:38:e6:74:3a:00:da → NEED_INTERVIEW (do NOT invent couple)
 */

const IEEE_COUPLES = Object.freeze({
  '7c:c6:b6:ff:fe:a3:e1:58': {
    mfr: '_TZ3000_axpdxqgu',
    pid: 'TS0041',
    driver: 'button_wireless_1',
    patch: 'P2630',
    status: 'UNKNOWN_LIVE',
    action: 'Remove Unknown Node → Apps → Zigbee Bastien → Wireless Button 1 (wake-tap while pairing)',
  },
  // Stale IEEE after Bastien re-paired TS0042 under a new IEEE (Node 17).
  'a4:c1:38:bb:8f:37:ee:17': {
    mfr: '_TZ3000_dzwgk7e2',
    pid: 'TS0042',
    driver: 'button_wireless_2',
    patch: 'P2636',
    status: 'STALE_GHOST',
    action: 'Remove orphan Unknown Node only — live remote is already Node 17 (e6:69:60:4a:6f)',
  },
  'a4:c1:38:e6:69:60:4a:6f': {
    mfr: '_TZ3000_dzwgk7e2',
    pid: 'TS0042',
    driver: 'button_wireless_2',
    patch: 'P2693',
    status: 'OK_LIVE',
    action: 'Update Bastien ≥1.0.69 + Repair/re-pair near a HOBEIAN router; Flow Button pressed (not Zigbee canaux)',
  },
  'a4:c1:38:c1:17:76:42:f4': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    status: 'UNKNOWN_LIVE',
    action: 'Remove Unknown Node → Zigbee Bastien → Climate Sensor (SNZB-02)',
  },
  'a4:c1:38:f6:3d:2d:c9:79': {
    mfr: '_TZ3000_vsxvaj9i',
    pid: 'TS0043',
    driver: 'button_wireless_3',
    patch: 'P2625',
    status: 'OFF_MESH',
    action: 'Hold any button 5–10s → Zigbee Bastien → Bouton sans fil 3 (NOT Homey Zigbee). Then Flow Button pressed.',
  },
  'a4:c1:38:f7:14:92:cb:c8': {
    mfr: '_TZ3000_ltt60asa',
    pid: 'TS0004',
    driver: 'switch_4gang',
    patch: 'P2634',
    status: 'OK_LIVE',
    action: 'Already OK as Eclairage salon — verify 4 channels',
  },
  'a4:c1:38:a0:cf:8c:0f:7a': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    status: 'OK_LIVE',
    action: 'OK (Sous sol)',
  },
  'a4:c1:38:b2:2c:24:81:b1': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    status: 'OK_LIVE',
    action: 'OK (chambre principal)',
  },
  'a4:c1:38:09:4f:ff:ff:ff': {
    mfr: 'eWeLink',
    pid: 'CK-TLSR8656-SS5-01(7014)',
    driver: 'climate_sensor',
    patch: 'P2622',
    status: 'OK_LIVE',
    action: 'OK (salon/cuisine TH)',
  },
});

/** IEEE seen live as Unknown with no verified interview — never invent mfr+pid. */
const NEED_INTERVIEW_IEEE = Object.freeze([
  'a4:c1:38:e6:74:3a:00:da', // Node 18 2026-09-23 — near TS0042 OUI, identity unknown
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
    .filter(([, v]) => v.status === 'UNKNOWN_LIVE' || v.status === 'OFF_MESH' || v.status === 'STALE_GHOST')
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
