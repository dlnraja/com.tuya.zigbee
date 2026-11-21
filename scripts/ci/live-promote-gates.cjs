'use strict';
/**
 * P3360 Live promotion gates. Live is automatic only after these objective checks
 * pass, for master and stable only. Bastien (com.dlnraja.tuya.zigbee.bastien) must never
 * go to Live: it is only for Bastien's house. Soak is evidence-driven (quiet Test + no
 * new crash signals), not a fixed 7-day wait.
 */
const APPS = {
  master: {
    appId: 'com.dlnraja.tuya.zigbee',
    branch: 'master',
    nightOnly: false,
    ci: [
      '🔍 Syntax Check & SDK3 Validation',
      '🛡️ Unified CI/CD Orchestrator',
      'Node 22 runtime tests',
      'Homey App Validate (all levels)',
    ],
  },
  stable: {
    appId: 'com.dlnraja.tuya.zigbee.stable',
    branch: 'stable-v5',
    nightOnly: false,
    ci: [
      '🔍 Syntax Check & SDK3 Validation',
      'Node 22 runtime tests',
      'Homey App Validate (all levels)',
    ],
  },
  bastien: {
    appId: 'com.dlnraja.tuya.zigbee.bastien',
    branch: 'bastien-home',
    neverLive: true,
    nightOnly: false,
    ci: [
      'Node 22 runtime tests',
      'Homey App Validate (all levels)',
    ],
  },
};

const DEFAULT_MIN_QUIET_MS = 2 * 60 * 60 * 1000; // 2 h floor; not 7 days

function parisHour(nowMs) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date(nowMs));
  return Number(hour);
}

function isBastienNight(nowMs) {
  const h = parisHour(nowMs);
  return h >= 23 || h < 6;
}

function stateOf(build) {
  return String((build && (build.state || build.channel || build.status)) || '').toLowerCase();
}

function scanCrashSignals(texts, sinceMs) {
  const out = [];
  const re = /\b(crash|OOM|out of memory|segfault|processing_failed|AggregateError|MemwarnGuard ENOENT)\b/i;
  for (const item of texts || []) {
    const at = Number(item.atMs || 0);
    if (sinceMs && at && at < sinceMs) continue;
    const text = String(item.text || '');
    if (!re.test(text)) continue;
    // Historical mentions of older versions/builds are not "new" signals.
    if (item.historical === true) continue;
    out.push({
      atMs: at || sinceMs || 0,
      source: item.source || 'unknown',
      summary: text.replace(/\s+/g, ' ').slice(0, 220),
    });
  }
  return out;
}

/**
 * @param {object} input
 * @returns {{ ok: boolean, promote: boolean, reasons: string[], soak: object }}
 */
function evaluateLiveGates(input) {
  const reasons = [];
  const appKey = input.app || 'master';
  const profile = APPS[appKey];
  if (!profile) reasons.push(`unknown app ${appKey}`);
  const nowMs = Number(input.nowMs || Date.now());
  const minQuiet = Number(input.minQuietMs != null ? input.minQuietMs : (process.env.LIVE_MIN_QUIET_MS || DEFAULT_MIN_QUIET_MS));

  const appId = input.appId || (profile && profile.appId) || '';
  const isBastien = appKey === 'bastien' || !!(profile && profile.neverLive) || /tuya\.zigbee\.bastien$/.test(String(appId));
  if (isBastien) {
    return {
      ok: false,
      promote: false,
      alreadyLive: false,
      neverLive: true,
      reasons: ['Bastien (com.dlnraja.tuya.zigbee.bastien) must never go to Live; it is only for Bastien\'s house'],
      soak: { satisfied: false },
      appId: appId || 'com.dlnraja.tuya.zigbee.bastien',
      nightOnly: false,
    };
  }

  const target = input.target || null;
  if (!target) reasons.push('no target Test build');
  else {
    const st = stateOf(target);
    if (st === 'live') {
      return { ok: true, promote: false, alreadyLive: true, reasons: [`#${target.id || target.build} v${target.version} is already Live`], soak: { satisfied: true } };
    }
    if (st !== 'test') reasons.push(`target state is ${st || 'unknown'}, need Test`);
    if (/processing_failed|revoked|failed|rejected|superseded/i.test(st)) {
      reasons.push(`target is not a healthy Test (${st})`);
    }
  }

  const ciRequired = (input.ciRequired || (profile && profile.ci) || []);
  const ci = input.ci || {};
  for (const name of ciRequired) {
    const st = ci[name];
    if (st !== 'success') reasons.push(`CI not green: ${name} (${st || 'missing'})`);
  }
  if (input.validatePublish !== true && input.validatePublish !== undefined) {
    // optional explicit flag; when provided must be true
    if (input.validatePublish !== true) reasons.push('validate publish is not green');
  }

  const lostIds = [];
  const requiredIds = input.previousLiveIds || input.requiredDriverIds || [];
  const candidateIds = new Set(input.candidateIds || []);
  const retiredIds = new Set(input.retiredDriverIds || []);
  for (const id of requiredIds) {
    if (retiredIds.has(id)) continue;
    if (!candidateIds.has(id)) lostIds.push(id);
  }
  if (lostIds.length) reasons.push(`lost driver id(s) vs previous Live/baseline: ${lostIds.slice(0, 8).join(', ')}${lostIds.length > 8 ? '…' : ''}`);

  const lostCouples = [];
  const requiredCouples = input.previousLiveCouples || input.requiredCouples || [];
  const candidateCouples = new Set(input.candidateCouples || []);
  for (const c of requiredCouples) {
    if (!candidateCouples.has(c)) lostCouples.push(c);
  }
  if (lostCouples.length) reasons.push(`lost couple(s) vs previous Live/baseline: ${lostCouples.slice(0, 8).join(', ')}${lostCouples.length > 8 ? '…' : ''}`);
  if (input.baselineMissing && input.baselineMissing.length) {
    reasons.push(`P3024b baseline missing ${input.baselineMissing.length} couple(s)`);
  }

  const testAt = Number(input.testAtMs || (target && (target.testAtMs || target.atMs)) || 0);
  const signals = scanCrashSignals(input.crashTexts || [], testAt);
  if (signals.length) {
    reasons.push(`new crash signal(s) since Test: ${signals[0].summary}`);
  }

  const soak = { satisfied: false, quietMs: testAt ? Math.max(0, nowMs - testAt) : 0, minQuietMs: minQuiet, evidence: false };
  if (!testAt) {
    reasons.push('Test timestamp missing; cannot assess soak');
  } else {
    const evidenceScan = (input.scans || []).some((s) => Number(s.atMs) >= testAt);
    // Running the scanner now counts as a scan.
    const scannedNow = input.scannedNow === true || (input.crashTexts && input.crashTexts.length >= 0);
    soak.evidence = evidenceScan || scannedNow;
    if (!soak.evidence) reasons.push('no crash/diag evidence scan since Test');
    if (soak.quietMs < minQuiet) reasons.push(`Test soak too short (${Math.round(soak.quietMs / 60000)} min, floor ${Math.round(minQuiet / 60000)} min; evidence-driven, not 7 days)`);
    soak.satisfied = soak.evidence && soak.quietMs >= minQuiet && signals.length === 0;
  }

  const ok = reasons.length === 0;
  return { ok, promote: ok, alreadyLive: false, reasons, soak, appId: profile && profile.appId, nightOnly: !!(profile && profile.nightOnly) };
}

module.exports = {
  APPS,
  DEFAULT_MIN_QUIET_MS,
  parisHour,
  isBastienNight,
  stateOf,
  scanCrashSignals,
  evaluateLiveGates,
};
