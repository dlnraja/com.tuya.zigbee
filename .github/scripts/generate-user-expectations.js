#!/usr/bin/env node
'use strict';
// v5.11.29: generate-user-expectations.js — Dynamic user/device tracking + decision reference
// Reads: drivers, .homeychangelog.json, app.json, all .github/state/*.json, interviews
// Outputs: docs/rules/USER_DEVICE_EXPECTATIONS.md + .github/state/expectations-ref.json
// Other scripts CONSULT expectations-ref.json before making driver/device decisions
// Run: node .github/scripts/generate-user-expectations.js

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DDIR = path.join(ROOT, 'drivers');
const DOCS = path.join(ROOT, 'docs', 'rules');
const UDE_PATH = path.join(DOCS, 'USER_DEVICE_EXPECTATIONS.md');
const SD = path.join(ROOT, '.github', 'state');
const REF_JSON = path.join(SD, 'expectations-ref.json');

// --- Load data ---
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const ver = app.version;
const date = new Date().toISOString().split('T')[0];

let stats = {};
try { stats = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'scripts', '_stats.json'), 'utf8')); } catch (e) {}

let cl = {};
try { cl = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8')); } catch (e) {}

let interviews = { interviews: {} };
try { interviews = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'data', 'DEVICE_INTERVIEWS.json'), 'utf8')); } catch (e) {}

// --- Collect all fingerprints from drivers ---
const allFPs = new Set();
const driverFPMap = {};
const dirs = fs.readdirSync(DDIR).filter(d => fs.existsSync(path.join(DDIR, d, 'driver.compose.json')));
for (const d of dirs) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(DDIR, d, 'driver.compose.json'), 'utf8'));
    const fps = (c.zigbee && c.zigbee.manufacturerName) || [];
    fps.forEach(fp => { allFPs.add(fp); driverFPMap[fp] = d; });
  } catch (e) {}
}

// --- Parse existing nightly scan sections ---
let nightlySections = '';
let autoDiscovered = '';
try {
  const existing = fs.readFileSync(UDE_PATH, 'utf8');
  // Extract all nightly auto-scan sections
  const nightlyRe = /## Nightly Auto-Scan \(\d{4}-\d{2}-\d{2}\)\n[\s\S]*?(?=\n## |\n---|\n$)/g;
  const nightlyMatches = existing.match(nightlyRe);
  if (nightlyMatches) {
    nightlySections = nightlyMatches.join('\n\n');
  }
  // Extract auto-discovered sections
  const autoRe = /## Auto-discovered from GitHub[\s\S]*?(?=\n## |\n---|\n$)/g;
  const autoMatches = existing.match(autoRe);
  if (autoMatches) {
    autoDiscovered = autoMatches.join('\n\n');
  }
} catch (e) {}

// --- Extract unique FPs from nightly sections + verify ---
const fpRe = /`(_T[A-Z0-9]+_[a-z0-9]+)`/g;
const nightlyFPs = new Set();
let m;
while ((m = fpRe.exec(nightlySections)) !== null) nightlyFPs.add(m[1]);
while ((m = fpRe.exec(autoDiscovered)) !== null) nightlyFPs.add(m[1]);

const verifiedFPs = [];
const missingFPs = [];
for (const fp of nightlyFPs) {
  if (allFPs.has(fp)) {
    verifiedFPs.push({ fp, driver: driverFPMap[fp] });
  } else {
    missingFPs.push(fp);
  }
}

