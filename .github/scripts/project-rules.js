const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
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
'### IDENTITY & MATCHING',
'- App: com.dlnraja.tuya.zigbee | SDK3 | Repo: dlnraja/com.tuya.zigbee',
'- **Rule 24 (Norm)**: ALL manufacturerName/productId matching MUST be case-insensitive. Normalize via `UniversalTuyaParser`.',
'',
'### FINGERPRINT RULES (CRITICAL)',
'- Fingerprint = manufacturerName + productId COMBINED',
'- Same mfr in multiple drivers is NORMAL if productId differs',
'- TRUE collision = same mfr + same pid in incompatible drivers',
'- No wildcards in SDK3 (_TZE284_* is INVALID)',
'- TS0601 collisions are inherent to Tuya architecture',
'',
'### CODE RULES',
'- Settings keys: zb_model_id NOT zb_modelId, zb_manufacturer_name NOT zb_manufacturerName',
'- Flow triggers: NO titleFormatted with [[device]] - use title field',
'- Import: require(../../lib/tuya/TuyaZigbeeDevice) NOT require(../../lib/TuyaZigbeeDevice)',
'- Mixin order: PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))',
'- Flow IDs: {driver}_physical_gang{N}_{on|off}',
'- Backlight values: off, normal, inverted (strings not numbers)',
'- Press type 0-indexed: 0=single 1=double 2=hold',
'',
'### TUYA DP PROTOCOL & TIME SYNC',
'- Cluster CLUSTERS.TUYA_EF00 (CLUSTERS.TUYA_EF00)',
'- Types: 0=Raw 1=Bool 2=Value 3=String 4=Enum 5=Bitmap',
'- DP1-8: gang states | DP14: power-on | DP15: backlight | DP101: child_lock',
'- **Rule 25 (TimeSync)**: 10-byte payload `[seq:2][UTC:4][Local:4]`. MUST echo `seqNum` from request (0x24).',
'- Double-division bug: skip auto-convert when dpMappings divisor !== 1',
'',
'### BATTERY AND MAINS',
'- Sleepy devices: first report up to 24h - NOT a bug',
'- mainsPowered devices must NOT have measure_battery',
'- batteryPercentageRemaining===0 is VALID (dead battery)',
'- Store-based restore: persist on every update, restore on init',
'- **Rule 26 (NaN Guard)**: Validate numeric reports in `SemanticConverter` to prevent NaN crashes.',
'',
'### ARCHITECTURAL SHIELD (Autonomous Engine Reimplementation)',
'- **Rule 21 (Interoperability)**: Flow cards for multi-gang MUST filter by `capabilities` (e.g. `onoff.gang2`) instead of `driver_id` to ensure compatibility across unified/prefixed variants.',
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
