'use strict';

/**
 * P2631 — Bastien live mesh completion from Homey Zigbee nodes table
 *
 * Nodes (Bastien house):
 * 0 Homey Pro coordinator
 * 1–2 NodOn SIN-4-FP-21 — EXTERNAL (com.nodon) — do not absorb
 * 3 _TZ3000_axpdxqgu+TS0041 → button_wireless_1 (still shows remote-wall name until re-pair)
 * 4 eWeLink+CK-TLSR8656-SS5-01(7014) → climate_sensor TH (Z2M; NOT button 7000)
 * 5 _TZ3000_vsxvaj9i+TS0043 → button_wireless_3
 *
 * Contre quoi: PID-only bleed of 7014 into plug/curtain/soil steals or leaves "Appareil Zigbee".
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PID_7014 = 'CK-TLSR8656-SS5-01(7014)';
const PID_7014_SIB = 'CK-TLSR8656-SS5-02(7014)';
const CANONICAL_CLIMATE = 'climate_sensor';

function pruneWrong7014() {
  const driversDir = path.join(ROOT, 'drivers');
  let pruned = 0;
  for (const id of fs.readdirSync(driversDir)) {
    if (id === CANONICAL_CLIMATE) continue;
    const p = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!c.zigbee?.productId) continue;
    const before = c.zigbee.productId.length;
    c.zigbee.productId = c.zigbee.productId.filter(
      (x) => !/CK-TLSR8656-SS5-0[12]\(7014\)/i.test(String(x)),
    );
    if (c.zigbee.productId.length !== before) {
      fs.writeFileSync(p, `${JSON.stringify(c, null, 2)}\n`);
      console.log(`pruned 7014 from ${id} (${before}→${c.zigbee.productId.length})`);
      pruned += 1;
    }
  }
  console.log(`prune done (${pruned} drivers)`);
}

function patchClimateDevice() {
  const p = path.join(ROOT, 'drivers/climate_sensor/device.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('P2631')) {
    console.log('climate device.js already P2631');
    return;
  }

  // Insert getDeviceProfile + eWeLink strip button.1 after class open
  if (!src.includes('getDeviceProfile()')) {
    src = src.replace(
      'class ClimateSensorDevice extends UnifiedSensorBase {\n\n  async onNodeInit({ zclNode }) {',
      `class ClimateSensorDevice extends UnifiedSensorBase {

  /**
   * WHY(P2631): Bastien eWeLink CK-TLSR8656-SS5-01(7014) is ZCL TH only
   * (clusters 0/1/3/4/32/1026/1029/FC11) — never EF00 TX, never phantom button.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    let mfr = '';
    let pid = '';
    try {
      mfr = this._manufacturerName?.() || this.getSetting?.('zb_manufacturer_name') || '';
      pid = this.getSetting?.('zb_model_id') || this.getData?.()?.productId || '';
    } catch (_e) { /* soft */ }
    const eweTh = /ewelink/i.test(String(mfr)) || /CK-TLSR8656-SS5-0[12]\\(7014\\)/i.test(String(pid));
    if (!eweTh) return base;
    return Object.assign({}, base, {
      noEf00: true,
      skipEf00Tx: true,
      protocol: 'zcl_th',
      zclClusters: [0, 1, 3, 4, 32, 1026, 1029, 64529],
      stripPhantomButton: true,
    });
  }

  async onNodeInit({ zclNode }) {`,
    );
  }

  // After eWeLink log block, strip phantom button.1
  if (!src.includes('P2631 strip phantom button')) {
    src = src.replace(
      "this.log(`[CLIMATE-EWELINK] couple mfr=${mfr || '?'} pid=${pid || '?'} (ZCL 0x0402/0x0405/0x0001 sleepy; never socket)`);",
      `this.log(\`[CLIMATE-EWELINK] couple mfr=\${mfr || '?'} pid=\${pid || '?'} (ZCL 0x0402/0x0405/0x0001 sleepy; never socket)\`);
        // WHY(P2631): compose historically had button.1 — strip on eWeLink TH
        try {
          if (this.hasCapability?.('button.1')) {
            await this.removeCapability('button.1').catch(() => {});
            this.log('[CLIMATE-EWELINK] P2631 strip phantom button.1');
          }
          this._skipEf00Tx = true;
          this._noEf00 = true;
        } catch (_e2) { /* soft */ }`,
    );
  }

  // Mark P2631 in header
  src = src.replace(
    ' * Climate Sensor Device - v8.0.0 MODERNIZED',
    ' * Climate Sensor Device - v8.0.0 MODERNIZED + P2631 Bastien eWeLink TH',
  );

  fs.writeFileSync(p, src);
  console.log('climate device.js → P2631 eWeLink profile');
}

