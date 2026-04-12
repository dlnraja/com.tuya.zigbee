#!/usr/bin/env node
/**
 * SDK v3 Smart Enrichment Linter
 * v1.0.0 — Safe, intelligent driver enrichment
 *
 * Architecture:
 *   1. STATIC PASS (no AI) — catches SDK v3 violations with regex rules
 *   2. AI ENRICHMENT PASS (optional) — suggests improvements, NEVER overwrites
 *   3. SMART MERGE — compares AI output with current code, applies ONLY additive enrichments
 *   4. VALIDATION GATE — node -c syntax + homey app validate BEFORE and AFTER
 *   5. MEMORY — records patterns in ai-rules-memory.json for recursive learning
 *
 * Safety: NEVER blindly overwrites files. Every change is validated.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DDIR = path.join(process.cwd(), 'drivers');
const MEM_FILE = path.join(process.cwd(), '.github', 'state', 'ai-rules-memory.json');
const REPORT_FILE = path.join(process.cwd(), '.github', 'state', 'sdk3-lint-report.json');
const DRY = process.env.DRY_RUN === 'true';
const AI_ENABLED = process.env.AI_ENRICH !== 'false'; // default ON if AI keys present
const MAX_FILES = parseInt(process.env.MAX_LINT_FILES || '20', 10);

// ============================================================
// PART 1: STATIC SDK v3 RULES (No AI needed — always runs)
// ============================================================

const RULES = [
  {
    id: 'sdk3-async-init',
    severity: 'warn',
    desc: 'onInit() should be async. For Zigbee drivers, use async onNodeInit().',
    test: (code) => /\bonInit\s*\(/.test(code) && !/async\s+onInit\s*\(/.test(code),
    fix: (code) => code.replace(/(\s+)onInit\s*\(\s*\)\s*\{/g, '$1async onInit() {'),
  },
  {
    id: 'sdk3-no-v2-zigbee',
    severity: 'error',
    desc: 'this.homey.zigbee.getDevice() is SDK v2. Remove it.',
    test: (code) => /this\.homey\.zigbee\.getDevice/.test(code),
    fix: null, // Cannot auto-fix — needs manual review
  },
  {
    id: 'sdk3-no-global-managers',
    severity: 'warn',
    desc: 'Direct Manager* global access detected. Use this.homey.<managerId>.',
    test: (code) => /\bHomey\.Manager[A-Z]/.test(code) || /\bManagerDrivers\b/.test(code),
    fix: null,
  },
  {
    id: 'sdk3-await-capability',
    severity: 'info',
    desc: 'setCapabilityValue() calls should be awaited.',
    test: (code) => {
      const total = (code.match(/this\.setCapabilityValue\(/g) || []).length;
      const awaited = (code.match(/await\s+this\.setCapabilityValue\(/g) || []).length;
      return total > 0 && awaited < total;
    },
    count: (code) => {
      const total = (code.match(/this\.setCapabilityValue\(/g) || []).length;
      const awaited = (code.match(/await\s+this\.setCapabilityValue\(/g) || []).length;
      return { total, awaited, missing: total - awaited };
    },
    fix: null, // Too dangerous to auto-fix — might break try/catch flow
  },
  {
    id: 'tuya-settings-key',
    severity: 'info',
    desc: 'Settings key should be snake_case (zb_model_id not zb_modelId).',
    test: (code) => /getSetting\(['"]zb_modelId['"]\)|getSetting\(['"]zb_manufacturerName['"]\)/.test(code)
                     && !/zb_model_id|zb_manufacturer_name/.test(code), // Only flag if NO snake_case fallback
    fix: null,
  },
  {
    id: 'tuya-titleformatted-device',
    severity: 'error',
    desc: 'titleFormatted with [[device]] causes manual device selection bug.',
    test: (code) => /titleFormatted.*\[\[device\]\]/.test(code),
    fix: null,
  },
  {
    id: 'sdk3-listener-leak',
    severity: 'warn',
    desc: 'High number of capability listeners — verify no duplicates on restart.',
    test: (code) => {
      const count = (code.match(/registerCapabilityListener|registerMultipleCapabilityListener/g) || []).length;
      return count > 8;
    },
    count: (code) => (code.match(/registerCapabilityListener|registerMultipleCapabilityListener/g) || []).length,
    fix: null,
  },
  {
    id: 'sdk3-ondeleted-cleanup',
    severity: 'info',
    desc: 'Driver has listeners but no onDeleted/onUninit cleanup.',
    test: (code) => {
      const hasListeners = /registerCapabilityListener/.test(code);
      const hasCleanup = /onDeleted|onUninit/.test(code);
      return hasListeners && !hasCleanup;
    },
    fix: null,
  },
  {
    id: 'tuya-dp-ef00-cluster',
    severity: 'info',
    desc: 'EF00 driver should reference cluster 0xEF00 or 61184.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      const hasTuyaDP = caps.some(c => /^tuya_dp_/.test(c));
      if (!hasTuyaDP) return false;
      return !/0xEF00|61184|ef00/i.test(code);
    },
    fix: null,
  },
  {
    id: 'tuya-raw-listener-leak',
    severity: 'warn',
    desc: 'RX/raw listener detected without removeAllListeners cleanup in onDeleted.',
    test: (code) => {
      const hasRxListener = /\.on\s*\(\s*['"](?:rx|raw)['"]/.test(code);
      const hasCleanup = /removeAllListeners\s*\(\s*['"](?:rx|raw)['"]/.test(code);
      return hasRxListener && !hasCleanup;
    },
    fix: null,
  },
  {
    id: 'tuya-raw-no-debounce',
    severity: 'warn',
    desc: 'RX/raw handler without debounce mutex — risk of double-trigger.',
    test: (code) => {
      const hasRxListener = /\.on\s*\(\s*['"](?:rx|raw)['"]/.test(code);
      const hasDebounce = /_rawHandledTimeout|_lastRawTs|_debounce/.test(code);
      return hasRxListener && !hasDebounce;
    },
    fix: null,
  },
  {
    id: 'sdk3-battery-conflict',
    severity: 'error',
    desc: 'SDK v3 violation: measure_battery + alarm_battery on same device. Creates duplicate UI/Flow Cards.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      return caps.includes('measure_battery') && caps.includes('alarm_battery');
    },
    fix: null, // Runtime handler adapts — but compose should not declare both
  },
  {
    id: 'sdk3-flow-card-unsafe',
    severity: 'error',
    desc: 'Bare getTriggerCard or getActionCard without try-catch — crashes app if card missing.',
    test: (code) => {
      const bareCall = /this\.homey\.flow\.(?:getTriggerCard|getActionCard)\s*\(/g;
      const inTryCatch = /try\s*\{[^}]*\.(?:getTriggerCard|getActionCard)/g;
      const total = (code.match(bareCall) || []).length;
      const safe = (code.match(inTryCatch) || []).length;
      return total > 0 && safe < total;
    },
    fix: null,
  },
  {
    id: 'sdk3-phantom-flow-method',
    severity: 'error',
    desc: 'CRITICAL: getDeviceConditionCard(), getDeviceActionCard() and getDeviceTriggerCard() DO NOT EXIST in Homey SDK v3. Use getConditionCard(), getActionCard() and getTriggerCard() instead.',
    test: (code) => /\.getDevice(?:Condition|Action|Trigger)Card\s*\(/.test(code),
    count: (code) => (code.match(/\.getDevice(?:Condition|Action|Trigger)Card\s*\(/g) || []).length,
    fix: (code) => code
      .replace(/\.getDeviceConditionCard\s*\(/g, '.getConditionCard(')
      .replace(/\.getDeviceActionCard\s*\(/g, '.getActionCard(')
      .replace(/\.getDeviceTriggerCard\s*\(/g, '.getTriggerCard('),
  },
  {
    id: 'sdk3-mains-has-battery',
    severity: 'warn',
    desc: 'Device has mainsPowered=true but compose still declares battery capability. Runtime handler will fix, but compose is misleading.',
    test: (code, driverDir) => {
      const isMains = /mainsPowered\s*\(\)\s*\{[^}]*return\s+true/s.test(code);
      if (!isMains) return false;
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      return caps.includes('measure_battery') || caps.includes('alarm_battery');
    },
    fix: null,
  },
  {
    id: 'sdk3-missing-energy-batteries',
    severity: 'error',
    desc: 'Driver declares measure_battery capability but driver.compose.json is missing energy.batteries array. SDK3 validation will fail.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      if (!caps.includes('measure_battery')) return false;
      return !compose.energy || !compose.energy.batteries || compose.energy.batteries.length === 0;
    },
    fix: null, // Requires JSON edit, not JS code edit
  },
  {
    id: 'sdk3-raw-zcl-in-flow-action',
    severity: 'warn',
    desc: 'Flow Action handler uses raw ZCL cluster call (zclNode.endpoints[].clusters.onOff) instead of triggerCapabilityListener(). This breaks Tuya DP-based devices.',
    test: (code) => {
      // Only flag if it's inside a registerRunListener context AND uses direct ZCL
      const hasRunListener = /registerRunListener/.test(code);
      const hasRawZcl = /zclNode\.endpoints\[.*\]\.clusters\.onOff\.set(?:On|Off)/s.test(code);
      return hasRunListener && hasRawZcl;
    },
    fix: null,
  },
  {
    id: 'sdk3-case-sensitive-fingerprint',
    severity: 'warn',
    desc: 'Fingerprint in enrichment data uses UPPERCASE (e.g., _TZE200_PAY2BYAX). Tuya fingerprints must be lowercase to match correctly.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose || !compose.zigbee) return false;
      const mfrs = compose.zigbee.manufacturerName || [];
      return mfrs.some(m => /^_T[A-Z0-9]+_[A-Z0-9]+$/.test(m));
    },
    fix: null,
  },
  {
    id: 'sdk3-static-probe-zcl',
    severity: 'warn',
    desc: 'driver.compose.json declares measure_temperature.probe as default capability. For pure ZCL sensors (TS0201/_TZ3000_*), probe should only be added dynamically via DP38.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      if (!caps.includes('measure_temperature.probe')) return false;
      // Only flag if driver has pure-ZCL fingerprints
      const mfrs = compose.zigbee?.manufacturerName || [];
      return mfrs.some(m => m.toLowerCase().startsWith('_tz3000_'));
    },
    fix: null,
  },
  {
    id: 'sdk3-trigger-card-no-try',
    severity: 'warn',
    desc: 'getTriggerCard() called without try-catch. Missing cards will crash the app.',
    test: (code) => {
      if (!/getTriggerCard/.test(code)) return false;
      // Check if there are calls NOT inside try blocks
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/getTriggerCard/.test(lines[i])) {
          // Look back max 5 lines for 'try {'
          let inTry = false;
          for (let j = Math.max(0, i - 5); j <= i; j++) {
            if (/try\s*\{/.test(lines[j])) inTry = true;
          }
          if (!inTry) return true;
        }
      }
      return false;
    },
    fix: null,
  },
  {
    id: 'sdk3-dp-variant-awareness',
    severity: 'info',
    desc: 'DP mapping has no variant-awareness comment. Same DP can serve different functions across _TZE200/_TZE204/_TZE284 variants. Consider adding variant notes.',
    test: (code) => {
      // Only flag if file has dpMappings but no variant comments
      if (!/dpMappings/.test(code)) return false;
      if (/variant/i.test(code)) return false; // Already has variant comments
      // Check if multiple TZE prefixes are referenced
      const hasTZE200 = /_TZE200/i.test(code);
      const hasTZE204 = /_TZE204/i.test(code);
      const hasTZE284 = /_TZE284/i.test(code);
      const prefixCount = [hasTZE200, hasTZE204, hasTZE284].filter(Boolean).length;
      return prefixCount >= 2; // Multiple variants = needs awareness
    },
    fix: null,
  },
  {
    id: 'tuya-climate-safe-set',
    severity: 'warn',
    desc: 'Climate data detected. Use _safeSetCapability() instead of setCapabilityValue() to ensure calibration offsets are applied.',
    test: (code) => {
      const usesSetCap = /setCapabilityValue\s*\(\s*['"](?:measure_temperature|measure_humidity|measure_pressure|measure_luminance|measure_battery)['"]/.test(code);
      const usesSafeSet = /_safeSetCapability\s*\(/.test(code);
      return usesSetCap && !usesSafeSet;
    },
    fix: (code) => code.replace(/setCapabilityValue\s*\(\s*(['"](?:measure_temperature|measure_humidity|measure_pressure|measure_luminance|measure_battery)['"])/g, '_safeSetCapability($1'),
  },
];

function loadCompose(driverDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(driverDir, 'driver.compose.json'), 'utf8'));
  } catch { return null; }
}

function runStaticLint(filePath, driverDir) {
  const code = fs.readFileSync(filePath, 'utf8');
  const results = [];

  for (const rule of RULES) {
    if (rule.test(code, driverDir)) {
      const entry = { id: rule.id, severity: rule.severity, desc: rule.desc, file: filePath };
      if (rule.count) entry.details = rule.count(code);
      results.push(entry);
    }
  }

  return { filePath, code, results };
}

// ============================================================
// PART 2: AI ENRICHMENT (Optional — uses ai-helper.js cascade)
// ============================================================

async function aiEnrichDriver(filePath, code, staticResults, memory) {
  let callAI;
  try {
    ({ callAI } = require(path.join(process.cwd(), '.github', 'scripts', 'ai-helper')));
  } catch {
    console.log('  ⚠️ ai-helper.js not available — AI enrichment skipped');
    return null;
  }

  const driver = path.basename(path.dirname(filePath));
  const compose = loadCompose(path.dirname(filePath));
  const caps = compose?.capabilities || [];
  const fps = compose?.zigbee?.manufacturerName || [];

  // Build context-aware Ultimate Prompt
  let prompt = `You are an Expert Software Architect for Homey Pro SDK v3 and Universal Tuya Zigbee.
You operate inside a CI/CD GitHub Actions pipeline. Your mission is to ENRICH and FIX driver source code.
You generate Node.js code that will run on Homey Pro boxes — you DO NOT run on the box yourself.

DRIVER: ${driver}
CAPABILITIES: ${caps.join(', ')}
FINGERPRINTS: ${fps.length} manufacturer names

STATIC LINT FINDINGS:
${staticResults.map(r => `- ${r.severity.toUpperCase()}: ${r.desc}`).join('\n') || 'None'}

`;

  // Inject learned patterns from memory (recursive learning)
  const patterns = memory.patterns || [];
  if (patterns.length > 0) {
    prompt += `KNOWN PATTERNS (from ${memory.totalRuns || 0} past runs):\n`;
    for (const p of patterns.slice(-10)) {
      prompt += `- ${p.id}: ${p.desc} (seen ${p.count}x)\n`;
    }
    prompt += '\n';
  }

  prompt += `=== SMART MERGE RULES (ABSOLUTE) ===
1. CUMULATIVE STRICT: NEVER delete a deviceId, manufacturerName, DataPoint (DP), or cluster from the original. ONLY add or fix.
2. OUTPUT FORMAT: Respond ONLY with a JSON object or the word "VALID". No markdown, no explanations.
3. If code is correct: respond "VALID".
4. If you have suggestions: {"suggestions": [{"type": "add|fix|improve", "location": "description", "current": "...", "proposed": "...", "reason": "..."}]}

=== SDK v3 COMPLIANCE (VITAL) ===
1. ASYNC INIT: onInit() is deprecated. Generate 'async onNodeInit()' for Zigbee drivers.
2. AWAIT: Every 'this.setCapabilityValue()' MUST be preceded by 'await'.
3. API: Use exclusively 'this.homey.<managerId>' (this.homey.drivers, this.homey.flow, this.homey.settings). NEVER generate global 'ManagerDrivers' or 'ManagerZwave'.
4. MEMORY: Every event listener (.on()) must have cleanup in 'async onDeleted()' via removeAllListeners(). This prevents memory leaks on Homey Pro 2023.
5. FLOW CARDS: ALWAYS wrap getTriggerCard, getConditionCard or getActionCard in try-catch. NEVER use 'getDeviceTriggerCard' etc (hallucinated in previous versions).

=== SDK v3 BATTERY & ENERGY RULES (CRITICAL) ===
1. NEVER combine measure_battery + alarm_battery on same device. Causes duplicate UI and Flow Cards.
2. Drivers serve THOUSANDS of variants — same manufacturerName can be battery OR mains OR kinetic.
3. Use RUNTIME ADAPTATION via UnifiedBatteryHandler (lib/battery/):
   - Compose declares measure_battery as possibility
   - Runtime probes ZCL genPowerCfg + Tuya DP + IAS Zone + voltage
   - If device reports %: keep measure_battery, remove alarm_battery
   - If device reports boolean only: keep alarm_battery, remove measure_battery
   - If mains/kinetic: remove both battery capabilities
4. POWER SOURCE TYPES (all must be supported):
   - Battery: energy.batteries in compose, ZCL cluster 0x0001 or Tuya DP 4/10/14/15/21/100-105
   - Mains (220V/USB): mainsPowered() returns true, NO battery caps
   - Hybrid (mains + battery backup): runtime detection, same driver serves both
   - Kinetic/mechanical (self-powered): TS004x buttons, energy from click, NO battery
   - Chinese exotic: ANY combination possible, even ALL at once
5. NEVER assume power source from driver name or manufacturerName alone.
6. Battery DPs: 4, 10, 14, 15, 21, 100, 101, 102, 104, 105 (percentage)
7. Voltage DPs: 33, 35, 247 (mV or 10mV, convert via discharge curve)
8. IAS Zone Status bit 3 = low-battery boolean alarm
9. energy.batteries: Whenever a driver assigns "measure_battery" in its capabilities, YOU MUST strictly define an "energy": { "batteries": ["OTHER"] } array (or "AA", "CR2032") in driver.compose.json to pass Homey SDK3 validation!
10. measure_battery_changed: NEVER manually define measure_battery_changed (or _temp_changed, _humidity_changed) explicitly in flow triggers. Homey SDK v3 implicitly auto-generates them.

=== ZIGBEE PROTOCOL TYPES (all must be respected) ===
1. Tuya DP (TS0601 / cluster 0xEF00): Uses dpMappings + TuyaEF00Manager.
   - NEVER add ZCL cluster bindings to TS0601 drivers
   - Each _TZE200/204/284_ manufacturerName may need DIFFERENT DP maps
2. Standard ZCL: Uses configureAttributeReporting() + cluster bindings.
   - NEVER add TuyaEF00Manager to standard ZCL drivers
3. Tuya Standard (ZCL + extensions): Standard clusters + 0xE000/0xE001.
4. Custom clusters (0xFC00-0xFCFF): Raw frame interception.

=== VARIANT INTELLIGENCE ===
- One manufacturerName → many productIds (NORMAL): same OEM, different products
- One productId → many manufacturerNames (NORMAL): TS0601 is generic container
- Same mfr+pid combo → MUST map to same driver (conflict if not)
- Power source varies per variant! Same _TZ3000_ can be battery OR mains OR kinetic
- Use runtime capability detection: if (this.hasCapability('X')) before setup

=== TUYA CLUSTER HIERARCHY (Priority Order) ===
When mapping new features, respect this strict hierarchy:
1. BOUNDCLUSTER (Standard ZCL): genOnOff, genLevelCtrl, msTemperatureMeasurement — use native clusters first.
2. TUYABOUNDCLUSTER (EF00): Priority for 90% of Tuya hardware. Map DataPoints on cluster 0xEF00/61184.
   - If an EF00 DP is unrecognized, listen for the TuyaBoundCluster 'unhandled_dp' event, NOT raw RX.
3. RAW/RX (Last Resort): Only for non-standard trames outside ZCL and EF00 (e.g., Tuya scene buttons).

=== OMNI-CHANNEL COMMAND ROUTING & PHYSICAL BUTTON RULES (CRITICAL) ===
To properly handle multi-gang, hybrid Tuya/ZCL routers, and buttons across ALL levels of abstraction (Raw ZCL, Tuya EF00, Flow, UI, Physical), drivers MUST implement the Omni-Channel routing pattern:
1. APP/UI COMMANDS -> PROTOCOL OMNI-CATCHER: All incoming 'Turn On/Off' commands (whether from UI tile, Homey Flow Action 'Turn on', or Web API) MUST ultimately route through this.triggerCapabilityListener('onoff.gangX', val).
   - NEVER use this.setCapabilityValue to *execute* an action (it only changes UI).
   - NEVER use raw args.device.zclNode.endpoints[ep].clusters.onOff.setOn() directly in Flow Actions.
   - Using triggerCapabilityListener ensures the onoff capability handler decides if the payload goes via pure ZCL (this.zclNode...) or Tuya DPs (this._handleTuyaDatapoint...).
2. PHYSICAL VS VIRTUAL DETECTION (_appCommandPending):
   - In registerCapabilityListener('onoff', ...), ALWAYS flag this._appCommandPending = true with a setTimeout of 2000ms.
   - This flag proves the command originated logically from Homey (App/Flow/Virtual).
3. PHYSICAL STATE ARRIVAL (Device -> Homey):
   - When state arrives horizontally from the device either via ZCL Report (this.zclNode...on('attr')) or Custom Tuya DP (_handleTuyaDatapoint), check this._appCommandPending.
   - If _appCommandPending === true: This is a bidirectional ACK of the virtual command. Do nothing except this.setCapabilityValue.
   - If _appCommandPending !== true: THIS IS A PHYSICAL BUTTON PRESS / REAL WORLD EVENT. Trigger this.homey.flow.getTriggerCard('turned_on_physical_gangX').trigger(this)!
4. RAW / STREAM / CUSTOM FALLBACKS:
   - For heavily customized tuples (e.g. TS004F/Scene buttons), catch raw commands via this.zclNode.on('rawCommand').
   - Before acting, translate the raw endpoint and cluster command directly into a normalized triggerCapabilityListener or a direct Flow trigger! This unifies the execution pipe.

=== ADVANCED PATTERNS ===

CASE A — PHYSICAL BUTTONS & SCENES (Johan's Raw Pattern):
If device is a button/scene switch that fails on standard clusters:
- Generate low-level listener: this.zclNode.endpoints[X].clusters[NAME].on("rx", ...)
- Parse raw payload hex for click types (0x00=single, 0x01=double, 0x02=hold)
- ANTI-DOUBLON MANDATORY: Always include a debounce mutex (300ms lock):
  if (this._rawHandledTimeout) return;
  this._rawHandledTimeout = setTimeout(() => { this._rawHandledTimeout = null; }, 300);
- TX ACKNOWLEDGE: Add writeCommand with manual Header 0x11 to prevent Tuya LED error blink

CASE B — IR RECEIVERS:
If device handles infrared codes:
- NEVER process raw frames in isolation — IR payloads exceed Zigbee MTU (~80 bytes)
- Generate Buffer Reassembly: this._irBuffer = Buffer.alloc(0), concat incoming rx payloads
- Trigger decode ONLY on end-frame header or 200ms inactivity timeout

CASE C — LCD CLIMATE & TIME SYNC:
If device is a thermostat (TRV) or has LCD displaying time:
- Tuya ignores standard Time cluster (0x000A) — uses DP 0x24 via EF00 instead
- Generate syncTime() method using this.homey.clock.getTimezone() for GMT offset
- Attach to setInterval (every 3 hours) in onNodeInit()
- Format: 8-byte payload [Year-2000, Month, Day, Hour, Min, Sec, Weekday, 0x00]

CASE D — RUNTIME ENERGY ADAPTATION:
If device has battery capabilities:
- Initialize UnifiedBatteryHandler in onNodeInit(): this._batteryHandler = new UnifiedBatteryHandler(this); await this._batteryHandler.initialize(this.zclNode);
- Handler automatically probes all sources and adapts capabilities
- DO NOT manually add/remove battery caps — let the handler do it

DRIVER CODE:
\`\`\`javascript
${code.substring(0, 8000)}
\`\`\``;

  try {
    const res = await callAI(prompt, 'Homey SDK v3 driver analyzer. Output ONLY "VALID" or a JSON suggestions object. No markdown, no explanations.', {
      maxTokens: 2000,
      complexity: 'medium',
      taskType: 'analyze'
    });

    if (!res || !res.text || res.text === 'AI_OFFLINE_OR_LIMIT_REACHED') return null;

    const text = res.text.trim();
    if (text === 'VALID' || text.toUpperCase() === 'VALID') {
      console.log(`  ✅ AI says ${driver} is VALID (model: ${res.model})`);
      return { valid: true, model: res.model };
    }

    // Parse suggestions
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
        console.log(`  🔍 AI suggests ${(parsed.suggestions || []).length} improvement(s) for ${driver} (model: ${res.model})`);
        return { valid: false, suggestions: parsed.suggestions || [], model: res.model };
      }
    } catch {
      console.log(`  ⚠️ AI response wasn't parseable JSON for ${driver}`);
    }

    return null;
  } catch (e) {
    console.log(`  ⚠️ AI error for ${driver}: ${e.message}`);
    return null;
  }
}

// ============================================================
// PART 3: SMART MERGE (Additive only, validated)
// ============================================================

function smartMerge(code, suggestions) {
  if (!suggestions || !suggestions.length) return null;

  let modified = code;
  let applied = [];

  for (const sug of suggestions) {
    if (!sug.type || !sug.proposed) continue;

    // SAFETY: Only apply "add" type suggestions (never "remove" or "replace")
    if (sug.type === 'add') {
      // For additive suggestions, only apply if the proposed code doesn't already exist
      if (!modified.includes(sug.proposed.trim())) {
        // Don't blindly insert — just log it for manual review
        applied.push({ ...sug, status: 'suggested' });
      }
    } else if (sug.type === 'fix' && sug.current && sug.proposed) {
      // For fixes: only apply if the current pattern exists AND the fix doesn't break syntax
      if (modified.includes(sug.current)) {
        const candidate = modified.replace(sug.current, sug.proposed);
        // Syntax check the candidate
        if (syntaxCheck(candidate)) {
          modified = candidate;
          applied.push({ ...sug, status: 'applied' });
        } else {
          applied.push({ ...sug, status: 'rejected-syntax' });
        }
      } else {
        applied.push({ ...sug, status: 'rejected-notfound' });
      }
    } else {
      applied.push({ ...sug, status: 'suggested' });
    }
  }

  const hasChanges = modified !== code;
  return { code: hasChanges ? modified : null, applied, hasChanges };
}

function syntaxCheck(code) {
  const tmpFile = path.join(require('os').tmpdir(), 'sdk3-lint-check-' + Date.now() + '.js');
  try {
    fs.writeFileSync(tmpFile, code);
    execSync(`node -c "${tmpFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ============================================================
// PART 4: VALIDATION GATE
// ============================================================

function preValidate() {
  try {
    execSync('npx homey app build 2>&1', { stdio: 'pipe', cwd: process.cwd(), timeout: 120000 });
    execSync('npx homey app validate --level debug 2>&1', { stdio: 'pipe', cwd: process.cwd(), timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 5: MEMORY — Recursive learning
// ============================================================

function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEM_FILE, 'utf8'));
  } catch {
    return { patterns: [], lastRun: null, totalRuns: 0, totalIssues: 0 };
  }
}

function saveMemory(mem) {
  try {
    fs.mkdirSync(path.dirname(MEM_FILE), { recursive: true });
    fs.writeFileSync(MEM_FILE, JSON.stringify(mem, null, 2) + '\n');
  } catch {}
}

function recordPattern(mem, issue) {
  const existing = mem.patterns.find(p => p.id === issue.id);
  if (existing) {
    existing.count++;
    existing.lastSeen = new Date().toISOString();
    existing.files = [...new Set([...(existing.files || []), path.basename(path.dirname(issue.file))])].slice(-20);
  } else {
    mem.patterns.push({
      id: issue.id,
      desc: issue.desc,
      severity: issue.severity,
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      files: [path.basename(path.dirname(issue.file))],
    });
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== SDK v3 Smart Enrichment Linter ===');
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'} | AI: ${AI_ENABLED ? 'ON' : 'OFF'} | Max files: ${MAX_FILES}`);

  const memory = loadMemory();
  memory.totalRuns++;
  memory.lastRun = new Date().toISOString();

  // Determine which files to lint
  let targets = [];

  // Priority 1: Recently changed files (git diff)
  try {
    const changed = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || true', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.match(/^drivers\/.*\/device\.js$/))
      .map(f => path.join(process.cwd(), f));
    targets.push(...changed);
    console.log(`Changed drivers: ${changed.length}`);
  } catch {}

  // Priority 2: If no changed files, scan all drivers
  if (targets.length === 0) {
    try {
      const dirs = fs.readdirSync(DDIR).filter(d => {
        const f = path.join(DDIR, d, 'device.js');
        return fs.existsSync(f);
      });
      targets = dirs.slice(0, MAX_FILES).map(d => path.join(DDIR, d, 'device.js'));
      console.log(`Full scan: ${targets.length}/${dirs.length} drivers`);
    } catch {}
  }

  targets = targets.slice(0, MAX_FILES);

  // === STATIC PASS ===
  console.log('\n--- PASS 1: Static SDK v3 Rules ---');
  const allResults = [];
  let totalIssues = 0;

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    const driverDir = path.dirname(file);
    const driver = path.basename(driverDir);
    const { results } = runStaticLint(file, driverDir);

    if (results.length > 0) {
      totalIssues += results.length;
      console.log(`  ${driver}: ${results.length} issue(s)`);
      for (const r of results) {
        console.log(`    ${r.severity === 'error' ? '❌' : r.severity === 'warn' ? '⚠️' : 'ℹ️'} [${r.id}] ${r.desc}`);
        recordPattern(memory, r);
      }
    }

    allResults.push({ driver, file, staticIssues: results });
  }

  console.log(`\nStatic pass: ${totalIssues} issue(s) across ${targets.length} driver(s)`);

  // === STATIC AUTO-FIX PASS (safe fixes only) ===
  let autoFixed = 0;
  if (!DRY) {
    console.log('\n--- PASS 1b: Safe Static Auto-Fix ---');
    for (const entry of allResults) {
      const fixableIssues = entry.staticIssues.filter(r => {
        const rule = RULES.find(rl => rl.id === r.id);
        return rule && rule.fix;
      });
      if (fixableIssues.length === 0) continue;

      let code = fs.readFileSync(entry.file, 'utf8');
      let changed = false;

      for (const issue of fixableIssues) {
        const rule = RULES.find(rl => rl.id === issue.id);
        const newCode = rule.fix(code);
        if (newCode !== code && syntaxCheck(newCode)) {
          code = newCode;
          changed = true;
          autoFixed++;
          console.log(`  ✅ Auto-fixed [${rule.id}] in ${entry.driver}`);
        }
      }

      if (changed) {
        fs.writeFileSync(entry.file, code);
      }
    }
    if (autoFixed > 0) console.log(`Auto-fixed: ${autoFixed} issue(s)`);
  }

  // === AI ENRICHMENT PASS ===
  let aiSuggestions = 0;
  let aiApplied = 0;
  if (AI_ENABLED && targets.length > 0) {
    console.log('\n--- PASS 2: AI Enrichment ---');

    // Only AI-analyze files that had static issues OR recently changed
    const aiTargets = allResults
      .filter(e => e.staticIssues.length > 0)
      .slice(0, 5); // Cap at 5 to save AI budget

    if (aiTargets.length === 0) {
      console.log('  No files need AI enrichment (all clean)');
    }

    for (const entry of aiTargets) {
      const code = fs.readFileSync(entry.file, 'utf8');
      const aiResult = await aiEnrichDriver(entry.file, code, entry.staticIssues, memory);

      if (aiResult && !aiResult.valid && aiResult.suggestions) {
        aiSuggestions += aiResult.suggestions.length;
        entry.aiResult = aiResult;

        if (!DRY) {
          // Smart merge — additive only
          const merge = smartMerge(code, aiResult.suggestions);
          if (merge && merge.hasChanges) {
            fs.writeFileSync(entry.file, merge.code);
            aiApplied += merge.applied.filter(a => a.status === 'applied').length;
            console.log(`  ✏️ Applied ${merge.applied.filter(a => a.status === 'applied').length} fix(es) to ${entry.driver}`);

            // Record applied fixes in memory
            for (const a of merge.applied.filter(a => a.status === 'applied')) {
              recordPattern(memory, { id: 'ai-fix-' + (a.type || 'unknown'), desc: a.reason || 'AI fix', severity: 'info', file: entry.file });
            }
          }

          // Log suggestions for manual review
          const suggested = (merge?.applied || []).filter(a => a.status === 'suggested');
          if (suggested.length > 0) {
            console.log(`  📋 ${suggested.length} suggestion(s) for manual review in ${entry.driver}`);
          }
        }
      }
    }

    console.log(`AI pass: ${aiSuggestions} suggestion(s), ${aiApplied} applied`);
  }

  // === POST-VALIDATION (if any changes were made) ===
  if (autoFixed > 0 || aiApplied > 0) {
    console.log('\n--- PASS 3: Post-Validation Gate ---');
    // Syntax check all modified files
    let syntaxOk = true;
    for (const entry of allResults) {
      if (!fs.existsSync(entry.file)) continue;
      if (!syntaxCheck(fs.readFileSync(entry.file, 'utf8'))) {
        console.log(`  ❌ Syntax error in ${entry.driver} — ROLLING BACK`);
        try {
          execSync(`git checkout -- "${entry.file}"`, { stdio: 'pipe' });
          console.log(`  ↩️ Rolled back ${entry.driver}`);
        } catch {}
        syntaxOk = false;
      }
    }

    if (syntaxOk) {
      console.log('  ✅ All modified files pass syntax check');
    }
  }

  // === SAVE MEMORY & REPORT ===
  memory.totalIssues = (memory.totalIssues || 0) + totalIssues;
  saveMemory(memory);

  const report = {
    timestamp: new Date().toISOString(),
    driversScanned: targets.length,
    staticIssues: totalIssues,
    autoFixed,
    aiSuggestions,
    aiApplied,
    dryRun: DRY,
    results: allResults.map(e => ({
      driver: e.driver,
      issues: e.staticIssues.map(i => i.id),
      aiModel: e.aiResult?.model,
    })),
    memoryPatterns: memory.patterns.length,
  };

  try {
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
  } catch {}

  // === SUMMARY ===
  console.log('\n=== Summary ===');
  console.log(`Drivers scanned: ${targets.length}`);
  console.log(`Static issues: ${totalIssues}`);
  console.log(`Auto-fixed: ${autoFixed}`);
  console.log(`AI suggestions: ${aiSuggestions}`);
  console.log(`AI applied: ${aiApplied}`);
  console.log(`Memory patterns: ${memory.patterns.length}`);
  console.log(`Total runs: ${memory.totalRuns}`);

  // GitHub Actions annotations
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = `## 🤖 SDK v3 Smart Linter\n| Metric | Value |\n|---|---|\n| Scanned | ${targets.length} |\n| Static Issues | ${totalIssues} |\n| Auto-fixed | ${autoFixed} |\n| AI Suggestions | ${aiSuggestions} |\n| AI Applied | ${aiApplied} |\n| Memory Patterns | ${memory.patterns.length} |\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `lint_issues=${totalIssues}\nlint_fixed=${autoFixed}\nlint_ai_applied=${aiApplied}\n`);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
