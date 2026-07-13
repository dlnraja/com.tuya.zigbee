'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          LocalFirstEngine v1.0.0 — P32 RULES LIBRARY                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  100% offline rules engine. AI is OPTIONAL bonus, never required.           ║
 * ║                                                                              ║
 * ║  Built from P1-P31 project history:                                          ║
 * ║  - P1-P11: Initial fixes (driver collisions, FP routing)                     ║
 * ║  - P14: soil_sensor fix (DP 4/15/101), #511 closed                           ║
 * ║  - P15: Email diagnostics (132 reports, 0 new mfrs)                          ║
 * ║  - P18: Fresh crashes (98 reports: setTimeout, _destroyed)                  ║
 * ║  - P19: safe-timers (76 setTimeout calls secured)                            ║
 * ║  - P19.1: 200% sentinel, class extends, registerRunListenerasync typo       ║
 * ║  - P21: Sacred Couples (mfr+pid disambiguation)                              ║
 * ║  - P22: Forum cross-ref (SEDEA eTH730, 9xfjixap thermostat)                  ║
 * ║  - P23: Publish size fix (44MB→21MB)                                         ║
 * ║  - P24.7: ClassExtendsGuard                                                  ║
 * ║  - P24.8: Smart device discovery (12 cluster→cap mappings)                  ║
 * ║  - P25: Dashboard fix, lenient verify, AggregateError                         ║
 * ║  - P26.6: Temporal cross-ref (forum + GH)                                   ║
 * ║  - P27.1: TS0041 scene mode + button_mode setting + scene_recall              ║
 * ║  - P28: Battery cartography + UniversalBatteryFallback                      ║
 * ║  - P29: 5 GH issue fixes + smart_knob_rotary + temporal monitor              ║
 * ║  - P30: Activity monitor + #506 + #511 fixes                                ║
 * ║  - P31: UI/UX + offline crash analyzer + smart auto-fix                      ║
 * ║                                                                              ║
 * ║  Usage:                                                                      ║
 * ║  ```                                                                          ║
 * ║  const engine = require('./lib/LocalFirstEngine');                          ║
 * ║  const result = engine.diagnose({                                            ║
 * ║    code: sourceCode,                                                        ║
 * ║    file: 'drivers/foo/device.js',                                            ║
 * ║    mfr: '_TZ3000_abc',                                                        ║
 * ║    pid: 'TS0041',                                                            ║
 * ║  });                                                                         ║
 * ║  ```                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: RULES LIBRARY
// Each rule has: id, severity, description, predicate, suggestedFix, autoFixable
// ═══════════════════════════════════════════════════════════════════════════════

