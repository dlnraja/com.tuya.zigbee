#!/usr/bin/env node
'use strict';

/**
 * classify-dual-app-change.js
 * Prints BOTH / MASTER_ONLY / STABLE_ONLY guidance for a path or commit message.
 * Usage:
 *   node tools/ci/classify-dual-app-change.js path/to/file.js
 *   node tools/ci/classify-dual-app-change.js --msg "fix(runtime): SOS catch abort"
 */

const MASTER_ONLY = [
  /AlarmPolarity|polarity.?learn|FreeScrape|free-scrape|diag-investigate-orchestrator/i,
  /CapabilityCommandRouter|parallelDiscover|multichannel|autonomous|AVE|circadian/i,
  /ZigbeeCommandPacer|ReconnectBurstCoalescer|endpointCapability|ZclClusterLexicon|contributor-repo-dump/i,
  /presence.?sim|fallback.?router|mega-crawler/i,
];

const BOTH = [
  /safe-?timers|Promise\.resolve\(.*_registerButton|async _registerButtonCapabilityListeners/i,
  /zoneId:\s*10|auditCapabilities|homey\?\.clearTimeout|IAS.?enroll|crash|guard/i,
  /fix\(runtime\)|fix\(crash\)|fix\(timer\)|fix\(ias\)/i,
];

const STABLE_ONLY = [
  /publish-stable|stable-v5.*version|5\.12\.\d+/i,
];

const arg = process.argv.slice(2).join(' ') || '';
const text = arg.replace(/^--msg\s+/i, '');

let tag = 'REVIEW';
let reason = 'No strong signal — read docs/rules/DUAL_APP_VISION.md and decide.';

if (STABLE_ONLY.some((r) => r.test(text))) {
  tag = 'STABLE_ONLY';
  reason = 'Stable identity / publish — do not merge into master as identity.';
} else if (MASTER_ONLY.some((r) => r.test(text))) {
  tag = 'MASTER_ONLY';
  reason = 'Feature / scrape / smart-learn — keep on master unless human promotes.';
} else if (BOTH.some((r) => r.test(text))) {
  tag = 'BOTH';
  reason = 'Reliability candidate — soak on master Test, then surgical stable backport.';
}

console.log(JSON.stringify({ input: text.slice(0, 200), tag, reason }, null, 2));
process.exit(0);
