#!/usr/bin/env node
/**
 * P31.2 — Offline Crash/Diagnostic Analyzer
 *
 * Pure heuristic engine. No AI required. Works 100% offline.
 *
 * Reads:
 * - .github/state/crash-details.json (98 crashes with stacks from P18)
 * - .github/state/all-diagnostics-XXXX/  (raw diagnostic reports)
 * - .github/state/johan-dump/  (read-only Johan dump)
 * - .github/state/activity-snapshot.json (recent activity)
 *
 * Output: actionable fix proposals ranked by confidence.
 *
 * Pattern matching is based on observed bugs from:
 * - P14 GitHub issue #511 (soil_sensor DP mismatch)
 * - P18 fresh emails (98 crash reports)
 * - P19.1 backward analysis (setTimeout, _destroyed)
 * - P21 Sacred Couples (mfr+pid pair disambiguates)
 * - P22 Forum cross-ref (SEDEA, 9xfjixap)
 * - P23-P30 historical fixes
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const stateDir = path.join(repoRoot, '.github', 'state');
const outputFile = path.join(stateDir, 'crash-analysis.json');

// ─── PATTERN LIBRARY (heuristic, hand-crafted) ──────────────────
// Each pattern has: name, matchers (regex), severity, suggested_fix
// This is the heart of the offline analyzer.
const PATTERN_LIBRARY = [
  {
    id: 'setTimeout-on-destroyed',
    name: 'setTimeout on destroyed device',
    severity: 'high',
    patterns: [
      /setTimeout.*?_destroyed/i,
      /Cannot read.*?_destroyed/i,
      /setTimeout is not a function/i,
    ],
    description: 'setTimeout called on device after it was destroyed (race condition)',
    suggestedFix: 'Apply safe-timers (P19): use safeSetTimeout from lib/utils/safe-timers.js',
    confidence: 0.95,
    autoFixable: true,
    fixPath: 'lib/utils/safe-timers.js',
  },
  {
    id: 'missing-capability-listener',
    name: 'Missing Capability Listener',
    severity: 'medium',
    patterns: [
      /Missing Capability Listener: (\w+)/i,
      /No.*?capability.*?listener.*?(\w+)/i,
    ],
    description: 'Device has capability X but no listener registered',
    suggestedFix: 'Add registerCapabilityListener call in device.js onNodeInit',
    confidence: 0.9,
    autoFixable: false,
    detectCapability: (m) => m.match(/Missing Capability Listener: (\w+)/i)?.[1],
  },
  {
    id: 'missing-driver-fingerprint',
    name: 'Missing manufacturer fingerprint',
    severity: 'high',
    patterns: [
      /manufacturerName.*?not found/i,
      /Unknown.*?manufacturer/i,
      /not in any.*?driver/i,
      /TS0601.*?not supported/i,
    ],
    description: 'Device manufacturer not in any driver.compose.json',
    suggestedFix: 'Add manufacturer to fingerprints.json + driver.compose.json manufacturerName',
    confidence: 0.85,
    autoFixable: true,
    detectMfr: (m) => m.match(/_(?:TZE\d{3}|TZ\d{4})_[a-z0-9]+/i)?.[0],
  },
  {
    id: 'battery-question-mark',
    name: 'Battery shows ?',
    severity: 'medium',
    patterns: [
      /battery.*?\?/i,
      /measure_battery.*?null/i,
      /battery not reported/i,
      /battery.*?always.*?0/i,
    ],
    description: 'Battery capability not updated (sleepy device, sentinel 255, or wrong scale)',
    suggestedFix: 'Apply UniversalBatteryFallback (P28) — handles all 7 value scales',
    confidence: 0.9,
    autoFixable: true,
    fixPath: 'lib/battery/UniversalBatteryFallback.js',
  },
  {
    id: 'battery-stuck-100',
    name: 'Battery stuck at 100%',
    severity: 'medium',
    patterns: [
      /battery.*?100.*?forever/i,
      /battery.*?stuck.*?100/i,
      /always reports.*?100/i,
    ],
    description: 'Battery always reports 100% (Tuya 200% sentinel not handled)',
    suggestedFix: 'Apply 200% sentinel fix (P19.1, commit a234bcf32) + treat200AsSentinel option',
    confidence: 0.85,
    autoFixable: true,
  },
  {
    id: 'battery-stuck-0',
    name: 'Battery stuck at 0%',
    severity: 'medium',
    patterns: [
      /battery.*?0.*?always/i,
      /battery.*?stuck.*?0/i,
    ],
    description: 'Battery always reports 0% (voltage-derived issue)',
    suggestedFix: 'Check voltage curve in UnifiedBatteryHandler.normalizeZigbeeValue',
    confidence: 0.7,
    autoFixable: false,
  },
  {
    id: 'sub-capability-issue',
    name: 'Sub-capability not linked',
    severity: 'high',
    patterns: [
      /sub.?cap/i,
      /onoff\.\d+.*?not.*?linked/i,
      /onoff\.gang\d.*?broken/i,
      /Turn on Gang \d+.*?not work/i,
    ],
    description: 'Sub-capabilities (onoff.gang2, etc.) not in driver.compose.json',
    suggestedFix: 'Verify driverId in fingerprints.json — may route to 1-gang instead of 3-gang',
    confidence: 0.9,
    autoFixable: true,
  },
  {
    id: 'button-mode-issue',
    name: 'Button mode (scene/dimmer) not detected',
    severity: 'medium',
    patterns: [
      /scene mode/i,
      /dimmer mode/i,
      /attribute.*?0x8004/i,
      /0x8004.*?not working/i,
    ],
    description: 'Device stuck in dimmer mode, needs scene mode (attribute 0x8004=1)',
    suggestedFix: 'Use setButtonMode(1) from ButtonDevice — default = scene (P28)',
    confidence: 0.85,
    autoFixable: true,
  },
  {
    id: 'wrong-driver-routing',
    name: 'Wrong driver routes device',
    severity: 'high',
    patterns: [
      /pairs.*?as.*?wrong/i,
      /recognized.*?as.*?but.*?should/i,
      /should be.*?driver/i,
      /wrong.*?driver/i,
    ],
    description: 'Device is paired as the wrong driver (FP collision or missing FP)',
    suggestedFix: 'Check fingerprints.json driverId + driver.compose.json manufacturerName match',
    confidence: 0.85,
    autoFixable: true,
  },
  {
    id: 'sos-button-missing',
    name: 'SOS button contact sensor missing',
    severity: 'low',
    patterns: [
      /SOS.*?not.*?contact/i,
      /SOS.*?missing.*?alarm/i,
    ],
    description: 'SOS device should also report alarm_contact',
    suggestedFix: 'Verify in ButtonDevice._isHybridButtonContactDevice — check mfr list',
    confidence: 0.8,
    autoFixable: false,
  },
  {
    id: 'flow-card-unlinked',
    name: 'Flow card not linked to action',
    severity: 'high',
    patterns: [
      /Invalid Flow Card ID/i,
      /flow.*?card.*?not.*?found/i,
      /registerRunListener.*?not a function/i,
      /registerRunListenerasync/i,
    ],
    description: 'Flow card registered but no listener attached',
    suggestedFix: 'Add card.registerRunListener(handler) in driver.js flow card setup',
    confidence: 0.95,
    autoFixable: true,
  },
  {
    id: 'class-extends-broken',
    name: 'Class extends value undefined',
    severity: 'high',
    patterns: [
      /Class extends value.*?undefined/i,
      /Class extends value.*?is not (a )?(constructor|function)/i,
    ],
    description: 'A base class is undefined or not a constructor',
    suggestedFix: 'Apply ClassExtendsGuard (P24.7) — falls back to bare ZigBeeDevice',
    confidence: 0.95,
    autoFixable: true,
    fixPath: 'lib/utils/ClassExtendsGuard.js',
  },
  {
    id: 'unhandled-rejection',
    name: 'Unhandled Promise Rejection',
    severity: 'medium',
    patterns: [
      /UnhandledPromiseRejectionWarning/i,
      /Unhandled promise rejection/i,
    ],
    description: 'Async code path without catch',
    suggestedFix: 'Wrap async calls in try/catch with logger.error()',
    confidence: 0.7,
    autoFixable: false,
  },
  {
    id: 'capability-conflict',
    name: 'SDK v3 capability conflict',
    severity: 'medium',
    patterns: [
      /measure_battery.*?alarm_battery.*?conflict/i,
      /SDK v3.*?capability/i,
    ],
    description: 'measure_battery + alarm_battery on same device (SDK3 conflict)',
    suggestedFix: 'Remove alarm_battery (P25 commit 5fb989c69) — use only measure_battery',
    confidence: 0.95,
    autoFixable: true,
  },
  {
    id: 'tuya-dp-missing',
    name: 'Tuya DP not handled',
    severity: 'high',
    patterns: [
      /DP\d+.*?not handled/i,
      /unknown.*?data point/i,
      /Unbound.*?DP/i,
    ],
    description: 'Tuya device reports a DP that no driver handles',
    suggestedFix: 'Add DP to TuyaEF00Manager or driver.flow.compose.json',
    confidence: 0.8,
    autoFixable: false,
  },
  {
    id: 'mains-stuck-on-battery',
    name: 'Mains device shows battery capability',
    severity: 'medium',
    patterns: [
      /mains.*?battery.*?capability/i,
      /battery.*?on.*?AC.*?device/i,
    ],
    description: 'Device is mains powered but has measure_battery (SDK3 conflict)',
    suggestedFix: 'Set mainsPowered=true in onNodeInit + remove measure_battery',
    confidence: 0.9,
    autoFixable: true,
  },
  {
    id: 'water-timer-misroute',
    name: 'Water timer routed to climate sensor',
    severity: 'high',
    patterns: [
      /water.*?timer.*?climate/i,
      /Immax.*?Neo.*?smart.*?water/i,
      /irrigation.*?missing/i,
    ],
    description: 'Water timer device routes to climate_sensor instead of valve_irrigation',
    suggestedFix: 'Update FP in fingerprints.json to valve_irrigation (P29 fix #135)',
    confidence: 0.95,
    autoFixable: true,
  },
  {
    id: 'garage-door-misroute',
    name: 'Garage door routed to contact sensor',
    severity: 'high',
    patterns: [
      /garage.*?contact.*?sensor/i,
      /garage.*?not.*?open.*?close/i,
    ],
    description: 'Garage door routes to contact_sensor (battery!) instead of garage_door (mains)',
    suggestedFix: 'Update FP in fingerprints.json to garage_door (P29 fix #128)',
    confidence: 0.95,
    autoFixable: true,
  },
  {
    id: 'ts0003-sub-cap',
    name: 'TS0003 sub-capability flow cards unlinked',
    severity: 'high',
    patterns: [
      /TS0003.*?sub.?cap/i,
      /TS0003.*?onoff\.gang/i,
    ],
    description: '3-gang TS0003 routes to switch_1gang (wrong driver) → onoff.gang2/3 missing',
    suggestedFix: 'Update FP _TZ3000_v4l4b0lp to switch_3gang (P29 fix #170)',
    confidence: 0.95,
    autoFixable: true,
  },
  {
    id: 'ts0044-4button',
    name: 'TS0044 4-button not pairing',
    severity: 'high',
    patterns: [
      /TS0044.*?not working/i,
      /TS0044.*?4.?button/i,
      /_TZ3000_u3nv1jwk/i,
    ],
    description: 'TS0044 4-button remote not working — needs scene mode',
    suggestedFix: 'P28 default=scene + P27.1 multi-endpoint pattern',
    confidence: 0.85,
    autoFixable: true,
  },
];

// ─── CRASH DATA ANALYSIS ─────────────────────────────────────────
function analyzeCrashes() {
  const crashFile = path.join(stateDir, 'crash-details.json');
  if (!fs.existsSync(crashFile)) return { crashes: [], summary: {} };

  const raw = JSON.parse(fs.readFileSync(crashFile, 'utf8'));
  const matches = [];

  // Format 1: { topPatterns: [{pattern, count, sample, stack}] }
  if (raw.topPatterns && Array.isArray(raw.topPatterns)) {
    for (const p of raw.topPatterns) {
      const text = `${p.pattern} ${p.sample || ''} ${p.stack || ''}`;
      for (const pattern of PATTERN_LIBRARY) {
        for (const re of pattern.patterns) {
          if (re.test(text)) {
            matches.push({
              crashId: `topPattern:${p.pattern.substring(0, 50)}`,
              type: 'topPattern',
              message: p.pattern,
              count: p.count,
              stack: p.stack,
              pattern: pattern.id,
              name: pattern.name,
              severity: pattern.severity,
              description: pattern.description,
              suggestedFix: pattern.suggestedFix,
              confidence: pattern.confidence,
              autoFixable: pattern.autoFixable,
            });
            break;
          }
        }
      }
    }
  }

  // Format 2: Array of crash objects
  if (Array.isArray(raw)) {
    for (const crash of raw) {
      const text = JSON.stringify(crash);
      for (const pattern of PATTERN_LIBRARY) {
        for (const re of pattern.patterns) {
          if (re.test(text)) {
            matches.push({
              crashId: crash.id || crash.timestamp || 'unknown',
              type: crash.type || 'unknown',
              message: crash.message || crash.error || '',
              stack: crash.stack ? crash.stack.split('\n').slice(0, 3).join('\n') : '',
              pattern: pattern.id,
              name: pattern.name,
              severity: pattern.severity,
              description: pattern.description,
              suggestedFix: pattern.suggestedFix,
              confidence: pattern.confidence,
              autoFixable: pattern.autoFixable,
            });
            break;
          }
        }
      }
    }
  }

  // Format 3: Object with crashes array
  if (raw.crashes && Array.isArray(raw.crashes)) {
    for (const crash of raw.crashes) {
      const text = JSON.stringify(crash);
      for (const pattern of PATTERN_LIBRARY) {
        for (const re of pattern.patterns) {
          if (re.test(text)) {
            matches.push({
              crashId: crash.id || crash.timestamp || 'unknown',
              type: crash.type || 'unknown',
              message: crash.message || crash.error || '',
              stack: crash.stack ? crash.stack.split('\n').slice(0, 3).join('\n') : '',
              pattern: pattern.id,
              name: pattern.name,
              severity: pattern.severity,
              description: pattern.description,
              suggestedFix: pattern.suggestedFix,
              confidence: pattern.confidence,
              autoFixable: pattern.autoFixable,
            });
            break;
          }
        }
      }
    }
  }

  return { crashes: matches, summary: summarize(matches) };
}

function summarize(matches) {
  const byPattern = {};
  const bySeverity = { high: 0, medium: 0, low: 0 };
  let autoFixable = 0;
  for (const m of matches) {
    byPattern[m.pattern] = (byPattern[m.pattern] || 0) + 1;
    bySeverity[m.severity]++;
    if (m.autoFixable) autoFixable++;
  }
  return { total: matches.length, byPattern, bySeverity, autoFixable };
}

// ─── DIAGNOSTIC ANALYSIS (raw text files) ───────────────────────
function analyzeDiagnostics() {
  const results = [];
  const diagDirs = fs.readdirSync(stateDir).filter(d => d.startsWith('diagnostics') || d.startsWith('all-diagnostics') || d.startsWith('emails'));

  for (const d of diagDirs) {
    const fullPath = path.join(stateDir, d);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    for (const f of fs.readdirSync(fullPath).slice(0, 50)) {
      if (!f.endsWith('.json') && !f.endsWith('.txt')) continue;
      try {
        const content = fs.readFileSync(path.join(fullPath, f), 'utf8').substring(0, 100000);
        for (const pattern of PATTERN_LIBRARY) {
          for (const re of pattern.patterns) {
            if (re.test(content)) {
              results.push({
                file: `${d}/${f}`,
                pattern: pattern.id,
                name: pattern.name,
                severity: pattern.severity,
                suggestedFix: pattern.suggestedFix,
                confidence: pattern.confidence,
              });
              break;
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  return { diagnostics: results.slice(0, 200), summary: summarize(results) };
}

// ─── MAIN ────────────────────────────────────────────────────────
function main() {
  console.log('🔍 P31.2 — Offline Crash/Diagnostic Analyzer');
  console.log('═'.repeat(60));
  console.log('Pattern library:', PATTERN_LIBRARY.length, 'patterns loaded');
  console.log('Engine: 100% offline heuristic, no AI required');
  console.log('');

  console.log('📂 Analyzing crashes...');
  const crashResults = analyzeCrashes();
  console.log(`  Total crashes analyzed: ${crashResults.crashes.length}`);
  console.log(`  Auto-fixable: ${crashResults.summary.autoFixable || 0}`);
  console.log(`  By severity: high=${crashResults.summary.bySeverity?.high || 0}, medium=${crashResults.summary.bySeverity?.medium || 0}, low=${crashResults.summary.bySeverity?.low || 0}`);

  console.log('');
  console.log('📂 Analyzing diagnostics...');
  const diagResults = analyzeDiagnostics();
  console.log(`  Total diagnostic matches: ${diagResults.diagnostics.length}`);

  // Build final report
  const report = {
    generatedAt: new Date().toISOString(),
    engine: 'offline-heuristic-v1.0',
    noAIRequired: true,
    patternLibrarySize: PATTERN_LIBRARY.length,
    crashes: crashResults,
    diagnostics: diagResults,
    topRecommendations: buildTopRecommendations(crashResults, diagResults),
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log('');
  console.log('─'.repeat(60));
  console.log('TOP RECOMMENDATIONS:');
  for (const rec of report.topRecommendations.slice(0, 10)) {
    console.log(`  [${rec.severity.toUpperCase()}] ${rec.name}`);
    console.log(`    ${rec.suggestedFix}`);
  }
  console.log('─'.repeat(60));
  console.log('Report:', outputFile, `(${Math.round(fs.statSync(outputFile).size / 1024)}KB)`);
}

function buildTopRecommendations(crashResults, diagResults) {
  const all = [...(crashResults.crashes || []), ...(diagResults.diagnostics || [])];
  const recs = new Map();
  for (const m of all) {
    if (!recs.has(m.pattern)) {
      recs.set(m.pattern, {
        pattern: m.pattern,
        name: m.name,
        severity: m.severity,
        description: m.description,
        suggestedFix: m.suggestedFix,
        autoFixable: m.autoFixable,
        confidence: m.confidence,
        occurrences: 0,
      });
    }
    recs.get(m.pattern).occurrences++;
  }
  return [...recs.values()].sort((a, b) => {
    const sevOrder = { high: 3, medium: 2, low: 1 };
    if (sevOrder[b.severity] !== sevOrder[a.severity]) return sevOrder[b.severity] - sevOrder[a.severity];
    return b.occurrences - a.occurrences;
  });
}

if (require.main === module) {
  main();
}

module.exports = { PATTERN_LIBRARY, analyzeCrashes, analyzeDiagnostics, buildTopRecommendations };
