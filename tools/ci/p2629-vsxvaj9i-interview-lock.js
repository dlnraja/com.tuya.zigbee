'use strict';

/**
 * P2629 — Apply Bastien live interview `_TZ3000_vsxvaj9i`+`TS0043`
 * Clusters EP1: basic+power+onOff+E000; EP2–4: power+onOff; no EF00.
 * Battery EP1 only (ZCL 200→100%); RX 0xFD/E000/raw; never 0x8004 TX.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const INTERVIEW_ENDPOINTS = {
  '1': {
    // Interview inputClusters: 0,1,6,57344 (0xE000) — no groups/scenes/multistate/EF00
    clusters: [0, 1, 6, 57344],
    bindings: [6],
  },
  '2': {
    clusters: [1, 6],
    bindings: [6],
  },
  '3': {
    clusters: [1, 6],
    bindings: [6],
  },
  '4': {
    // Phantom 4th OnOff EP (common TS0043) — present for match, no bind storm
    clusters: [1, 6],
  },
};

function patchCompose() {
  const p = path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json');
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.zigbee = c.zigbee || {};
  c.zigbee.endpoints = INTERVIEW_ENDPOINTS;
  // WHY(P2629): sleepy CR2032 — never energy.approximation with measure_power
  c.energy = c.energy || { batteries: ['CR2032', 'CR2450'] };
  if (!Array.isArray(c.energy.batteries) || !c.energy.batteries.length) {
    c.energy.batteries = ['CR2032', 'CR2450'];
  }
  fs.writeFileSync(p, `${JSON.stringify(c, null, 2)}\n`);
  console.log('compose endpoints → interview shape');
}

function patchDeviceJs() {
  const p = path.join(ROOT, 'drivers/button_wireless_3/device.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes('P2629')) {
    console.log('device.js already P2629');
    return;
  }
  const next = `'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * Button3GangDevice — battery wall scene remote (TS0043 / Zemismart / Moes / Lonsonho)
 *
 * P2608: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 DP + raw).
 * P2629 Bastien live interview \`_TZ3000_vsxvaj9i\`+TS0043:
 *   EP1: basic(0)+power(1)+onOff(6)+E000(57344); out ota(25)+time(10)
 *   EP2–4: onOff+power (phantom battery 0 junk — use EP1 only)
 *   NO cluster EF00/61184 — never force EF00 TX; never write 0x8004
 *   ZCL batteryPercentageRemaining=200 → 100%
 */
class Button3GangDevice extends ButtonDevice {

  /**
   * WHY(P2629): profile drives batteryEpOnly + skip 0x8004 for all TS0043 stickies.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    return Object.assign({}, base, {
      batteryEpOnly: 1,
      writeSceneAttr: false,
      usesE000: true,
      noEf00: true,
      protocol: 'zcl_0xfd_e000',
      maxButtons: 3,
      zcl200IsPercent: true,
    });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    // Lock live couple for diags / charter
    try {
      const mfr = this.getSetting?.('zb_manufacturer_name')
        || zclNode?.manufacturerName
        || this.getData?.()?.manufacturerName
        || '';
      const pid = this.getSetting?.('zb_model_id')
        || zclNode?.modelId
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'vsxvaj9i') || /TS0043/i.test(String(pid))) {
        this._bastienTs0043Interview = {
          mfr: '_TZ3000_vsxvaj9i',
          pid: 'TS0043',
          clustersEp1: [0, 1, 6, 57344],
          noEf00: true,
          ieeeHint: 'a4:c1:38:f6:3d:2d:c9:79',
        };
        this.log('[P2629] TS0043 sticky interview profile (0xFD/E000, battery EP1, no EF00)');
      }
    } catch (_e) { /* soft */ }

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(\`[INIT] Error: \${err && err.message}\`); } catch (_e) { /* ignore */ }
      });

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
        // Interview has no 0xEF00 — listen soft-skips; never TX EF00
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] hybrid soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_3] hybrid wall remote ready (TS0043 class / P2629)');
  }

}

module.exports = Button3GangDevice;
`;
  fs.writeFileSync(p, next);
  console.log('device.js rewritten P2629');
}