// --- Build user profiles (static enriched data) ---
const userProfiles = [
  {
    name: 'Lasse_K', devices: 'Water leak, Contact, HOBEIAN ZG-222Z, ZG-102Z',
    status: 'FIXED v5.11.16', fixes: 9,
    timeline: [
      { ver: '5.5.645', fix: 'IAS alarm parsing' },
      { ver: '5.5.713', fix: 'Water invert' },
      { ver: '5.5.918', fix: 'Contact auto-invert' },
      { ver: '5.5.973', fix: 'XOR logic' },
      { ver: '5.8.28', fix: 'IAS enrollment' },
      { ver: '5.8.85', fix: 'Double-inversion bug' },
      { ver: '5.8.88', fix: 'HOBEIAN fingerprints' },
      { ver: '5.9.9', fix: 'Numeric cluster 0x0500' },
      { ver: '5.11.16', fix: 'IASAlarmFallback bypass ROOT CAUSE' },
    ]
  },
  {
    name: 'Peter_van_Werkhoven', devices: 'HOBEIAN ZG-204ZV (5-in-1 Multisensor)',
    status: 'STABLE v5.7.45', fixes: 7,
    timeline: [
      { ver: '5.5.841', fix: 'SOS DP17/18' },
      { ver: '5.5.907', fix: 'Battery auto-add' },
      { ver: '5.5.929', fix: 'Distance auto-divisor' },
      { ver: '5.5.984', fix: 'Permissive variant mode' },
      { ver: '5.5.986', fix: 'Lux smoothing' },
      { ver: '5.5.987', fix: 'Humidity multiplier' },
      { ver: '5.7.34', fix: 'Mfr fallback config' },
    ]
  },
  {
    name: '4x4_Pete', devices: 'HOBEIAN ZG-204ZM (Radar), ZG-204ZL (PIR)',
    status: 'FIXED v5.8.88', fixes: 5,
    timeline: [
      { ver: '5.5.364', fix: 'Duplicate productId' },
      { ver: '5.5.983', fix: 'Battery DP throttle' },
      { ver: '5.8.30', fix: 'Passive DP listeners' },
      { ver: '5.8.87', fix: 'noIasMotion ZCL check' },
      { ver: '5.8.88', fix: 'IAS enrollment + ZCL-only override' },
    ]
  },
  {
    name: 'Hartmut_Dunker', devices: 'BSEED TS0726 4-gang `_TZ3002_pzao9ls1`',
    status: 'FIXED v5.11.29', fixes: 5,
    timeline: [
      { ver: '5.5.718', fix: 'Bidirectional bindings' },
      { ver: '5.8.25', fix: 'Case-sensitivity fix' },
      { ver: '5.8.27', fix: 'EP2-4 DP fallback' },
      { ver: '5.9.23', fix: 'GROUP ISOLATION (Z2M #27167)' },
      { ver: '5.11.29', fix: 'writeAttributes per-EP fix (Z2M #27167, ZHA #2443, ZHA #1580)' },
    ]
  },
  {
    name: 'Pieter_Pessers', devices: 'BSEED 1/2/3-gang `_TZ3000_l9brjwau` `_TZ3000_blhvsaqf` `_TZ3000_qkixdnon`',
    status: 'FIXED v5.5.970', fixes: 2,
    timeline: [
      { ver: '5.5.913', fix: 'PR#118 packetninja' },
      { ver: '5.5.970', fix: 'Fingerprints added' },
    ]
  },
  {
    name: 'Freddyboy', devices: 'Moes TS0044 `_TZ3000_zgyzgdua`',
    status: 'NEEDS DIAG v5.11.25', fixes: 4,
    timeline: [
      { ver: '5.5.714', fix: 'E000 cluster' },
      { ver: '5.7.35', fix: 'Universal button' },
      { ver: '5.7.48', fix: 'Dedup ghost presses' },
      { ver: '5.8.24', fix: 'Cluster registration' },
    ]
  },
  {
    name: 'Cam', devices: 'TS0041 `_TZ3000_5bpeda8u`',
    status: 'NEEDS DIAG v5.11.25', fixes: 2,
    timeline: [
      { ver: '5.8.24', fix: 'TuyaE000 detection' },
      { ver: '5.8.66', fix: 'E000 BoundCluster' },
    ]
  },
  {
    name: 'Karsten_Hille', devices: 'Climate sensor',
    status: 'FIXED v5.8.29', fixes: 1,
    timeline: [
      { ver: '5.8.29', fix: 'Skip inference if device has mapped DPs' },
    ]
  },
  {
    name: 'FinnKje', devices: 'Presence sensor',
    status: 'FIXED v5.8.29', fixes: 2,
    timeline: [
      { ver: '5.8.4', fix: 'Holdoff timer 20s no-motion' },
      { ver: '5.8.29', fix: 'Null presence inversion fix' },
    ]
  },
  {
    name: 'blutch32', devices: '`_TZ3000_996rpfy6` TS0203, `_TZE284_81yrt3lo` PJ-1203A, ZG-303Z soil',
    status: 'FIXED v5.8.85', fixes: 3,
    timeline: [
      { ver: '5.7.8', fix: 'Power meter crash fix' },
      { ver: '5.8.28', fix: 'IAS contact enrollment' },
      { ver: '5.8.85', fix: 'Double-inversion bug' },
    ]
  },
  {
    name: 'Eftychis_Georgilas', devices: '`_TZ3000_wkai4ga5` + `_TZ3000_5tqxpine` TS004F',
    status: 'FIXED v5.5.840', fixes: 1,
    timeline: [
      { ver: '5.5.840', fix: 'Fingerprints added' },
    ]
  },
  {
    name: 'Ronny_M', devices: 'HOBEIAN ZG-101ZL, `_TZE284_iadro9bf` presence',
    status: 'FIXED v5.5.926', fixes: 2,
    timeline: [
      { ver: '5.5.715', fix: 'OnOff binding' },
      { ver: '5.5.926', fix: 'Button detection' },
    ]
  },
  {
    name: 'tlink', devices: '`_TZE204_ztqnh5cg` TS0601 presence',
    status: 'FIXED v5.6.0', fixes: 1,
    timeline: [
      { ver: '5.6.0', fix: 'ZCL_ONLY_RADAR config + permissive mode' },
    ]
  },
  {
    name: 'DutchDuke', devices: '`_TZE284_oitavov2` soil sensor',
    status: 'FIXED v5.8.87', fixes: 1,
    timeline: [
      { ver: '5.8.87', fix: 'Temp div10 raw C skip' },
    ]
  },
  {
    name: 'Tividor', devices: 'button_wireless_4 double-press',
    status: 'FIXED v5.9.22', fixes: 2,
    timeline: [
      { ver: '5.9.20', fix: 'OnOffBoundCluster bind per EP + cmd 0xFD' },
      { ver: '5.9.22', fix: 'TuyaPressTypeMap safety guard' },
    ]
  },
  {
    name: 'JJ10', devices: 'Radar presence TS0601',
    status: 'FIXED v5.8.86', fixes: 1,
    timeline: [
      { ver: '5.8.86', fix: 'Ghost temp/hum tiles + ZCL listeners respect noTemp/noHum' },
    ]
  },
  {
    name: 'Ernst02507', devices: 'TS004F smart knob',
    status: 'FIXED v5.6.0', fixes: 1,
    timeline: [
      { ver: '5.6.0', fix: 'Ghost trigger fix GH#113' },
    ]
  },
  {
    name: 'elgato7', devices: '`_TZE204_xu4a5rhj` Longsam curtain',
    status: 'FIXED v5.5.998', fixes: 1,
    timeline: [
      { ver: '5.5.998', fix: 'Curtain GH#122' },
    ]
  },
];

