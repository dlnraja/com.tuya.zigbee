'use strict';

/**
 * P2630 — Apply Bastien live interview `_TZ3000_axpdxqgu`+`TS0041`
 * EP1: basic(0)+power(1)+onOff(6); out ota(25)+time(10)
 * NO E000 / NO EF00. ZCL battery 200→100%. RX OnOff 0xFD + raw. Never 0x8004.
 * Z2M: tuya.fz.on_off_action + battery; toZigbee []; configureMagicPacket
 * ZHA: TuyaSmartRemote0041TO signature matches interview exactly
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const INTERVIEW_ENDPOINTS = {
  '1': {
    clusters: [0, 1, 6],
    bindings: [6],
  },
};

function patchCompose() {
  const p = path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json');
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.zigbee = c.zigbee || {};
  c.zigbee.endpoints = INTERVIEW_ENDPOINTS;

  // Ensure sacred couple case forms (P2520 UNION)
  const mfrs = new Set(c.zigbee.manufacturerName || []);
  for (const m of ['_TZ3000_axpdxqgu', '_tz3000_axpdxqgu', '_TZ3000_AXPDXQGU', '_tz3000_AXPDXQGU']) {
    mfrs.add(m);
  }
  c.zigbee.manufacturerName = [...mfrs];
  const pids = new Set(c.zigbee.productId || []);
  pids.add('TS0041');
  c.zigbee.productId = [...pids];

  c.energy = c.energy || { batteries: ['CR2032', 'CR2450'] };
  if (!Array.isArray(c.energy.batteries) || !c.energy.batteries.length) {
    c.energy.batteries = ['CR2032', 'CR2450'];
  }

  // Capabilities: button.1 + battery (interview has ZCL power)
  if (!Array.isArray(c.capabilities) || !c.capabilities.includes('button.1')) {
    c.capabilities = ['button.1', 'measure_battery'];
  }
  if (!c.capabilities.includes('measure_battery')) c.capabilities.push('measure_battery');

  fs.writeFileSync(p, `${JSON.stringify(c, null, 2)}\n`);
  console.log('compose endpoints → interview [0,1,6] bind OnOff');
}

function patchDeviceJs() {
  const p = path.join(ROOT, 'drivers/button_wireless_1/device.js');
  const next = `'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * Button1GangDevice — TS0041 / SH-SC07 class (incl. Bastien \`_TZ3000_axpdxqgu\`).
 *
 * P2285: force buttonCount=1 (phantom EP2–4 on some siblings).
 * P2609: hybrid RX gap-fill.
 * P2630 Bastien live interview \`_TZ3000_axpdxqgu\`+TS0041:
 *   EP1 only: basic(0)+power(1)+onOff(6); out ota(25)+time(10)
 *   NO E000(57344) / NO EF00(61184) — never force EF00 TX; never write 0x8004
 *   ZCL batteryPercentageRemaining=200 → 100% (batteryVoltage=30 → 3.0V)
 *   RX: OnOff mfr 0xFD (single/double/hold) + raw + magic 0xFFDE
 *   Z2M: tuya.fz.on_off_action; ZHA: TuyaSmartRemote0041TO
 */
class Button1GangDevice extends ButtonDevice {

