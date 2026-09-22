'use strict';

/**
 * P2667 — Bastien Developer Tools "Unknown Node" IEEE → sacred couple map
 *
 * Homey Zigbee tools show Unknown when interview lost mfr/pid but the IEEE
 * was previously live-interviewed. Never invent new couples — only SSOT.
 *
 * Contre quoi (Bastien live 2026-09-21 dump):
 * - 7c:c6:b6:ff:fe:a3:e1:58 → axpdxqgu+TS0041 (P2630)
 * - a4:c1:38:bb:8f:37:ee:17 → dzwgk7e2+TS0042 (P2636)
 */

const IEEE_COUPLES = Object.freeze({
  '7c:c6:b6:ff:fe:a3:e1:58': {
    mfr: '_TZ3000_axpdxqgu',
    pid: 'TS0041',
    driver: 'button_wireless_1',
    patch: 'P2630',
    action: 'Remove Unknown Node → Apps → Zigbee Bastien → Wireless Button 1 (wake-tap while pairing)',
  },
  'a4:c1:38:bb:8f:37:ee:17': {
    mfr: '_TZ3000_dzwgk7e2',
    pid: 'TS0042',
    driver: 'button_wireless_2',
    patch: 'P2636',
    action: 'Remove Unknown Node → Zigbee Bastien → Wireless Button 2 (NOT Homey Zigbee / Appareil Zigbee)',
  },
  'a4:c1:38:f6:3d:2d:c9:79': {
    mfr: '_TZ3000_vsxvaj9i',
    pid: 'TS0043',
    driver: 'button_wireless_3',
    patch: 'P2625',
    action: 'Delete Homey Virtual tile → Zigbee Bastien → 3-Button Wireless',
  },
  'a4:c1:38:f7:14:92:cb:c8': {
    mfr: '_TZ3000_ltt60asa',
    pid: 'TS0004',
    driver: 'switch_4gang',
    patch: 'P2634',
    action: 'Delete Homey Virtual → Zigbee Bastien → 4-gang switch',
  },
  'a4:c1:38:a0:cf:8c:0f:7a': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    action: 'Delete Homey Virtual → Zigbee Bastien → Climate Sensor',
  },
  'a4:c1:38:b2:2c:24:81:b1': {
    mfr: '_TZ3000_fllyghyj',
    pid: 'SNZB-02',
    driver: 'climate_sensor',
    patch: 'P2666',
    action: 'Delete Homey Virtual → Zigbee Bastien → Climate Sensor',
  },
  'a4:c1:38:09:4f:ff:ff:ff': {
    mfr: 'eWeLink',
    pid: 'CK-TLSR8656-SS5-01(7014)',
    driver: 'climate_sensor',
    patch: 'P2622',
    action: 'Delete Homey Virtual → Zigbee Bastien → Climate Sensor',
  },
});

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
  // tolerate missing colons
  const compact = key.replace(/:/g, '');
  for (const [k, v] of Object.entries(IEEE_COUPLES)) {
    if (k.replace(/:/g, '') === compact) return { ieee: k, ...v };
  }
  return null;
}

function listUnknownNodeActions() {
  return Object.entries(IEEE_COUPLES)
    .filter(([, v]) => /button_wireless_[12]/.test(v.driver))
    .map(([ieee, v]) => ({ ieee, ...v }));
}

module.exports = {
  IEEE_COUPLES,
  normIeee,
  lookupBastienIeee,
  listUnknownNodeActions,
};