// --- Build pending actions ---
const pending = [
  { user: 'Cam', device: '`_TZ3000_5bpeda8u` TS0041', status: 'NEEDS DIAG', note: 'Update v5.11.25 + re-pair + diag' },
  { user: 'Freddyboy', device: '`_TZ3000_zgyzgdua` TS0044', status: 'NEEDS DIAG', note: 'Update v5.11.25 + re-pair + diag' },
  { user: 'Lasse_K', device: 'ZG-102Z contact', status: 'PERSISTENT', note: 'Still Unknown Zigbee on v5.11.21 (#1463,#1468,#1472,#1476) — FP exists but mfr mismatch, needs interview' },
  { user: 'FrankP', device: 'IR remote learning mode', status: 'NEW BUG', note: 'Learning button turns off immediately (diag b6635c8c) — #1471' },
  { user: 'Peter_Kawa', device: 'Soil sensor capability', status: 'ENHANCEMENT', note: 'Change measure_humidity.soil → measure_moisture (standard cap) — #1473' },
  { user: '7Hills', device: '`_TZE200_vvmbj46n` TS0601', status: 'NEW', note: 'Full interview + diag 822fcb89 posted #1482' },
  { user: 'JJ10', device: 'Radar sensor', status: 'DEFERRED', note: 'Lux/distance/temp incorrect — needs OEM-specific DP mapping' },
  { user: 'Piotr', device: '`_TZ3000_cauq1okq` TS0002', status: 'UNFIXABLE', note: 'Device firmware dual-toggle (Z2M #14750)' },
  { user: 'Ricardo_Lenior', device: 'Ceiling presence 230v', status: 'NEEDS FP', note: 'Only has diag ID, no fingerprint' },
];