  /**
   * WHY(P2630): interview-shaped sticky — no EF00/E000, skip 0x8004, battery EP1.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    return Object.assign({}, base, {
      batteryEpOnly: 1,
      writeSceneAttr: false,
      skip8004: true,
      usesE000: false,
      noEf00: true,
      protocol: 'zcl_0xfd',
      maxButtons: 1,
      buttonCount: 1,
      zcl200IsPercent: true,
      collapsePhantomEndpoints: true,
      mapAllEndpointsToButton1: true,
    });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.gangCount = 1;

    try {
      const mfr = this.getSetting?.('zb_manufacturer_name')
        || zclNode?.manufacturerName
        || this.getData?.()?.manufacturerName
        || '';
      const pid = this.getSetting?.('zb_model_id')
        || zclNode?.modelId
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'axpdxqgu') || (/TS0041/i.test(String(pid)) && !/TS004F/i.test(String(pid)))) {
        this._bastienTs0041Interview = {
          mfr: containsCI(mfr, 'axpdxqgu') ? '_TZ3000_axpdxqgu' : String(mfr),
          pid: 'TS0041',
          clustersEp1: [0, 1, 6],
          noEf00: true,
          noE000: true,
          ieeeHint: '7c:c6:b6:ff:fe:a3:e1:58',
        };
        this.log('[P2630] TS0041 sticky interview profile (0xFD only, battery EP1, no EF00/E000)');
      }
    } catch (_e) { /* soft */ }

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(\`[INIT] Error: \${err && err.message}\`); } catch (_e) { /* ignore */ }
      });

    try {
      const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
      if (profile?.collapsePhantomEndpoints || profile?.mapAllEndpointsToButton1) {
        this.buttonCount = Number(profile.buttonCount) || 1;
        this.gangCount = this.buttonCount;
      }
    } catch (_e) { /* soft */ }

    // WHY(P2316/P2630): Z2M configureMagicPacket — genBasic 0xFFDE=0x13 ASAP
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch(() => {});
    } catch (_e) { /* soft */ }

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 1,
        tag: 'BUTTON_WIRELESS_1',
        // Interview has no 0xEF00 / no E000 — listen soft-skips; never TX EF00
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_1] hybrid soft-fail:', e.message);
    }

    try {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '');
      if (/mrpevh8p|5bpeda8u|b4awzgct/i.test(mfr) && typeof this.setEnergy === 'function') {
        await this.setEnergy({ batteries: ['CR2450'] }).catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2470 energy lock CR2450 (SH-SC07)');
      }
    } catch (_e) { /* soft */ }

    try {
      if (!this.hasCapability('measure_battery') && typeof this.addCapability === 'function') {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2490 rehydrate measure_battery after strip');
      }
    } catch (_e) { /* soft */ }

    try {
      if (typeof this._ensureBatteryCapabilityUi === 'function') {
        await this._ensureBatteryCapabilityUi().catch(() => {});
      } else if (typeof this.setCapabilityOptions === 'function' && this.hasCapability('measure_battery')) {
        const cur = (typeof this.getCapabilityOptions === 'function' && this.getCapabilityOptions('measure_battery')) || {};
        if (cur.getable === false || cur.preventInsights === true) {
          await this.setCapabilityOptions('measure_battery', {
            ...cur,
            getable: true,
            preventInsights: false,
            units: cur.units || '%',
          }).catch(() => {});
          this.log('[BUTTON_WIRELESS_1] P2499/P2512 restored measure_battery getable/insights');
        }
      }
    } catch (_e) { /* soft */ }

    this.log('[BUTTON_WIRELESS_1] P2630 ready (TS0041 0xFD / battery EP1 / no EF00)');
  }

}

module.exports = Button1GangDevice;
`;
  fs.writeFileSync(p, next);
  console.log('device.js → P2630 interview profile');
}

function patchDriverJs() {
  const p = path.join(ROOT, 'drivers/button_wireless_1/driver.js');
  const next = `'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { shouldRunForDeviceAndButton } = require('../../lib/FlowCardHelper');

/**
 * Button 1-Gang Driver — flow IDs must match driver.flow.compose.json
 * WHY(P2630): never require args.device on device triggers (Homey omits it).
 */
class Button1GangDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Button1GangDriver P2630 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const mainTriggers = [
      'button_wireless_1_button_1gang_button_pressed',
      'button_wireless_1_button_1gang_button_double_press',
      'button_wireless_1_button_1gang_button_long_press',
      'button_wireless_1_button_1gang_button_multi_press',
    ];
    const button1Triggers = [
      'button_wireless_1_button_1gang_button_1_pressed',
      'button_wireless_1_button_1gang_button_1_double',
      'button_wireless_1_button_1gang_button_1_long',
      'button_wireless_1_button_1gang_button_1_triple',
      'button_wireless_1_button_1gang_button_1_release',
    ];
    const extras = [
      'button_wireless_1_battery_low',
      'button_wireless_1_button_1gang_button_scene_recall',
    ];

    for (const triggerId of [...mainTriggers, ...button1Triggers, ...extras]) {
      try {
        const card = this._getFlowCard(triggerId, 'trigger');
        if (!card) continue;
        card.registerRunListener(async (args = {}, state = {}) => shouldRunForDeviceAndButton(args, state));
        this.log(\`[FLOW] Registered: \${triggerId}\`);
      } catch (e) {
        this.log(\`[FLOW] \${triggerId} not available: \${e.message}\`);
      }
    }
  }
}

module.exports = Button1GangDriver;
`;
  fs.writeFileSync(p, next);
  console.log('driver.js → P2630 flow listeners (no args.device gate)');
}

