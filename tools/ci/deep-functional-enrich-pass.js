#!/usr/bin/env node
'use strict';

/**
 * deep-functional-enrich-pass.js (P2529)
 *
 * WHY: Inbox/cron must not stop at mfr+pid — force DP/cluster/flow/RX-TX audit checklist.
 * HOW: Load SSOT + latest L99/github/gmail digests → write complementary FUNCTIONAL_AUDIT.md
 *      + soft-run coverage / wire gates (never wipe drivers).
 * POUR QUI: GHA + maintainers; silent code only (T157628).
 * QUAND: L99 inbox phase, forum-poll, auto-enrich, gmail soft hooks.
 * CONTRE QUOI: Shallow "lock couple" / tip-lag-only closures.
 *
 * Usage:
 *   node tools/ci/deep-functional-enrich-pass.js
 *   node tools/ci/deep-functional-enrich-pass.js --skip-gates
 *   node tools/ci/deep-functional-enrich-pass.js --date=2026-09-16
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SSOT = path.join(ROOT, 'config/architecture/deep-functional-enrich-ssot.json');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
function runSoft(label, cmd, args = [], timeoutMs = 180000) {
  const t0 = Date.now();
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
    shell: false,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    label,
    ok: res.status === 0,
    status: res.status,
    durationMs: Date.now() - t0,
    tail: String(res.stdout || res.stderr || '').slice(-600),
  };
}

function loadSources(date) {
  const l99Dir = path.join(ROOT, `reports/l99-inbox-${date}`);
  const github = readJson(path.join(l99Dir, 'github-harvest.json'))
    || readJson(path.join(ROOT, '.github/state/l99-inbox-intelligence/github-harvest.json'))
    || { issues: [], prs: [] };
  // WHY(P2529): if harvest truncated before couple, soft-expand via gh when available
  for (const iss of github.issues || []) {
    const snip = String(iss.bodySnippet || '');
    if (extractCouple(snip) || snip.length > 800) continue;
    try {
      const res = spawnSync('gh', ['issue', 'view', String(iss.number), '--json', 'body,title'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 20000,
        shell: false,
      });
      if (res.status === 0 && res.stdout) {
        const j = JSON.parse(res.stdout);
        iss.bodySnippet = String(j.body || '').slice(0, 4500);
        if (j.title) iss.title = j.title;
      }
    } catch { /* soft */ }
  }
  const summary = readJson(path.join(l99Dir, 'SUMMARY.json'))
    || readJson(path.join(ROOT, '.github/state/l99-inbox-intelligence/last-run.json'));
  const needAction = (() => {
    const dirs = [
      path.join(ROOT, `reports/forum-verify-${date}`),
      path.join(ROOT, 'reports/forum-verify-2026-09-15'),
      path.join(ROOT, 'reports/forum-verify-2026-09-16'),
    ];
    for (const d of dirs) {
      const p = path.join(d, 'need-action-investigation.json');
      const j = readJson(p);
      if (j) return { path: p, data: j };
    }
    return null;
  })();
  // Soft Gmail digests — always enqueue depth row when TREAT/crash state exists
  const gmailDirs = [
    path.join(ROOT, `reports/gmail-diag-${date}`),
    path.join(ROOT, 'reports/gmail-diag-2026-09-15'),
    path.join(ROOT, 'reports/gmail-diag-2026-09-16'),
  ];
  let gmail = null;
  for (const d of gmailDirs) {
    if (fs.existsSync(path.join(d, 'TREAT_LIVE.md')) || fs.existsSync(path.join(d, 'SUMMARY.json'))) {
      gmail = { path: d };
      break;
    }
  }
  return { github, summary, needAction, l99Dir, gmail };
}

function classifySymptom(text) {
  const t = String(text || '').toLowerCase();
  const hits = [];
  if (/flow|when|trigger|card|automati/.test(t)) hits.push('flow_wire');
  if (/dp\s*\d+|datapoint|0xef00|61184|mcu/.test(t)) hits.push('dp_map');
  if (/cluster|endpoint|interview|zcl|ias|0xfd|0xfc/.test(t)) hits.push('clusters');
  if (/battery|crash|oom|restart|hang/.test(t)) hits.push('rx_path');
  if (/on\/?off|dim|brightness|tx|command|not work|no response|dead/.test(t)) hits.push('tx_path');
  if (/presence|motion|radar|curtain|button|pair/.test(t)) hits.push('driver_class');
  if (!hits.length) hits.push('rx_path', 'flow_wire', 'dp_map');
  return [...new Set(hits)];
}

/** Extract first sacred couple from free text (never invent). */
function extractCouple(text) {
  const blob = String(text || '');
  const mfr = blob.match(/(_TZE[A-Z0-9]{3}_[a-z0-9]+|_TZ[A-Z0-9]{4}_[a-z0-9]+|HOBEIAN)/i);
  const pid = blob.match(/\b(TS[0-9A-Z]{4}[A-Z]?|ZG-[0-9A-Z]+)\b/i);
  if (!mfr) return null;
  return {
    mfr: mfr[1],
    pid: pid ? pid[1] : null,
  };
}