// --- Build GitHub issues table ---
const ghIssues = [
  { num: 137, author: 'Pollepa/Slawek_Pe', desc: '`_TZ3210_w0qqde0g` voltage divisor 10x low', status: 'FIXED v5.11.25' },
  { num: 135, author: 'Domingoso', desc: '`_TZE200_xlppj4f5` wrong driver (climate→valve)', status: 'FIXED v5.11.25' },
  { num: 136, author: 'auto', desc: '17 new community FPs', status: 'NEEDS INTERVIEWS' },
  { num: 133, author: 'auto', desc: '13 new community FPs', status: 'NEEDS INTERVIEWS' },
  { num: 128, author: 'Wuma68', desc: '`_TZE204_nklqjk62` garage door', status: 'FP EXISTS' },
  { num: 127, author: 'Tauno20', desc: '`_TZE204_e5m9c5hl` WZ-M100 radar', status: 'FIXED v5.8.87' },
  { num: 126, author: 'azkysmarthome', desc: '`_TZ3000_zutizvyk` TS0203 contact', status: 'FP EXISTS' },
  { num: 124, author: 'Lalla80111', desc: 'Uppercase TZ fingerprints', status: 'FP EXISTS' },
  { num: 122, author: 'elgato7', desc: '`_TZE204_xu4a5rhj` Longsam curtain', status: 'FIXED v5.8.88' },
  { num: 121, author: 'DAVID9SE', desc: '`_TZ3000_an5rjiwd` wrong driver', status: 'FIXED v5.8.88' },
  { num: 120, author: 'packetninja', desc: 'Physical button flow cards PR', status: 'MERGED' },
  { num: 113, author: 'Ernst02507', desc: 'TS004F ghost triggers', status: 'FIXED v5.6.0' },
  { num: 110, author: 'Pollepa', desc: 'TS011F metering empty', status: 'FIXED v5.8.91' },
];

// --- Dynamic: Load pattern data, interview summary, forum state ---
let patternData = { suggestions: [] };
try { patternData = JSON.parse(fs.readFileSync(path.join(SD, 'pattern-data.json'), 'utf8')); } catch {}

let interviewSummary = { totalInterviews: 0, uniqueFingerprints: [] };
try { interviewSummary = JSON.parse(fs.readFileSync(path.join(SD, 'interview-summary.json'), 'utf8')); } catch {}

let forumState = { topics: {}, replyLog: [] };
try { forumState = JSON.parse(fs.readFileSync(path.join(SD, 'forum-state.json'), 'utf8')); } catch {}

// --- Decision Reference: Best implementation choices (avoid repeating mistakes) ---
const decisions = [
  { device: 'USB Zigbee Dongle (USB-powered relay)', driver: 'usb_outlet_advanced',
    wrongDriver: 'switch_2gang', reason: 'USB-powered device, not a wall switch — needs mainsPowered=true, no battery cap',
    research: 'Confirmed via Z2M, device interview shows USB power source, not battery/mains switch',
    ver: '5.11.25' },
  { device: 'BSEED TS0726 4-gang (_TZ3002_pzao9ls1)', driver: 'switch_4gang (ZCL-only)',
    wrongDriver: 'wall_switch_4gang_1way', reason: 'FW broadcasts ZCL cmds to all EPs; fix: writeAttributes per-EP',
    research: 'Z2M #27167, ZHA #2443, ZHA #1580 — confirmed across 3 platforms',
    ver: '5.11.29' },
  { device: 'HOBEIAN ZG-102Z Contact Sensor', driver: 'contact_sensor',
    wrongDriver: 'N/A', reason: 'Mfr name mismatch — device reports different mfr than expected, needs interview',
    research: 'Lasse_K persistent issue #1463-#1476, FP exists but device sends different mfr',
    ver: '5.11.16' },
  { device: 'Mains-powered sensors (_TZE200_8ygsuhe1 Smart Airbox)', driver: 'air_quality_sensor',
    wrongDriver: 'N/A', reason: 'USB-powered but has measure_battery — remove battery cap, set mainsPowered=true',
    research: 'ProductValueValidator CO2 min changed from 300 to 0 for warmup values',
    ver: '5.11.15' },
  { device: 'TS0601 Tuya DP multi-gang switches', driver: 'switch_Ngang',
    wrongDriver: 'N/A', reason: 'Check if device is ZCL-only or Tuya DP — use interview to determine protocol',
    research: 'BSEED/Zemismart are ZCL-only despite TS0601 modelId, Tuya DP ignored',
    ver: '5.9.14' },
];