function patchFlowHelper() {
  const p = path.join(ROOT, 'lib/FlowCardHelper.js');
  let src = fs.readFileSync(p, 'utf8');
  const bad = /registerDeviceTrigger\(driver, buttonTriggerId, async \(args = \{\}\) => !!args\.device\);/;
  if (bad.test(src)) {
    src = src.replace(bad, 'registerDeviceTrigger(driver, buttonTriggerId, shouldRunForDeviceAndButton);');
  }
  src = src.replace(
    /registerDeviceTrigger\(driver, batteryTriggerId, async \(args = \{\}\) => !!args\.device\);/g,
    'registerDeviceTrigger(driver, batteryTriggerId, shouldRunForDeviceAndButton);',
  );
  src = src.replace(
    /registerDeviceTrigger\(driver, sceneId, async \(args = \{\}\) => !!args\.device\);/g,
    'registerDeviceTrigger(driver, sceneId, shouldRunForDeviceAndButton);',
  );
  if (!src.includes('P2630')) {
    src = src.replace(
      'WHY(P2628): Homey device trigger cards are already device-scoped',
      'WHY(P2628/P2630): Homey device trigger cards are already device-scoped',
    );
  }
  fs.writeFileSync(p, src);
  console.log('FlowCardHelper → drop !!args.device gates');
}

function patchHybridSkipEf00() {
  const p = path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js');
  let src = fs.readFileSync(p, 'utf8');
  if (!src.includes('skipEf00Tx')) {
    // Document opt; listen already soft-skips when cluster absent
    src = src.replace(
      'async function installWallSceneRemoteHybrid(device, zclNode, opts = {}) {',
      `async function installWallSceneRemoteHybrid(device, zclNode, opts = {}) {
  // WHY(P2629/P2630): opts.skipEf00Tx — interview has no 61184; never queue EF00 TX
  if (opts.skipEf00Tx) {
    try { device._skipEf00Tx = true; device._noEf00 = true; } catch (_e) { /* soft */ }
  }
`,
    );
    fs.writeFileSync(p, src);
    console.log('WallSceneRemoteHybridInit → skipEf00Tx flag');
  } else {
    console.log('WallSceneRemoteHybridInit already skipEf00Tx');
  }
}

function enrichDocs() {
  const couplePath = path.join(ROOT, 'docs/knowledge/profiles/couples/_TZ3000_axpdxqgu_TS0041.md');
  fs.mkdirSync(path.dirname(couplePath), { recursive: true });
  fs.writeFileSync(couplePath, `# \`_TZ3000_axpdxqgu\` + \`TS0041\` (P2630)

Bastien live Homey interview (ieee \`7c:c6:b6:ff:fe:a3:e1:58\`).

## Identity
- manufacturerName: \`_TZ3000_axpdxqgu\`
- productId / modelId: \`TS0041\`
- driver: \`button_wireless_1\` (NOT \`remote_button_wireless_wall\`)

## Clusters (interview)
| EP | input | output |
|----|-------|--------|
| 1 | basic(0), power(1), onOff(6) | ota(25), time(10) |

- **No** E000 (57344), **no** EF00 (61184), **no** IAS, **no** groups/scenes
- Sleepy enddevice, battery, receiveWhenIdle=false
- batteryVoltage=30 (3.0V), batteryPercentageRemaining=200 → **100%** (ZCL 0–200)

## RX / TX
| Path | Role |
|------|------|
| OnOff mfr cmd **0xFD** | primary press (0=single, 1=double, 2=hold) |
| raw wrapHandleFrame | catcher |
| magic genBasic **0xFFDE=0x13** | Z2M configureMagicPacket (TX once on pair/wake) |
| **Forbidden** | genOnOff **0x8004**, EF00 TX, E000 bind storm |

## Flows
- \`button_wireless_1_button_1gang_button_pressed\` (+ double / long / multi)
- \`button_wireless_1_button_1gang_button_1_pressed\` (+ double / long / triple / release)
- \`button_wireless_1_battery_low\`
- Run listeners must **not** require \`args.device\`

## Cross-ref
- Z2M TS0041: \`tuya.fz.on_off_action\` + battery; toZigbee []
- ZHA \`TuyaSmartRemote0041TO\`: signature \`[0,1,6]/[25,10]\` — exact match
- Z2M issues #28038 #25720 (axpdxqgu action events)
`);
  console.log('couple profile written');

  const ts = path.join(ROOT, 'docs/knowledge/TS004X_BATTERY_REMOTES.md');
  if (fs.existsSync(ts)) {
    let md = fs.readFileSync(ts, 'utf8');
    if (!md.includes('axpdxqgu')) {
      md += `\n\n## Bastien live — \`_TZ3000_axpdxqgu\`+TS0041 (P2630)\n\nEP1 only \`[0,1,6]\` / out \`[25,10]\`. No E000/EF00. Battery ZCL 200→100%. RX 0xFD. Driver \`button_wireless_1\`. Re-pair after tip.\n`;
      fs.writeFileSync(ts, md);
      console.log('TS004X doc enriched');
    }
  }
}