function enrichDocs() {
  const pec = path.join(ROOT, 'docs/knowledge/TS004X_BATTERY_REMOTES.md');
  if (fs.existsSync(pec)) {
    let md = fs.readFileSync(pec, 'utf8');
    if (!md.includes('vsxvaj9i interview')) {
      const block = `
## Live interview — \`_TZ3000_vsxvaj9i\`+TS0043 (P2629 Bastien)

| Field | Value |
|-------|--------|
| IEEE | \`a4:c1:38:f6:3d:2d:c9:79\` |
| Type | enddevice, receiveWhenIdle=false (sleepy) |
| EP1 in | basic(0), power(1), onOff(6), **E000(57344)** |
| EP1 out | ota(25), time(10) |
| EP2–4 in | onOff(6), power(1) — phantom battery 0 |
| EF00 | **absent** — no DP path |
| Battery | EP1 \`batteryPercentageRemaining=200\` → 100%; voltage 30 (=3.0 V) |
| RX | OnOff mfr **0xFD** per EP1–3 + E000/raw parallel |
| TX forbid | genOnOff **0x8004**, EF00 writes, battery configure storm |

`;
      md = md.replace(
        '| `_TZ3000_vsxvaj9i` + **TS0043** | `button_wireless_3` | Bastien flat 3-btn enddevice — P2625 UX button.1–3 |',
        '| `_TZ3000_vsxvaj9i` + **TS0043** | `button_wireless_3` | Bastien live interview P2629 — 0xFD/E000, no EF00 |',
      );
      if (!md.includes('## Live interview — `_TZ3000_vsxvaj9i`')) {
        md += block;
      }
      fs.writeFileSync(pec, md);
      console.log('TS004X doc enriched');
    }
  }

  const profileDir = path.join(ROOT, 'docs/knowledge/profiles/couples');
  if (fs.existsSync(profileDir)) {
    const pf = path.join(profileDir, '_TZ3000_vsxvaj9i_TS0043.md');
    fs.writeFileSync(pf, `# Couple profile — \`_TZ3000_vsxvaj9i+TS0043\`

- **Driver:** \`button_wireless_3\`
- **Protocol:** ZCL OnOff 0xFD + E000 (no EF00)
- **Source:** Bastien Homey interview 2026-09-20 (IEEE a4:c1:38:f6:3d:2d:c9:79)
- **Endpoints:** EP1 [0,1,6,57344]; EP2–4 [1,6]; sleepy enddevice
- **Battery:** EP1 only; ZCL 0–200 (\`200\`→100%)
- **Flows:** dropdown Button 1–3 same page (P2628)
- **Contre quoi:** \`npm run check:p2629\`
`);
    console.log('couple profile written');
  }
}

function enrichSsot() {
  const p = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
  if (!fs.existsSync(p)) return;
  const ssot = JSON.parse(fs.readFileSync(p, 'utf8'));
  const inv = ssot.devicesInventory || [];
  const i = inv.findIndex((e) => /vsxvaj9i/i.test(String(e.mfr || '')));
  const entry = {
    mfr: '_TZ3000_vsxvaj9i',
    pid: 'TS0043',
    driver: 'button_wireless_3',
    source: 'live-interview-2026-09-20',
    status: 'live-house',
    ieee: 'a4:c1:38:f6:3d:2d:c9:79',
    interview: {
      deviceType: 'enddevice',
      receiveWhenIdle: false,
      ep1: { in: [0, 1, 6, 57344], out: [25, 10] },
      ep2: { in: [1, 6] },
      ep3: { in: [1, 6] },
      ep4: { in: [1, 6], note: 'phantom' },
      noEf00: true,
      batteryEp: 1,
      batteryPctRaw: 200,
      batteryVoltageRaw: 30,
      appVersion: 68,
      rx: ['onOff_0xFD', 'E000', 'raw'],
      txForbid: ['0x8004', 'EF00'],
    },
    enrichedAt: '2026-09-20',
  };
  if (i >= 0) inv[i] = Object.assign({}, inv[i], entry);
  else inv.push(entry);
  ssot.devicesInventory = inv;
  fs.writeFileSync(p, `${JSON.stringify(ssot, null, 2)}\n`);
  console.log('bastien SSOT interview locked');
}

function enrichRegistry() {
  const p = path.join(ROOT, 'data/user-misattribution-registry.json');
  const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
  reg.entries = reg.entries || {};
  reg.entries['p2629-tz3000_vsxvaj9i-ts0043-interview'] = {
    id: 'p2629-tz3000_vsxvaj9i-ts0043-interview',
    manufacturerName: '_TZ3000_vsxvaj9i',
    productId: 'TS0043',
    canonicalDriver: 'button_wireless_3',
    forbidMode: 'couple',
    forbidDrivers: [
      'virtualdriverzigbee',
      'remote_button_wireless_wall',
      'button_wireless_1',
      'button_wireless_4',
      'switch_3gang',
      'scene_switch_3',
    ],
    interview: {
      clustersEp1: [0, 1, 6, 57344],
      noEf00: true,
      ieee: 'a4:c1:38:f6:3d:2d:c9:79',
    },
    note: 'P2629 live interview — ZCL 0xFD/E000 sticky 3-btn, battery EP1',
    source: 'bastien-homey-interview',
    updated: '2026-09-20',
  };
  fs.writeFileSync(p, `${JSON.stringify(reg, null, 2)}\n`);
  console.log('registry interview entry');
}

patchCompose();
patchDeviceJs();
enrichDocs();
enrichSsot();
enrichRegistry();
console.log('P2629 apply done');
