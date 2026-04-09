/**
 * Project Rules + Architecture - Condensed context for AI automation
 * Sources: ARCHITECTURE.md, CRITICAL_MISTAKES.md, DEVELOPMENT_RULES.md, Windsurf workflows, memory rules
 */
const fs = require('fs');
const path = require('path');

// Load .windsurfrules + docs/rules/*.md for comprehensive AI context
let LOADED_RULES = '';
try {
  const rulesDir = path.join(__dirname, '../../docs/rules');
  const wsRulesPath = path.join(__dirname, '../../.windsurfrules');
  const parts = [];
  // Load .windsurfrules (primary condensed rules)
  if (fs.existsSync(wsRulesPath)) {
    const ws = fs.readFileSync(wsRulesPath, 'utf8');
    // Take first 3000 chars (critical bugs, patterns, DP protocol, fingerprint rules)
    parts.push('### .windsurfrules (condensed)\n' + ws.substring(0, 3000));
  }
  // Load docs/rules/*.md
  if (fs.existsSync(rulesDir)) {
    for (const f of fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(rulesDir, f), 'utf8');
      // Cap each file at 2000 chars to stay within token budgets
      parts.push('### ' + f + '\n' + content.substring(0, 2000));
    }
  }
  LOADED_RULES = parts.join('\n\n');
} catch (e) { /* Rules not available in CI - that's OK */ }

// Load architecture doc (truncated to key sections for token efficiency)
let ARCHITECTURE_SUMMARY = '';
try {
  const archPath = path.join(__dirname, '../../docs/ARCHITECTURE.md');
  const full = fs.readFileSync(archPath, 'utf8');
  // Extract sections 1-5 + 19-20 (most useful for AI: app entry, drivers, hierarchy, protocol, mixins, automation, patterns)
  const sections = [];
  const lines = full.split('\n');
  let capture = false;
  let sectionNum = 0;
  for (const line of lines) {
    const m = line.match(/^## (\d+)\./);
    if (m) { sectionNum = parseInt(m[1]); capture = [1,2,3,4,5,19,20].includes(sectionNum); }
    if (capture) sections.push(line);
  }
  ARCHITECTURE_SUMMARY = sections.join('\n');
} catch (e) { /* Architecture doc not available in CI - that's OK */ }

const PROJECT_RULES = [
'## Universal Tuya Zigbee - Project Rules for AI',
'',
'### REFERENCE DOCUMENTATION (CRITICAL)',
'- Homey SDK Docs: apps.developer.homey.app (MUST consult for SDK, capabilities, flows, and pairing rules)',
'- Internal Rules: docs/rules/DEVELOPMENT_RULES.md, docs/rules/CRITICAL_MISTAKES.md',
'- Tuya Specs: docs/devices/* (for TS0601 DP definitions)',
'',
'### IDENTITY',
'- App: com.dlnraja.tuya.zigbee | SDK3 | Repo: dlnraja/com.tuya.zigbee',
'- Forum: topics 140352 (dlnraja), 26439 (JohanBendz)',
'',
'### FINGERPRINT RULES (CRITICAL)',
'- Fingerprint = manufacturerName + productId COMBINED',
'- Same mfr in multiple drivers is NORMAL if productId differs',
'- TRUE collision = same mfr + same pid in incompatible drivers',
'- No wildcards in SDK3 (_TZE284_* is INVALID)',
'- Case-insensitive: include both _TZE200_ and _tze200_',
'- TS0601 collisions are inherent to Tuya architecture',
'',
'### CODE RULES',
'- Settings keys: zb_model_id NOT zb_modelId, zb_manufacturer_name NOT zb_manufacturerName',
'- Flow triggers: NO titleFormatted with [[device]] - use title field',
'- Import: require(../../lib/tuya/TuyaZigbeeDevice) NOT require(../../lib/TuyaZigbeeDevice)',
'- Mixin order: PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))',
'- Flow IDs: {driver}_physical_gang{N}_{on|off}',
'- Backlight values: off, normal, inverted (strings not numbers)',
'- Press type 0-indexed: 0=single 1=double 2=hold',
'',
'### TUYA DP PROTOCOL',
'- Cluster 0xEF00 (61184)',
'- Types: 0=Raw 1=Bool 2=Value 3=String 4=Enum 5=Bitmap',
'- DP1-8: gang states | DP14: power-on | DP15: backlight | DP101: child_lock',
'- Values may need division: temp/10, hum/10, battery/2',
'- Double-division bug: skip auto-convert when dpMappings divisor !== 1',
'',
'### BATTERY AND MAINS',
'- Sleepy devices: first report up to 24h - NOT a bug',
'- mainsPowered devices must NOT have measure_battery',
'- batteryPercentageRemaining===0 is VALID (dead battery)',
'- Store-based restore: persist on every update, restore on init',
'',
'### BSEED ZCL-ONLY',
'- FPs: _TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk, _TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt',
'- Group toggle bug: firmware broadcasts ZCL to ALL EPs',
'- Fix: _removeGroupMemberships + _lastCommandedGang + broadcast filter 2s',
'',
'### UNSUPPORTED DEVICES',
'- Solar inverters (APsystems, Enphase, SolarEdge) = proprietary protocol',
'- Red flags: requires manufacturer gateway, no _TZ* prefix',
'- For solar monitoring: use bidirectional energy meters (_TZE204_ac0fhfiq)',
'',
'### KNOWN BUGS & FIXES (LATEST)',
'- "56 years ago" timestamp on battery sensors: FIXED!',
'- "Could not get device by ID" string errors on Wireless Buttons: FIXED!',
'- Flow Card Unlinking on Hybrid Drivers: FIXED via Rule 21 (Capability-based filters).',
'',
'### ARCHITECTURAL SHIELD (Thinking Opus 4.6)',
'- **Rule 21 (Interoperability)**: Flow cards for multi-gang MUST filter by `capabilities` (e.g. `onoff.gang2`) instead of `driver_id` to ensure compatibility across hybrid/prefixed variants.',
'- **Rule 22 (Legacy Anchor)**: NEVER remove fingerprints from legacy drivers when migrating to new ones; preserve as "Legacy Anchors" to prevent breaking thousands of existing units.',
'- **Rule 23 (Generic Mixins)**: Standardize Tuya patterns (like 0xFC11 for Woolley) into global mixins rather than per-driver code.',
'- **Intel Harvesting**: Actively scan ecosystem forks for "Smart Methods" (calibration, backoff, local_scene) and structural innovations in `lib/`.',
'',
'### RESPONSE GUIDELINES',
'- **CRITICAL**: YOU MUST RESPOND IN ENGLISH ONLY. NO EXCEPTIONS. Even if the user asks in French or Dutch, reply in English.',
'- If fingerprint supported: tell which driver, how to pair, link to install',
'- If not supported: ask for device interview from tools.developer.homey.app/tools/zigbee',
'- If interview data: analyze clusters, endpoints, suggest driver',
'- Cross-reference Z2M, ZHA, Blakadder when possible',
'- NEVER publish locally - use GitHub Actions',
'- Install test: https://homey.app/a/com.dlnraja.tuya.zigbee/test/',
'- Issues: https://github.com/dlnraja/com.tuya.zigbee/issues',
].join('\n');

module.exports = { PROJECT_RULES, ARCHITECTURE_SUMMARY, LOADED_RULES };