function enrichSsotRegistry() {
  const ssotPath = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
  if (fs.existsSync(ssotPath)) {
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    const inv = ssot.devicesInventory || [];
    const idx = inv.findIndex((d) => /axpdxqgu/i.test(String(d.mfr || '')) && d.pid === 'TS0041');
    const entry = {
      mfr: '_TZ3000_axpdxqgu',
      pid: 'TS0041',
      driver: 'button_wireless_1',
      source: 'live-homey-interview-P2630',
      status: 'live-house',
      enrichedAt: '2026-09-20',
      ieee: '7c:c6:b6:ff:fe:a3:e1:58',
      interview: {
        ep1Clusters: [0, 1, 6],
        ep1Out: [25, 10],
        noEf00: true,
        noE000: true,
        batteryZcl200: true,
        rx: 'onOff_0xFD',
        forbidTx: ['0x8004', 'EF00'],
      },
      note: 'P2630 interview lock — update tip then remove+re-pair',
    };
    if (idx >= 0) inv[idx] = { ...inv[idx], ...entry };
    else inv.push(entry);
    ssot.devicesInventory = inv;
    ssot.p2630 = {
      couple: '_TZ3000_axpdxqgu+TS0041',
      driver: 'button_wireless_1',
      tipNote: '1.0.17+ interview clusters + flow args.device fix',
    };
    fs.writeFileSync(ssotPath, `${JSON.stringify(ssot, null, 2)}\n`);
    console.log('bastien SSOT interview locked');
  }

  const regPath = path.join(ROOT, 'data/user-misattribution-registry.json');
  if (fs.existsSync(regPath)) {
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    reg.cases = reg.cases || [];
    const id = 'p2630-axpdxqgu-ts0041-interview-clusters';
    const existing = reg.cases.findIndex((c) => c && c.id === id);
    const caseEntry = {
      id,
      manufacturerName: ['_TZ3000_axpdxqgu', '_tz3000_axpdxqgu'],
      productId: ['TS0041'],
      canonicalDriver: 'button_wireless_1',
      forbidDrivers: ['remote_button_wireless_wall', 'switch_1gang', 'virtualdriverzigbee'],
      forbidMode: 'couple',
      notes: 'P2630 live interview EP1 [0,1,6] no EF00/E000; ZCL battery 200; RX 0xFD; never 0x8004',
      enrichedAt: '2026-09-20',
    };
    if (existing >= 0) reg.cases[existing] = { ...reg.cases[existing], ...caseEntry };
    else reg.cases.push(caseEntry);
    fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);
    console.log('registry interview entry');
  }
}

function main() {
  patchCompose();
  patchDeviceJs();
  patchDriverJs();
  patchFlowHelper();
  patchHybridSkipEf00();
  enrichDocs();
  enrichSsotRegistry();
  console.log('P2630 apply done');
}

main();