function patchButtonNames() {
  // Clearer FR names so re-pair is obvious vs remote wall
  const bw1 = path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json');
  const c1 = JSON.parse(fs.readFileSync(bw1, 'utf8'));
  c1.name = c1.name || {};
  c1.name.fr = 'Bouton sans fil 1 (TS0041)';
  c1.name.en = 'Wireless Button 1 (TS0041)';
  if (c1.zigbee?.learnmode?.instruction) {
    c1.zigbee.learnmode.instruction.fr =
      'Maintenez 5–10 s jusqu\'au clignotement LED. Doit apparaître comme « Bouton sans fil 1 (TS0041) » — PAS « mural à distance ». Puis Flow → Bouton appuyé.';
    c1.zigbee.learnmode.instruction.en =
      'Hold 5–10s until LED blinks. Must appear as Wireless Button 1 (TS0041) — NOT remote wall. Then Flow → Button pressed.';
  }
  fs.writeFileSync(bw1, `${JSON.stringify(c1, null, 2)}\n`);

  const bw3 = path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json');
  const c3 = JSON.parse(fs.readFileSync(bw3, 'utf8'));
  c3.name = c3.name || {};
  c3.name.fr = 'Bouton sans fil 3 (TS0043)';
  c3.name.en = 'Wireless Button 3 (TS0043)';
  fs.writeFileSync(bw3, `${JSON.stringify(c3, null, 2)}\n`);
  console.log('button names clarified (FR/EN)');
}