// --- Build recent changelog ---
const clKeys = Object.keys(cl).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
const recentCL = clKeys.slice(0, 10).map(v => {
  const txt = (cl[v] && (cl[v].en || cl[v])) || '';
  const short = typeof txt === 'string' ? (txt.length > 100 ? txt.slice(0, 97) + '...' : txt) : String(txt).slice(0, 100);
  return `| **v${v}** | ${short} |`;
}).join('\n');

// --- Known patterns ---
const invertedMfrs = ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_oxslv1c9', '_TZ3000_402jjyro', '_TZ3000_2mbfxlzr', '_TZ3000_bzxloft2', '_TZ3000_yxqnffam', '_TZ3000_996rpfy6'];
const bseedZCL = ['_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'];

// --- Generate markdown ---
const fmt = n => typeof n === 'number' ? n.toLocaleString('en-US') : n;

const profilesTable = userProfiles.map(p => {
  const tl = p.timeline.map(t => `v${t.ver}: ${t.fix}`).join(' → ');
  return `### ${p.name} (${p.fixes} fixes)\n**Devices**: ${p.devices}\n**Status**: ${p.status}\n**Timeline**: ${tl}\n`;
}).join('\n');

const pendingTable = pending.map(p =>
  `| ${p.user} | ${p.device} | **${p.status}** | ${p.note} |`
).join('\n');

const ghTable = ghIssues.map(i =>
  `| #${i.num} | ${i.author} | ${i.desc} | **${i.status}** |`
).join('\n');

const fpVerification = `**Verified**: ${verifiedFPs.length} fingerprints from user reports found in drivers\n` +
  (missingFPs.length > 0 ? `**Missing** (${missingFPs.length}): \`${missingFPs.join('`, `')}\`\n` : '**Missing**: 0 — all user-reported fingerprints are supported\n');