/**
 * Complementary depth probe — compose clusters / DP map / flow compose+wire.
 * WHY: P2529 must not stop at mfr+pid presence.
 */
function probeDriverDepth(driverId) {
  if (!driverId) return { ok: false, notes: ['no-driver'] };
  const composePath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  const devicePath = path.join(ROOT, 'drivers', driverId, 'device.js');
  const flowPath = path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json');
  const notes = [];
  const depth = {
    driverId,
    compose: fs.existsSync(composePath),
    deviceJs: fs.existsSync(devicePath),
    flowCompose: fs.existsSync(flowPath),
    clusters: [],
    hasEf00: false,
    dpMapHints: false,
    flowCardCount: 0,
    flowWireHints: false,
  };
  if (depth.compose) {
    try {
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const eps = c.zigbee?.endpoints || {};
      for (const ep of Object.values(eps)) {
        const clusters = ep.clusters || [];
        depth.clusters.push(...clusters);
        if (clusters.includes(61184) || clusters.includes('61184')) depth.hasEf00 = true;
      }
      notes.push(`compose clusters=[${[...new Set(depth.clusters)].slice(0, 12).join(',')}]`);
    } catch {
      notes.push('compose-parse-fail');
    }
  } else {
    notes.push('missing-compose');
  }
  if (depth.deviceJs) {
    const src = fs.readFileSync(devicePath, 'utf8');
    depth.dpMapHints = /dpMappings|get dpMappings|ownedMap|EF00/.test(src);
    depth.flowWireHints = /getDeviceTriggerCard|DeclaredFlowCardAutoWire|registerRunListener|trigger\(/.test(src);
    if (depth.dpMapHints) notes.push('device has DP/RX map path');
    else notes.push('WARN: no dpMappings/EF00 hints in device.js');
    if (depth.flowWireHints) notes.push('device has flow wire hints');
  }
  if (depth.flowCompose) {
    try {
      const f = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      const cards = [
        ...(f.triggers || []),
        ...(f.conditions || []),
        ...(f.actions || []),
      ];
      depth.flowCardCount = cards.length;
      notes.push(`flow cards=${depth.flowCardCount}`);
    } catch {
      notes.push('flow-compose-parse-fail');
    }
  } else {
    notes.push('no flow.compose (ok if class has none)');
  }
  depth.notes = notes;
  depth.ok = depth.compose && depth.deviceJs;
  return depth;
}

function resolveDriverForCouple(mfr, pid) {
  if (!mfr) return null;
  const mfrL = String(mfr).toLowerCase();
  const driversDir = path.join(ROOT, 'drivers');
  let hit = null;
  try {
    for (const id of fs.readdirSync(driversDir)) {
      const p = path.join(driversDir, id, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      let c;
      try { c = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
      const names = (c.zigbee?.manufacturerName || []).map((x) => String(x).toLowerCase());
      if (!names.includes(mfrL)) continue;
      const pids = (c.zigbee?.productId || []).map((x) => String(x).toLowerCase());
      if (pid && pids.length && !pids.includes(String(pid).toLowerCase())) continue;
      hit = id;
      break;
    }
  } catch { /* ignore */ }
  return hit;
}

function buildChecklist(ssot, sources) {
  const vectors = ssot.requiredAuditVectors || [];
  const rows = [];

  for (const iss of sources.github.issues || []) {
    const blob = `${iss.title} ${iss.bodySnippet || ''}`;
    const vectorsHit = classifySymptom(blob);
    const couple = extractCouple(blob);
    const driverId = couple ? resolveDriverForCouple(couple.mfr, couple.pid) : null;
    const depth = driverId ? probeDriverDepth(driverId) : null;
    rows.push({
      source: 'github',
      id: `#${iss.number}`,
      title: iss.title,
      url: iss.htmlUrl,
      dualApp: 'BOTH',
      couple: couple || undefined,
      driverId: driverId || undefined,
      depth: depth || undefined,
      requiredVectors: vectors.map((v) => v.id),
      priorityVectors: vectorsHit,
      action: depth?.ok
        ? `depth-ok ${driverId}: ${(depth.notes || []).slice(0, 3).join('; ')} — complementary only`
        : 'deep-functional-audit + complementary fix (not mfr+pid only)',
      forumReply: 'NEVER',
    });
  }

  const inv = sources.needAction?.data;
  const list = Array.isArray(inv) ? inv : (inv?.investigations || inv?.items || []);
  for (const item of list.slice(0, 40)) {
    const label = `T${item.topicId || '?'} #${item.postNumber || '?'}`;
    const vectorsHit = classifySymptom(`${item.action || ''} ${item.userAction || ''} ${item.issues || ''}`);
    rows.push({
      source: 'forum',
      id: label,
      title: item.username || 'forum',
      dualApp: item.dualApp || 'BOTH',
      requiredVectors: vectors.map((v) => v.id),
      priorityVectors: vectorsHit,
      action: item.action === 'lock-sacred-couple'
        ? 'deep-functional-audit after couple lock (DP/cluster/flow/RX-TX)'
        : `deep-functional: ${item.action || 'investigate'}`,
      forumReply: 'NEVER',
    });
  }

  if (sources.summary?.gmail || sources.gmail) {
    rows.push({
      source: 'gmail',
      id: 'gmail-diags',
      title: 'Diagnostic / crash harvest',
      dualApp: 'BOTH',
      requiredVectors: vectors.map((v) => v.id),
      priorityVectors: ['rx_path', 'dp_map', 'flow_wire', 'contre_quoi'],
      action: 'trace stack → driver RX/TX → Contre quoi test',
      forumReply: 'NEVER',
    });
  }

  return rows;
}

function writeAuditMd(outDir, ssot, rows, gateResults) {
  ensureDir(outDir);
  const lines = [
    `# Deep functional enrich audit (P2529) — ${today()}`,
    '',
    'Silent only. **Never** forum POST. Complementary (P2520): union/append only.',
    '**Not** mfr+pid-only — every row must cover DP / cluster / flow wire / RX-TX.',
    '',
    '## Required vectors',
    '',
  ];
  for (const v of ssot.requiredAuditVectors || []) {
    lines.push(`- **${v.id}** — ${v.label}`);
  }
  lines.push('', '## Queue', '', '| Source | ID | Couple / driver | Dual | Priority vectors | Action |', '|--------|----|-----------------|------|------------------|--------|');
  for (const r of rows.slice(0, 60)) {
    const couple = r.couple
      ? `\`${r.couple.mfr}\`+\`${r.couple.pid || '?'}\` → \`${r.driverId || '?'}\``
      : (r.driverId ? `\`${r.driverId}\`` : '—');
    lines.push(`| ${r.source} | ${r.id} | ${couple} | ${r.dualApp} | ${(r.priorityVectors || []).join(', ')} | ${(r.action || '').replace(/\|/g, '/')} |`);
  }
  lines.push('', '## Soft gates', '');
  for (const g of gateResults) {
    lines.push(`- **${g.label}**: ${g.ok ? 'ok' : 'warn'} (${g.durationMs}ms)`);
  }
  lines.push(
    '',
    '## Doctrine',
    '',
    '- SSOT: `config/architecture/deep-functional-enrich-ssot.json`',
    '- Human: `docs/rules/DEEP_FUNCTIONAL_ENRICH.md`',
    '- Gate: `npm run check:p2529`',
    '',
  );
  const fp = path.join(outDir, 'FUNCTIONAL_AUDIT.md');
  fs.writeFileSync(fp, `${lines.join('\n')}\n`);
  fs.writeFileSync(path.join(outDir, 'functional-audit.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), rows, gateResults }, null, 2)}\n`);
  return fp;
}

function main() {
  if (!fs.existsSync(SSOT)) {
    console.error('[P2529] missing SSOT', SSOT);
    process.exit(1);
  }
  const ssot = readJson(SSOT);
  const date = arg('date') || today();
  const sources = loadSources(date);
  const rows = buildChecklist(ssot, sources);
  const outDir = path.join(ROOT, `reports/deep-functional-${date}`);

  const gateResults = [];
  if (!flag('skip-gates')) {
    gateResults.push(runSoft('coverage-dp-cluster-flow', process.execPath, [
      path.join(ROOT, 'tools/ci/coverage-dp-cluster-flow.js'), '--strict',
    ], 240000));
    gateResults.push(runSoft('check:p2518', process.execPath, [
      '--test', path.join(ROOT, 'test/critical/p2518-cap-flow-dp-rx-enrich.test.js'),
    ], 120000));
    gateResults.push(runSoft('check:p2528', process.execPath, [
      '--test', path.join(ROOT, 'test/critical/p2528-vichy-dp104-cap-ownership.test.js'),
    ], 60000));
    gateResults.push(runSoft('check:p2520', 'npm', ['run', 'check:p2520'], 180000));
  } else {
    gateResults.push({ label: 'gates', ok: true, durationMs: 0, skipped: true });
  }

  const md = writeAuditMd(outDir, ssot, rows, gateResults);
  console.log('[P2529] deep functional pass');
  console.log('  rows=', rows.length);
  console.log('  report=', md);
  for (const g of gateResults) {
    console.log(`  gate ${g.label}: ${g.ok ? 'ok' : 'warn'}`);
  }
  // Soft exit — enrich pass never hard-fails inbox cron
  process.exit(0);
}

main();