const RULES = [
  // ─── BATTERY RULES (P28, P19, P14) ─────────────────────────────────────
  {
    id: 'BAT-001',
    category: 'battery',
    severity: 'high',
    name: 'Battery 200% sentinel not handled',
    description: 'ZCL batteryPercentageRemaining=200 means "not available" sentinel, NOT 100%',
    predicate: (ctx) => ctx.code && /batteryPercentageRemaining/.test(ctx.code) && !/treat200|sentinel|200.*?(sentinel|null|0)/.test(ctx.code),
    suggestedFix: 'Use treat200AsSentinel=true in normalizeZigbeeValue (P19.1 fix a234bcf32)',
    autoFixable: false,
    reference: 'a234bcf32',
  },
  {
    id: 'BAT-002',
    category: 'battery',
    severity: 'high',
    name: 'Battery linear formula',
    description: 'Linear voltage-to-percent is BANNED (use non-linear curves)',
    predicate: (ctx) => ctx.code && /\(\s*voltage\s*-\s*2\.\d+\s*\)\s*\/\s*0\.\d+/.test(ctx.code),
    suggestedFix: 'Use calculateFromVoltage from UnifiedBatteryHandler (P28 fix)',
    autoFixable: false,
    reference: '53550844c',
  },
  {
    id: 'BAT-003',
    category: 'battery',
    severity: 'medium',
    name: 'Battery DP 4 not handled as percent',
    description: 'Tuya DP 4 is battery percent, DP 14 is battery_state enum',
    predicate: (ctx) => ctx.code && /DP\s*[=:]\s*4/.test(ctx.code) && !/battery.*?percent/i.test(ctx.code),
    suggestedFix: 'Check P14: DP 4 = battery %, DP 14 = battery_state (0=low/1=med/2=high)',
    autoFixable: false,
    reference: 'P14',
  },
  {
    id: 'BAT-004',
    category: 'battery',
    severity: 'high',
    name: 'Battery measure_battery not initialized on wake',
    description: 'Sleepy device needs onEndDeviceAnnounce + battery read on wake',
    predicate: (ctx) => ctx.code && /onNodeInit/.test(ctx.code) && /measure_battery/.test(ctx.code) && !/onEndDeviceAnnounce/.test(ctx.code),
    suggestedFix: 'Add onEndDeviceAnnounce() handler + call _readBatteryWhileAwake() (P19.1 fix 50847cd15)',
    autoFixable: false,
    reference: '50847cd15',
  },
  {
    id: 'BAT-005',
    category: 'battery',
    severity: 'medium',
    name: 'Battery 0-50 scale anomaly',
    description: 'Some Tuya devices report 0-50 where 50=100% (TZE200_vvmbj4f5 etc.)',
    predicate: (ctx) => ctx.code && /multiply_2|mult_2|\*\s*2/.test(ctx.code) && !/vvmbj4f5|TZE200_vvmbj4f5/i.test(ctx.code),
    suggestedFix: 'Check UnifiedBatteryHandler.normalizeTuyaBatteryValue for 0-50 scale',
    autoFixable: false,
    reference: '4c2f0fc64',
  },
  {
    id: 'BAT-006',
    category: 'battery',
    severity: 'high',
    name: 'Battery sentinel 255 not filtered',
    description: 'rawValue=255 (0xFF) means "unknown", must be filtered before normalize',
    predicate: (ctx) => ctx.code && /batteryPercentageRemaining/.test(ctx.code) && !/255|0xFF|0xFFFF/.test(ctx.code),
    suggestedFix: 'Add explicit filter: if (value === 255 || value === 0xFFFF) return null;',
    autoFixable: true,
    reference: 'v9.0.89',
  },

  // ─── BUTTON RULES (P27.1, P28, P29) ───────────────────────────────────
  {
    id: 'BTN-001',
    category: 'button',
    severity: 'high',
    name: 'TS0041/TS0042/TS0043/TS0044/TS004F scene mode not configured',
    description: 'These devices need attribute 0x8004=1 on cluster 6 (onOff) for scene mode',
    predicate: (ctx) => ctx.code && /(TS004[1-4]|TS004F|TS0601).*?scene/i.test(ctx.code) && !/0x8004|attributeId.*?0x8004/.test(ctx.code),
    suggestedFix: 'Add _universalSceneModeSwitch + setButtonMode(1) (P27.1 fix)',
    autoFixable: false,
    reference: '071ed0322',
  },
  {
    id: 'BTN-002',
    category: 'button',
    severity: 'medium',
    name: 'button_mode default = auto (should be scene)',
    description: 'Default = auto doesn\'t work for sleepy TS0041 devices. Default = scene is the fix',
    predicate: (ctx) => ctx.code && /"value":\s*"auto"/.test(ctx.code) && /button_mode/.test(ctx.code),
    suggestedFix: 'Change "value": "auto" → "value": "scene" (P28 default fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code.replace(/"value":\s*"auto"/g, '"value":"scene"'),
  },
  {
    id: 'BTN-003',
    category: 'button',
    severity: 'high',
    name: 'TS0041 4-endpoint pattern missing',
    description: 'TS0041 _TZ3000_yj6k7vfo has 4 endpoints (1 per button) — needs dynamic buttonCount',
    predicate: (ctx) => ctx.code && /TS0041|TS0044|TS004F/.test(ctx.code) && /buttonCount\s*=\s*\d+/.test(ctx.code) && !/zclNode.*?endpoints|endpoints.*?length/.test(ctx.code),
    suggestedFix: 'Use dynamic buttonCount: Object.keys(zclNode.endpoints).length (P26.4 fix)',
    autoFixable: false,
    reference: 'P26.4',
  },
  {
    id: 'BTN-004',
    category: 'button',
    severity: 'medium',
    name: 'scene_recall cluster 0x05 listener not registered',
    description: 'TS0041/TS004F in scene mode send cluster 0x05 (genScenes) commandRecall commands',
    predicate: (ctx) => ctx.code && /0x8004|scene.?mode/i.test(ctx.code) && !/genScenes|scenesCluster|0x05.*?scenes|0x0500/.test(ctx.code),
    suggestedFix: 'Add _registerSceneRecallListener(zclNode) — listen for commandRecall on cluster 0x05 (P27.1)',
    autoFixable: false,
    reference: '071ed0322',
  },
  {
    id: 'BTN-005',
    category: 'button',
    severity: 'low',
    name: 'E000 cluster should skip scene mode switch',
    description: 'Devices with E000 cluster (tuyaE000) use E000 for multi-press, not 0x8004',
    predicate: (ctx) => ctx.code && /0x8004|scene.?mode/i.test(ctx.code) && !/tuyaE000|0xE000|57344/.test(ctx.code),
    suggestedFix: 'Add E000 detection: skip _universalSceneModeSwitch if tuyaE000 present',
    autoFixable: false,
    reference: 'ButtonDevice.js v5.9.4',
  },

  // ─── DRIVER ROUTING (P29, P30) ─────────────────────────────────────────
  {
    id: 'DRV-001',
    category: 'driver',
    severity: 'high',
    name: 'TS0003 routed to switch_1gang (wrong)',
    description: 'TS0003 _TZ3000_v4l4b0lp is 3-gang, should route to switch_3gang',
    predicate: (ctx) => ctx.code && (ctx.mfr === '_TZ3000_v4l4b0lp' || (ctx.code && /_TZ3000_v4l4b0lp.*?"driverId":\s*"switch_1gang"/.test(ctx.code))),
    suggestedFix: 'Update FP to "driverId": "switch_3gang" (P29 #170 fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code.replace(/(_TZ3000_v4l4b0lp[\s\S]*?"driverId":\s*")switch_1gang/g, '$1switch_3gang'),
    reference: 'P29-#170',
  },
  {
    id: 'DRV-002',
    category: 'driver',
    severity: 'high',
    name: 'Garage door routed to contact_sensor (wrong)',
    description: '_TZE204_nklqjk62 is mains-powered garage, not contact sensor (battery)',
    predicate: (ctx) => ctx.code && (ctx.mfr === '_TZE204_nklqjk62' || (ctx.code && /_TZE204_nklqjk62.*?"driverId":\s*"contact_sensor"/.test(ctx.code))),
    suggestedFix: 'Update FP to "driverId": "garage_door", "powerSource": "mains" (P29 #128 fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code.replace(/(_TZE204_nklqjk62[\s\S]*?"driverId":\s*")contact_sensor/g, '$1garage_door'),
    reference: 'P29-#128',
  },
  {
    id: 'DRV-003',
    category: 'driver',
    severity: 'high',
    name: 'Water timer missing from FP DB',
    description: 'Immax NEO Water Timer _TZE200_xlppj4f5 not in fingerprints.json',
    predicate: (ctx) => ctx.code && (ctx.mfr === '_TZE200_xlppj4f5' || (ctx.code && /_TZE200_xlppj4f5/.test(ctx.code))),
    suggestedFix: 'Add FP: _TZE200_xlppj4f5 → valve_irrigation (P29 #135 fix)',
    autoFixable: true,
    reference: 'P29-#135',
  },
  {
    id: 'DRV-004',
    category: 'driver',
    severity: 'medium',
    name: 'air_purifier driver has TS0201 (too generic)',
    description: 'TS0201 in air_purifier productId causes climate_sensor to be shadowed',
    predicate: (ctx) => ctx.code && /air_purifier/.test(ctx.code) && /"TS0201"/.test(ctx.code),
    suggestedFix: 'REMOVE "TS0201" from air_purifier productId (P30 #506 fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code.replace(/(\s*"TS0201"\s*,?\s*\n)/g, '\n'),
    reference: 'P30-#506',
  },
  {
    id: 'DRV-005',
    category: 'driver',
    severity: 'medium',
    name: 'soil_sensor missing _TZE284_awepdiwi',
    description: 'Smart Solar Soil Sensor _TZE284_awepdiwi not in soil_sensor manufacturerName',
    predicate: (ctx) => ctx.code && (ctx.mfr === '_TZE284_awepdiwi' || (ctx.code && /soil_sensor/.test(ctx.code) && !/_TZE284_awepdiwi/.test(ctx.code))),
    suggestedFix: 'Add _TZE284_awepdiwi to soil_sensor manufacturerName (P30 #511 fix)',
    autoFixable: true,
    reference: 'P30-#511',
  },

  // ─── ASYNC / TIMER SAFETY (P19) ─────────────────────────────────────────
  {
    id: 'ASYNC-001',
    category: 'async',
    severity: 'high',
    name: 'setTimeout without safe wrapper',
    description: 'setTimeout can fire after device is destroyed (race condition). Use safeSetTimeout',
    predicate: (ctx) => ctx.code && /this\.homey\?\.setTimeout|setTimeout\s*\(/.test(ctx.code) && !/safeSetTimeout|lib\/utils\/safe-timers/.test(ctx.code),
    suggestedFix: 'Replace setTimeout with safeSetTimeout from lib/utils/safe-timers.js (P19 fix)',
    autoFixable: false,
    reference: '1d430f0c9',
  },
  {
    id: 'ASYNC-002',
    category: 'async',
    severity: 'high',
    name: 'Async function without try/catch',
    description: 'Unhandled async = unhandled promise rejection',
    predicate: (ctx) => ctx.code && /async\s+\w+\s*\([^)]*\)\s*\{[\s\S]{50,300}\}/.test(ctx.code) && !/try\s*\{/.test(ctx.code),
    suggestedFix: 'Wrap async function body in try/catch with this.log(error)',
    autoFixable: false,
  },
  {
    id: 'ASYNC-003',
    category: 'async',
    severity: 'medium',
    name: 'clearTimeout/setTimeout mismatch',
    description: 'setTimeout ID not stored = clearTimeout ineffective',
    predicate: (ctx) => ctx.code && /setTimeout\s*\(\s*async/.test(ctx.code) && !/_timer|_timeout|_handle/.test(ctx.code),
    suggestedFix: 'Store timer ID: this._timer = setTimeout(...); clearTimeout(this._timer) in destroy()',
    autoFixable: false,
  },

  // ─── CLASS INHERITANCE (P24.7) ─────────────────────────────────────────
  {
    id: 'CLS-001',
    category: 'class',
    severity: 'high',
    name: 'Class extends value undefined (ZigBeeDevice)',
    description: 'Parent class may not be loaded in test env. Use ClassExtendsGuard',
    predicate: (ctx) => ctx.code && /class\s+\w+\s+extends\s+ZigBeeDevice/.test(ctx.code) && !/ClassExtendsGuard|safeExtends/.test(ctx.code),
    suggestedFix: 'Wrap with ClassExtendsGuard.safeExtends(ZigBeeDevice, ...) — falls back to bare ZigBeeDevice (P24.7 fix)',
    autoFixable: false,
    reference: '42b7690a0',
  },

  // ─── FLOW CARDS (P19, P27.1) ────────────────────────────────────────────
  {
    id: 'FLW-001',
    category: 'flow',
    severity: 'high',
    name: 'registerRunListenerasync typo (concatenated)',
    description: 'P19 typo bug: card.registerRunListenerasync is not a function',
    predicate: (ctx) => ctx.code && /registerRunListenerasync/.test(ctx.code),
    suggestedFix: 'Fix typo: card.registerRunListener(async ...) (P19 fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code.replace(/registerRunListenerasync/g, 'registerRunListener(async'),
    reference: 'P19',
  },
  {
    id: 'FLW-002',
    category: 'flow',
    severity: 'high',
    name: 'Flow card not linked to listener',
    description: 'card.registerRunListener missing — flow card exists but does nothing',
    predicate: (ctx) => ctx.code && /getDeviceTriggerCard|getDeviceActionCard|getTriggerCard/.test(ctx.code) && !/registerRunListener/.test(ctx.code),
    suggestedFix: 'Add card.registerRunListener(handler) right after defining the card',
    autoFixable: false,
  },
  {
    id: 'FLW-003',
    category: 'flow',
    severity: 'medium',
    name: 'Invalid Flow Card ID typo',
    description: 'Card ID contains typo or wrong driverId prefix',
    predicate: (ctx) => ctx.code && /Invalid Flow Card ID/i.test(ctx.code),
    suggestedFix: 'Verify card.id matches the registration in driver.flow.compose.json',
    autoFixable: false,
    reference: 'P18 crashes',
  },

  // ─── SDK v3 (P25) ─────────────────────────────────────────────────────
  {
    id: 'SDK-001',
    category: 'sdk',
    severity: 'high',
    name: 'measure_battery + alarm_battery on same device (SDK3 conflict)',
    description: 'SDK3 does not allow both. Use only measure_battery',
    predicate: (ctx) => ctx.code && /measure_battery/.test(ctx.code) && /alarm_battery/.test(ctx.code),
    suggestedFix: 'REMOVE alarm_battery capability (P25 commit 5fb989c69)',
    autoFixable: false,
    reference: '5fb989c69',
  },
  {
    id: 'SDK-002',
    category: 'sdk',
    severity: 'medium',
    name: 'mainsPowered=true but measure_battery present',
    description: 'Mains device should not have measure_battery',
    predicate: (ctx) => ctx.code && /mainsPowered\s*=\s*true/.test(ctx.code) && /measure_battery/.test(ctx.code) && !/remove.*?battery|removeCapability.*?battery/i.test(ctx.code),
    suggestedFix: 'Remove measure_battery in onNodeInit when mainsPowered=true',
    autoFixable: false,
  },

  // ─── MOJIBAKE (P31.5) ──────────────────────────────────────────────────
  {
    id: 'TXT-001',
    category: 'text',
    severity: 'low',
    name: 'Mojibake é → Ǹ',
    description: 'UTF-8 accented characters rendered as mojibake (e.g. appuyǸ)',
    predicate: (ctx) => ctx.code && /Ǹ/.test(ctx.code),
    suggestedFix: 'Replace Ǹ with é, etc. (use enhance-locales.js + P31.5 fix)',
    autoFixable: true,
    fixFn: (ctx) => ctx.code
      .replace(/appuyǸ/g, 'appuyé')
      .replace(/cliquǸ/g, 'cliqué')
      .replace(/pressǸ/g, 'pressé')
      .replace(/relǽchǸ/g, 'relâché')
      .replace(/apr��s/g, 'après')
      .replace(/HygromǸ/g, 'Hygromé')
      .replace(/tempǸrature/g, 'température')
      .replace(/HumiditǸ/g, 'Humidité')
      .replace(/Ǹ/g, 'é')
      .replace(/�/g, ''),
  },

  // ─── TUYA DP HANDLING ──────────────────────────────────────────────────
  {
    id: 'TUYA-001',
    category: 'tuya',
    severity: 'high',
    name: 'Tuya DP 4/15/101 not differentiated',
    description: 'DP 4 = battery percent (CR2032), DP 15 = battery state enum, DP 101 = battery % (direct)',
    predicate: (ctx) => ctx.code && /DP\s*4|dp\s*=\s*4/.test(ctx.code) && !/DP.*?15|dpId.*?15|101/.test(ctx.code),
    suggestedFix: 'Use UnifiedBatteryHandler.getTuyaBatteryDPs() to differentiate 4/15/101/14/3',
    autoFixable: false,
    reference: 'P14',
  },
  {
    id: 'TUYA-002',
    category: 'tuya',
    severity: 'medium',
    name: 'Tuya battery_state enum 0/1/2 not mapped',
    description: 'Tuya state: 0=low=10%, 1=med=50%, 2=high=100%',
    predicate: (ctx) => ctx.code && /DP\s*[=:]\s*3|dp\s*=\s*3/.test(ctx.code) && !/0.*?10|1.*?50|2.*?100/.test(ctx.code),
    suggestedFix: 'Map state to percent: 0→10, 1→50, 2→100',
    autoFixable: false,
  },

  // ─── ZIGBEE CLUSTER (P24.8) ────────────────────────────────────────────
  {
    id: 'ZIG-001',
    category: 'zigbee',
    severity: 'high',
    name: 'Missing powerConfiguration cluster (battery device)',
    description: 'Battery device must have cluster 0x0001 (powerConfiguration) for ZCL battery',
    predicate: (ctx) => ctx.code && /measure_battery/.test(ctx.code) && /clusters/.test(ctx.code) && !/0x0001|1[^0-9]/.test(ctx.code),
    suggestedFix: 'Add cluster 0x0001 (powerConfiguration) to endpoints config',
    autoFixable: false,
  },
  {
    id: 'ZIG-002',
    category: 'zigbee',
    severity: 'medium',
    name: 'Cluster 0x0006 (onOff) on EP1 only for multi-gang',
    description: 'Multi-gang switches (TS0003 etc.) need EP2, EP3, EP4 with cluster 6',
    predicate: (ctx) => ctx.code && /TS0003|TS0004/.test(ctx.code) && /"1":\s*\{[^}]*"clusters":\s*\[[^\]]*6/.test(ctx.code) && !/"2":\s*\{[^}]*"clusters":\s*\[[^\]]*6/.test(ctx.code),
    suggestedFix: 'Add endpoints 2, 3, 4 with cluster 6 (onOff) for sub-gangs',
    autoFixable: false,
  },

  // ─── FORUM CROSS-REF (P22, P26.6) ─────────────────────────────────────
  {
    id: 'FAM-001',
    category: 'famous-issue',
    severity: 'high',
    name: 'SEDEA eTH730 not recognized',
    description: 'Forum #147569: SEDEA eTH730 (Tuya whitelabel) was missing from climate_sensor',
    predicate: (ctx) => ctx.code && /SEDEA|sedea.*?eth730|_TZE200_kb5noeto/i.test(ctx.code),
    suggestedFix: 'Verify _TZE200_kb5noeto + _TZE200_lsanae15 in climate_sensor manufacturerName (P22 fix)',
    autoFixable: false,
    reference: 'P22-#147569',
  },
  {
    id: 'FAM-002',
    category: 'famous-issue',
    severity: 'high',
    name: '9xfjixap thermostat not recognized',
    description: 'Forum #145056: 9xfjixap was mapped to button_wireless, should be thermostatic_radiator_valve',
    predicate: (ctx) => ctx.code && (ctx.mfr === '_TZE200_9xfjixap' || (ctx.code && /_TZE200_9xfjixap/.test(ctx.code))),
    suggestedFix: 'Verify _TZE200_9xfjixap in thermostatic_radiator_valve (P22 fix)',
    autoFixable: false,
    reference: 'P22-#145056',
  },

  // ─── SACRED COUPLE (P21) ───────────────────────────────────────────────
  {
    id: 'SAC-001',
    category: 'sacred-couple',
    severity: 'medium',
    name: 'PID shared across multiple drivers (cross-class)',
    description: 'Same productId in multiple drivers is OK if mfr differs (Sacred Couple rule)',
    predicate: (ctx) => ctx.code && /"productId":\s*\[/.test(ctx.code) && /"_TZE200_|_TZE204_|_TZ3000_|_TZ3210_/.test(ctx.code),
    suggestedFix: 'Cross-check with sacredCouples section in mfs_db — same mfr+pid must be in only one driver',
    autoFixable: false,
    reference: 'P21',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: PREDICTIVE SCANNER
// Detects anti-patterns BEFORE they cause bugs
// ═══════════════════════════════════════════════════════════════════════════════

function predictIssues(ctx) {
  const predictions = [];

  // Pattern 1: Driver compose.json missing mfr but FP has it
  if (ctx.driverCompose && ctx.fingerprints) {
    // Top 200 FPs (most common devices) — only these are critical
    const topFps = Object.entries(ctx.fingerprints).slice(0, 200);
    for (const [mfr, fp] of topFps) {
      const driver = ctx.driverCompose[fp.driverId];
      if (driver && !driver.manufacturerName?.some(m => m.toLowerCase() === mfr.toLowerCase())) {
        predictions.push({
          type: 'fp-mfr-not-in-compose',
          severity: 'medium',
          mfr,
          driver: fp.driverId,
          message: `Predict: "${mfr}" (top-200 FP) for ${fp.driverId} not in driver.compose.json. May work via fingerprints.json but fragile.`,
          suggestedFix: `Add "${mfr}" to ${fp.driverId}/driver.compose.json manufacturerName`,
          confidence: 0.7,
        });
      }
    }
  }

  // Pattern 2: Multiple drivers claiming same mfr (CRITICAL)
  if (ctx.fingerprints) {
    const mfrToDrivers = {};
    for (const [mfr, fp] of Object.entries(ctx.fingerprints)) {
      if (!mfrToDrivers[mfr]) mfrToDrivers[mfr] = new Set();
      mfrToDrivers[mfr].add(fp.driverId);
    }
    for (const [mfr, drivers] of Object.entries(mfrToDrivers)) {
      if (drivers.size > 1) {
        predictions.push({
          type: 'mfr-multiple-drivers',
          severity: 'high',
          mfr,
          drivers: [...drivers],
          message: `Predict: "${mfr}" maps to ${drivers.size} different drivers: ${[...drivers].join(', ')}. Homey will pick the wrong one.`,
          suggestedFix: `Keep "${mfr}" in only one driver (preferred: contact_sensor vs garage_door → garage_door)`,
          confidence: 0.95,
        });
      }
    }
  }

  // Pattern 3: TS0601 in many drivers (cross-class collision)
  if (ctx.driverCompose) {
    const ts0601Drivers = [];
    for (const [drvId, drv] of Object.entries(ctx.driverCompose)) {
      if (drv.productId?.includes('TS0601')) ts0601Drivers.push(drvId);
    }
    if (ts0601Drivers.length > 5) {
      predictions.push({
        type: 'ts0601-too-many-drivers',
        severity: 'medium',
        drivers: ts0601Drivers.length,
        message: `Predict: TS0601 productId is in ${ts0601Drivers.length} drivers. Sacred Couple rule requires mfr+pid disambiguation.`,
        suggestedFix: `Check sacredCouples matrix in mfs_db for each TS0601 mfr`,
        confidence: 0.8,
      });
    }
  }

  return predictions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ENGINE API
// ═══════════════════════════════════════════════════════════════════════════════

function diagnose(ctx) {
  const issues = [];
  for (const rule of RULES) {
    try {
      if (rule.predicate(ctx)) {
        issues.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          name: rule.name,
          description: rule.description,
          suggestedFix: rule.suggestedFix,
          autoFixable: rule.autoFixable,
          reference: rule.reference || null,
        });
      }
    } catch (e) { /* predicate error - skip */ }
  }
  return issues;
}

function autoFix(ctx) {
  const fixed = [];
  for (const rule of RULES) {
    if (!rule.autoFixable || !rule.fixFn) continue;
    try {
      if (rule.predicate(ctx)) {
        const newCode = rule.fixFn(ctx);
        if (newCode !== ctx.code) {
          fixed.push({
            id: rule.id,
            name: rule.name,
            diff: { before: ctx.code, after: newCode },
          });
          ctx.code = newCode;
        }
      }
    } catch (e) { /* skip */ }
  }
  return fixed;
}

function getRulesByCategory() {
  const grouped = {};
  for (const r of RULES) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }
  return grouped;
}

function getRulesBySeverity(severity) {
  return RULES.filter(r => r.severity === severity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: AI BONUS LAYER (optional, never blocking)
// ═══════════════════════════════════════════════════════════════════════════════

async function callAI(prompt, options = {}) {
  // Try multiple AI sources in order, with budget caps
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const minimaxKey = process.env.MINIMAX_API_KEY || process.env.MINIMAX_API_KEY;  // P35
  const maxTokens = options.maxTokens || 800;

  const providers = [];

  // Tier 0: MiniMax (M3 unlimited — user has unlimited subscription, P35)
  if (minimaxKey) {
    providers.push({
      name: 'MiniMax',
      url: 'https://api.MiniMax.chat/v1/text/chatcompletion_v2',
      headers: { 'Authorization': `Bearer ${minimaxKey}` },
      body: { model: 'MiniMax-M3', max_tokens: maxTokens, temperature: 0.7 },
      transformRequest: (messages) => ({
        group_id: 'p35-battery-master',
        model: 'MiniMax-M3',
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      transformResponse: (data) => data.choices?.[0]?.message?.content || data.text || data.content?.[0]?.text,
    });
  }

  if (githubToken) {
    providers.push({
      name: 'github-models',
      url: 'https://models.inference.ai.azure.com/chat/completions',
      headers: { 'Authorization': `Bearer ${githubToken}` },
      body: { model: 'gpt-4o-mini', max_tokens: maxTokens },
    });
  }
  if (openaiKey) {
    providers.push({
      name: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: { model: 'gpt-4o-mini', max_tokens: maxTokens },
    });
  }
  if (anthropicKey) {
    providers.push({
      name: 'anthropic',
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: { model: 'claude-3-5-sonnet-20241022', max_tokens: maxTokens },
    });
  }

  for (const provider of providers) {
    try {
      const messages = [{ role: 'user', content: prompt }];
      const body = provider.transformRequest
        ? provider.transformRequest(messages)
        : { ...provider.body, messages };
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: { ...provider.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 10s hard limit
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = provider.transformResponse
        ? provider.transformResponse(data)
        : data.choices?.[0]?.message?.content || data.content?.[0]?.text;
      if (content) {
        return { provider: provider.name, content };
      }
    } catch (e) {
      continue; // try next provider
    }
  }
  return null; // all providers failed or unavailable — silent fallback
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  RULES,
  diagnose,
  autoFix,
  predictIssues,
  getRulesByCategory,
  getRulesBySeverity,
  callAI,
  version: '1.0.0',
  rulesCount: RULES.length,
  categories: [...new Set(RULES.map(r => r.category))],
  severities: [...new Set(RULES.map(r => r.severity))],
};
