'use strict';

/**
 * P2438 — Multi-source harvest mocks (GH issues / diags / forum / CI)
 * Completes local solver + AI forfait skip without remote calls.
 */

const OPEN_ISSUE_FIXTURES = [
  {
    number: 540,
    title: '[Device Support Request] _TZ3000_blhvsaqf / TS0001 mapped to virtualdriverzigbee',
    body: 'Manufacturer Name: `_TZ3000_blhvsaqf` Product ID: `TS0001` virtualdriverzigbee',
  },
  {
    number: 541,
    title: '[Device Support] TS0004 / _TZ3000_enmfaave not matching in switch_4gang',
    body: 'switch_4gang TS0004 (_TZ3000_enmfaave) cluster endpoints pairing',
  },
  {
    number: 542,
    title: '[Device Support] TS0012 / _TZ3000_xk5udnd6 not recognized in wall_switch_2gang_1way',
    body: '_TZ3000_xk5udnd6 TS0012 wall_switch_2gang_1way',
  },
  {
    number: 543,
    title: '[Device Support] Add support for Tuya 2-gang switch _TZ3000_ptjcjise / TS0002',
    body: '_TZ3000_ptjcjise TS0002',
  },
  {
    number: 544,
    title: '[Device Support] Fingerprint issue for Tuya 2-gang switch (_TZ3000_l9brjwau / TS0002)',
    body: '_TZ3000_l9brjwau TS0002',
  },
  {
    number: 533,
    title: 'Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]',
    body: 'manufacturerName: "_TZE204_5slehgeo" modelId: "TS0601" Detected as radiator valve',
  },
];

const DIAG_CRASH_FIXTURE = `
Homey app com.dlnraja.tuya.zigbee
Error: Invalid Driver ID
manufacturerName=_TZ3000_blhvsaqf modelId=TS0001
`;

const FORUM_SHADOW_FIXTURE = {
  topic: 140352,
  excerpt: 'Moes curtain _TZE204_5slehgeo TS0601 still as radiator — need update',
};

function mockGmailDiagBundle() {
  return {
    diagnostics: [
      { date: '2026-09-10', type: 'crash', fps: { mfr: ['_TZ3000_enmfaave'] }, stderr: 'pairing failed switch_4gang' },
      { date: '2026-09-10', type: 'diag', fps: { mfr: ['_TZE204_5slehgeo'] }, stdout: 'TS0601 curtain' },
    ],
  };
}

module.exports = {
  OPEN_ISSUE_FIXTURES,
  DIAG_CRASH_FIXTURE,
  FORUM_SHADOW_FIXTURE,
  mockGmailDiagBundle,
};