const md = `# User Device Expectations — Universal Tuya Zigbee

<!-- AUTO-GENERATED by generate-user-expectations.js — Do not edit manually -->
<!-- Nightly scan sections are preserved and merged automatically -->

[![Version](https://img.shields.io/badge/version-v${ver}-blue)]()
[![Drivers](https://img.shields.io/badge/drivers-${stats.drivers || dirs.length}-brightgreen)]()
[![Fingerprints](https://img.shields.io/badge/fingerprints-${fmt(stats.fps || allFPs.size)}+-green)]()
[![Users Tracked](https://img.shields.io/badge/users%20tracked-${userProfiles.length + pending.length}+-purple)]()
[![Last Updated](https://img.shields.io/badge/updated-${date}-lightgrey)]()

> **v${ver}** | **${fmt(stats.fps || allFPs.size)}+ fingerprints** | **${stats.drivers || dirs.length} drivers** | **${fmt(stats.flow || 0)} flow cards** | Updated ${date}

---

## Fingerprint Verification

${fpVerification}
---

## Pending Actions

| User | Device | Status | Action Required |
|------|--------|--------|-----------------|
${pendingTable}

---

## User Profiles

${profilesTable}
---

## GitHub Issues (dlnraja/com.tuya.zigbee)

| # | Author | Description | Status |
|---|--------|-------------|--------|
${ghTable}

---

## Recent Changelog

| Version | Changes |
|---------|---------|
${recentCL}

---

## Nightly Auto-Scan History

<!-- NIGHTLY_START — Preserved from nightly-processor.js -->

${nightlySections || '_No nightly scans recorded yet._'}

<!-- NIGHTLY_END -->

---

## Auto-Discovered Fingerprints

<!-- AUTODISCOVERED_START -->

${autoDiscovered || '_No auto-discovered fingerprints yet._'}

<!-- AUTODISCOVERED_END -->

---

## Decision Reference (Avoid Repeating Mistakes)

<!-- CRITICAL: Consult this before implementing new drivers or changing device assignments -->

| Device | Correct Driver | Wrong Driver | Reason | Research |
|--------|---------------|--------------|--------|----------|
${decisions.map(d => `| ${d.device} | **${d.driver}** | ${d.wrongDriver} | ${d.reason} | ${d.research} |`).join('\n')}

---

## Recurring Patterns (Auto-detected)

${patternData.suggestions?.length ? patternData.suggestions.map(s => `- **${s.pattern}** (${s.count} reports, ${s.priority} priority): ${s.fix}`).join('\n') : '_No patterns detected yet — run pattern-detector.js_'}

---

## Interview Repository

- **Total interviews recovered**: ${interviewSummary.totalInterviews || 0}
- **Unique fingerprints**: ${interviewSummary.uniqueFingerprints?.length || 0}
- **Sources**: ${JSON.stringify(interviewSummary.sources || {})}

---

## Forum Activity Tracking

- **Topics monitored**: ${Object.keys(forumState.topics || {}).length}
- **Recent replies**: ${(forumState.replyLog || []).length}
- **Last reply**: ${(forumState.replyLog || []).slice(-1)[0]?.ts || 'N/A'}

---

## Reference Data

### Known Inverted Contact Manufacturers
\`\`\`
${invertedMfrs.join(', ')}
\`\`\`

### BSEED ZCL-Only Fingerprints
\`\`\`
${bseedZCL.join(', ')}
\`\`\`

### Common Troubleshooting

| Symptom | Solution |
|---------|----------|
| **Device pairs but shows offline** | Check mesh distance, WiFi interference, re-pair closer to Homey |
| **Values wrong/erratic** | Check scale settings in device config, verify correct driver match |
| **Battery always null/\\"?\\"** | RE-PAIR device (bindings set at pair time), wait 4h for wake cycle |
| **Flow cards not working** | Update app to v${ver}, recreate flow, check driver flow cards |
| **Unknown Zigbee device** | Send diagnostic + interview, check fingerprint case, RE-PAIR |
| **Temp shows 0.2 instead of 20.6** | Double-division bug — fixed in v5.11.15+ |
| **Low battery on mains device** | Device needs \`mainsPowered\` flag — report to GitHub |

---

*Auto-generated on ${date} from v${ver} — ${fmt(stats.fps || allFPs.size)}+ fingerprints across ${stats.drivers || dirs.length} drivers*
`;

// --- Write MD file ---
fs.mkdirSync(DOCS, { recursive: true });
fs.writeFileSync(UDE_PATH, md);

// --- Write structured JSON reference for other scripts to consult ---
const ref = {
  version: ver, date, drivers: stats.drivers || dirs.length,
  fingerprints: stats.fps || allFPs.size,
  decisions: decisions.map(d => ({ device: d.device, driver: d.driver, wrongDriver: d.wrongDriver, reason: d.reason })),
  userProfiles: userProfiles.map(p => ({ name: p.name, devices: p.devices, status: p.status, latestFix: p.timeline[p.timeline.length - 1] })),
  pending: pending.map(p => ({ user: p.user, device: p.device, status: p.status, note: p.note })),
  patterns: (patternData.suggestions || []).map(s => ({ id: s.id, pattern: s.pattern, count: s.count, priority: s.priority })),
  interviews: { total: interviewSummary.totalInterviews || 0, fps: interviewSummary.uniqueFingerprints?.length || 0 },
  invertedMfrs, bseedZCL,
};
fs.mkdirSync(SD, { recursive: true });
fs.writeFileSync(REF_JSON, JSON.stringify(ref, null, 2));
console.log(`Generated USER_DEVICE_EXPECTATIONS.md + expectations-ref.json: v${ver}, ${verifiedFPs.length} verified FPs, ${missingFPs.length} missing`);