function enrichSsotRegistry() {
  const ssotPath = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
  const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));

  ssot.liveMesh = {
    capturedAt: '2026-09-20',
    source: 'Homey Zigbee nodes table',
    nodes: [
      {
        nwk: 0,
        name: 'Homey Pro de Bastien',
        ieee: 'b0:c7:de:ff:fe:56:51:0b',
        role: 'coordinator',
        mfr: 'Athom B.V.',
        pid: 'Homey Pro',
        app: 'system',
      },
      {
        nwk: 1,
        name: 'Radiateur Salon',
        ieee: '0c:2a:6f:ff:fe:dd:4e:5b',
        role: 'router',
        mfr: 'NodOn',
        pid: 'SIN-4-FP-21',
        app: 'EXTERNAL_com.nodon',
        note: 'Fil pilote — never absorb into Bastien',
      },
      {
        nwk: 2,
        name: 'Radiateur Cuisine',
        ieee: '0c:2a:6f:ff:fe:dd:4e:9f',
        role: 'router',
        mfr: 'NodOn',
        pid: 'SIN-4-FP-21',
        app: 'EXTERNAL_com.nodon',
      },
      {
        nwk: 3,
        name: 'Bouton mural sans fil à distance',
        ieee: '7c:c6:b6:ff:fe:a3:e1:58',
        role: 'enddevice',
        mfr: '_TZ3000_axpdxqgu',
        pid: 'TS0041',
        driver: 'button_wireless_1',
        status: 'STALE_NAME_NEED_REPAIR',
        note: 'UI name still remote_wall until remove+re-pair on tip ≥1.0.17',
        interview: { ep1: [0, 1, 6], out: [25, 10], rx: '0xFD', noEf00: true },
      },
      {
        nwk: 4,
        name: 'Appareil Zigbee',
        ieee: 'a4:c1:38:09:4f:ff:ff:ff',
        role: 'enddevice',
        mfr: 'eWeLink',
        pid: 'CK-TLSR8656-SS5-01(7014)',
        driver: 'climate_sensor',
        status: 'NEED_REPAIR_FROM_GENERIC',
        note: 'Z2M TH sensor (not 7000 button). Was generic Appareil Zigbee — prune PID bleed + re-pair',
        z2m: 'temperature+humidity+battery+voltage',
        clusters: [0, 1, 3, 4, 32, 1026, 1029, 64529],
      },
      {
        nwk: 5,
        name: '3 bouton 1',
        ieee: 'a4:c1:38:f6:3d:2d:c9:79',
        role: 'enddevice',
        mfr: '_TZ3000_vsxvaj9i',
        pid: 'TS0043',
        driver: 'button_wireless_3',
        status: 'OK_VERIFY_FLOWS',
        interview: { ep1: [0, 1, 6, 57344], rx: '0xFD+E000', noEf00: true },
      },
    ],
  };

  ssot.p2631 = {
    tipNote: '1.0.18+ mesh lock: prune 7014 bleed, eWeLink climate, clear button names',
    rePairRequired: [
      '_TZ3000_axpdxqgu+TS0041',
      'eWeLink+CK-TLSR8656-SS5-01(7014)',
    ],
  };

  // Update inventory eWeLink entry
  const inv = ssot.devicesInventory || [];
  const eIdx = inv.findIndex((d) => /ewelink/i.test(String(d.mfr || '')) && /7014/.test(String(d.pid || '')));
  const eEntry = {
    mfr: 'eWeLink',
    pid: 'CK-TLSR8656-SS5-01(7014)',
    driver: 'climate_sensor',
    source: 'live-mesh-P2631',
    status: 'live-house',
    ieee: 'a4:c1:38:09:4f:ff:ff:ff',
    enrichedAt: '2026-09-20',
    note: 'TH sensor Z2M — re-pair from Appareil Zigbee; never button 7000',
    protocol: 'zcl_th',
    noEf00: true,
  };
  if (eIdx >= 0) inv[eIdx] = { ...inv[eIdx], ...eEntry };
  else inv.push(eEntry);
  ssot.devicesInventory = inv;

  fs.writeFileSync(ssotPath, `${JSON.stringify(ssot, null, 2)}\n`);
  console.log('SSOT liveMesh written');

  const regPath = path.join(ROOT, 'data/user-misattribution-registry.json');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  reg.cases = reg.cases || [];
  const id = 'p2631-ewelink-7014-climate-only-mesh';
  const entry = {
    id,
    manufacturerName: ['eWeLink', 'ewelink', 'EWELINK'],
    productId: [PID_7014, PID_7014_SIB],
    canonicalDriver: 'climate_sensor',
    forbidDrivers: [
      'button_wireless_1',
      'button_wireless',
      'button_wireless_plug',
      'remote_button_wireless_wall',
      'device_plug_smart',
      'curtain_motor_shutter',
      'presence_sensor_radar',
      'soil_sensor',
      'doorwindowsensor_4',
      'sensor_motion_presence',
      'sensor_climate_temphumidsensor',
      'temphumidsensor',
      'temphumidsensor5',
      'climate_sensor_energy',
      'virtualdriverzigbee',
    ],
    forbidMode: 'couple',
    notes: 'P2631 Bastien mesh: 7014 is Z2M TH sensor. Prune PID-only bleed. Re-pair from Appareil Zigbee.',
    enrichedAt: '2026-09-20',
  };
  const i = reg.cases.findIndex((c) => c && c.id === id);
  if (i >= 0) reg.cases[i] = { ...reg.cases[i], ...entry };
  else reg.cases.push(entry);
  fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);
  console.log('registry P2631');

  const couplePath = path.join(ROOT, 'docs/knowledge/profiles/couples/eWeLink_CK-TLSR8656-SS5-01_7014.md');
  fs.mkdirSync(path.dirname(couplePath), { recursive: true });
  fs.writeFileSync(
    couplePath,
    `# eWeLink + \`CK-TLSR8656-SS5-01(7014)\` (P2631)

Bastien mesh ieee \`a4:c1:38:09:4f:ff:ff:ff\` — showed as **Appareil Zigbee**.

## Identity
- manufacturerName: \`eWeLink\`
- productId: \`CK-TLSR8656-SS5-01(7014)\`
- driver: \`climate_sensor\` only
- NOT the wireless button \`CK-TLSR8656-SS5-01(7000)\`

## Z2M
Temperature + humidity + battery + voltage (ZCL).

## Clusters (Hubitat / P2622)
\`[0, 1, 3, 4, 32, 1026, 1029, FC11/64529]\` — no EF00 TX.

## Action
Update Bastien tip → remove generic device → re-pair as Capteur Climatique.
`,
  );
  console.log('couple doc written');
}

function main() {
  pruneWrong7014();
  patchClimateDevice();
  patchButtonNames();
  enrichSsotRegistry();
  console.log('P2631 apply done');
}

main();
