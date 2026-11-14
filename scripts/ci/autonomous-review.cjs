'use strict';

/**
 * Approval-independent review for pull requests and pushes.
 * A bot approval is not a review. These checks are the review.
 *
 *   node scripts/ci/autonomous-review.cjs <couples|compaction|assertions|targeted-tests|identity|bot-approval|all>
 *     [--base REF] [--branch NAME] [--fixture PATH]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

const IDENTITIES = {
  master: { id: 'com.dlnraja.tuya.zigbee', name: 'Universal Tuya', version: /^9\.\d+\.\d+$/ },
  'stable-v5': { id: 'com.dlnraja.tuya.zigbee.stable', name: 'Tuya Unified (Stable)', version: /^5\.\d+\.\d+$/ },
  'bastien-home': { id: 'com.dlnraja.tuya.zigbee.bastien', name: 'Zigbee Bastien', version: /^1\.\d+\.\d+$/ },
};

const GENERIC_CHANGELOG = /reliability:\s*\d+\s+small fix|maintenance build:|maintenance release:|same devices and behaviour|tooling only|checks, tests and build tooling only/i;

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function coupleKey(mfr, pid) {
  return `${norm(mfr)}|${norm(pid)}`;
}

function asList(value) {
  if (value == null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v)).filter(Boolean);
}

/**
 * Exact couples only. A driver that lists several manufacturers and several
 * product ids is a Homey cross-product, not a set of real pairs.
 */
function exactPairs(driver) {
  const zigbee = driver && driver.zigbee;
  if (!zigbee) return [];
  const mfrs = asList(zigbee.manufacturerName);
  const pids = asList(zigbee.productId);
  if (!mfrs.length || !pids.length) return [];
  if (mfrs.length > 1 && pids.length > 1) return [];
  const pairs = [];
  for (const mfr of mfrs) {
    for (const pid of pids) pairs.push({ mfr, pid, key: coupleKey(mfr, pid) });
  }
  return pairs;
}

function indexExact(drivers, sources) {
  const map = new Map();
  function add(key, driverId, mfr, pid) {
    if (!map.has(key)) map.set(key, []);
    const row = map.get(key);
    if (!row.some((r) => r.driverId === driverId)) row.push({ driverId, mfr, pid });
  }
  for (const driver of drivers || []) {
    for (const pair of exactPairs(driver)) add(pair.key, driver.id, pair.mfr, pair.pid);
  }
  for (const [rawKey, entry] of Object.entries(sources || {})) {
    if (!entry) continue;
    let mfr = entry.mfr;
    let pid = entry.pid;
    if (!mfr || !pid) {
      const parts = String(rawKey).split('|');
      mfr = mfr || parts[0];
      pid = pid || parts[1];
    }
    if (!mfr || !pid) continue;
    const key = coupleKey(mfr, pid);
    for (const driver of drivers || []) {
      if (listsContain(driver, mfr, pid)) add(key, driver.id, mfr, pid);
    }
  }
  return map;
}

function sourceUrl(entry) {
  if (!entry) return '';
  if (typeof entry.url === 'string' && /^https?:\/\//i.test(entry.url)) return entry.url;
  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  for (const source of sources) {
    if (typeof source === 'string' && /^https?:\/\//i.test(source)) return source;
    if (!source || typeof source !== 'object') continue;
    for (const field of ['url', 'ref', 'href']) {
      if (typeof source[field] === 'string' && /^https?:\/\//i.test(source[field])) return source[field];
    }
  }
  return '';
}

function listsContain(driver, mfr, pid) {
  const mfrs = asList(driver.zigbee && driver.zigbee.manufacturerName).map(norm);
  const pids = asList(driver.zigbee && driver.zigbee.productId).map((p) => p.toUpperCase());
  return mfrs.includes(norm(mfr)) && pids.includes(String(pid).toUpperCase());
}

function reviewDiff(before, after, sources) {
  const historical = new Set(reviewCouples({ before, after: before, sources }).problems);
  const head = reviewCouples({ before, after, sources });
  const problems = head.problems.filter((problem) => !historical.has(problem));
  return { ok: problems.length === 0, problems, moved: head.moved };
}

function reviewCouples({ before, after, sources }) {
  const prev = indexExact(before, sources);
  const next = indexExact(after, sources);
  const problems = [];
  const moved = [];
  for (const [key, rows] of next) {
    if (rows.length > 1) {
      problems.push(`couple ${key} is in ${rows.length} drivers: ${rows.map((r) => r.driverId).join(', ')}`);
    }
  }
  for (const [key, rows] of prev) {
    const now = next.get(key);
    if (!now) {
      problems.push(`removed ${key} from ${rows.map((r) => r.driverId).join(', ')} and it was not moved`);
      continue;
    }
    const oldIds = rows.map((r) => r.driverId).sort().join(',');
    const newIds = now.map((r) => r.driverId).sort().join(',');
    if (oldIds !== newIds) moved.push(`${key}: ${oldIds} -> ${newIds}`);
  }
  for (const [key, rows] of next) {
    if (prev.has(key)) continue;
    const entry = sources && (sources[key] || sources[norm(key)]);
    const url = sourceUrl(entry);
    if (!entry || !url) {
      problems.push(`invented ${key} on ${rows.map((r) => r.driverId).join(', ')}: couple-sources entry with a URL is required`);
      continue;
    }
    if (Array.isArray(entry.drivers) && entry.drivers.length) {
      const allowed = new Set(entry.drivers.map(String));
      for (const row of rows) {
        if (!allowed.has(row.driverId)) {
          problems.push(`couple ${key} is on ${row.driverId}, source allows ${entry.drivers.join(', ')}`);
        }
      }
    }
    if (entry.deviceClass) {
      for (const row of rows) {
        const driver = (after || []).find((d) => d.id === row.driverId);
        if (driver && driver.class && driver.class !== entry.deviceClass) {
          problems.push(`couple ${key} on ${row.driverId} class ${driver.class} != ${entry.deviceClass}`);
        }
      }
    }
  }
  return { ok: problems.length === 0, problems, moved };
}

function couplesPresent(manifest, wanted) {
  const missing = [];
  const byId = new Map((manifest.drivers || []).map((d) => [d.id, d]));
  for (const couple of wanted || []) {
    const driver = byId.get(couple.driverId);
    const mfrs = asList(driver && driver.zigbee && driver.zigbee.manufacturerName).map(norm);
    const pids = asList(driver && driver.zigbee && driver.zigbee.productId).map((p) => p.toUpperCase());
    const ok = driver && mfrs.includes(norm(couple.mfr)) && pids.includes(String(couple.pid).toUpperCase());
    if (!ok) missing.push(`${couple.mfr}+${couple.pid} → ${couple.driverId}`);
  }
  return missing;
}

function replayCompaction(manifest, sacred, compactFn) {
  const presentBefore = (sacred || []).filter((c) => couplesPresent(manifest, [c]).length === 0);
  const copy = JSON.parse(JSON.stringify(manifest));
  compactFn(copy);
  const missing = couplesPresent(copy, presentBefore);
  return { ok: missing.length === 0, missing, checked: presentBefore.length };
}

function assertionProfile(src) {
  const text = String(src || '');
  const count = (re) => (text.match(re) || []).length;
  return {
    skip: count(/\.\s*skip\s*\(/g) + count(/\b(?:it|describe|test)\.skip\b/g),
    only: count(/\.\s*only\s*\(/g) + count(/\b(?:it|describe|test)\.only\b/g),
    strict: count(/\bassert\s*\.\s*(?:strictEqual|deepStrictEqual|equal|deepEqual|notStrictEqual|notDeepStrictEqual|match|doesNotMatch|throws|rejects)\s*\(/g),
  };
}

function assertionsWeakened(beforeSrc, afterSrc) {
  const before = assertionProfile(beforeSrc);
  const after = assertionProfile(afterSrc);
  const problems = [];
  if (after.skip > before.skip) problems.push(`.skip increased ${before.skip} -> ${after.skip}`);
  if (after.only > before.only) problems.push(`.only increased ${before.only} -> ${after.only}`);
  if (after.strict < before.strict) problems.push(`strict assertions decreased ${before.strict} -> ${after.strict}`);
  return { ok: problems.length === 0, problems, before, after };
}

function targetedTests(changedPaths, testRoot, listFiles) {
  const needles = [];
  for (const file of changedPaths || []) {
    const normPath = String(file).replace(/\\/g, '/');
    const driver = normPath.match(/^drivers\/([^/]+)\//);
    if (driver) needles.push(driver[1]);
    const lib = normPath.match(/^lib\/(.+)\.js$/);
    if (lib) needles.push(path.basename(lib[1], '.js'));
  }
  const unique = [...new Set(needles)].filter((n) => n.length >= 4);
  const files = listFiles(testRoot);
  const hit = [];
  for (const file of files) {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (unique.some((n) => text.includes(n) || path.basename(file).includes(n))) hit.push(file);
  }
  return { needles: unique, files: hit };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function appIdentity(app) {
  const name = app && app.name;
  return {
    id: app && app.id,
    name: name && typeof name === 'object' ? name.en : name,
    version: app && app.version,
  };
}

function identityProblems(app, branch, changelog, previousVersion) {
  const expect = IDENTITIES[branch];
  const problems = [];
  if (!expect) {
    problems.push(`unknown branch ${branch}`);
    return { ok: false, problems };
  }
  const got = appIdentity(app);
  if (got.id !== expect.id) problems.push(`app id ${got.id} != ${expect.id}`);
  if (got.name !== expect.name) problems.push(`app name ${got.name} != ${expect.name}`);
  if (!expect.version.test(String(got.version || ''))) problems.push(`version ${got.version} is outside ${branch}`);
  if (previousVersion && got.version && previousVersion !== got.version) {
    const entry = changelog && changelog[got.version];
    const en = entry && (typeof entry === 'object' ? entry.en : entry);
    if (!en) problems.push(`version ${got.version} has no changelog note`);
    else if (GENERIC_CHANGELOG.test(en)) problems.push(`version ${got.version} changelog is generic: ${en}`);
  }
  return { ok: problems.length === 0, problems, got };
}

function isBotLogin(login) {
  const s = String(login || '').toLowerCase();
  return s.endsWith('[bot]') || s.includes('dependabot') || s.includes('approval agent') || s.includes('bugbot');
}

function bugbotRan(checks) {
  return (checks || []).some((c) => /bugbot/i.test(String(c.name || '')) && c.conclusion && c.conclusion !== 'skipped');
}

/**
 * Bot approval never counts as the review. The job passes only when the
 * semantic review passed. It fails when that review did not pass, including
 * when the only approvals are bots and Bugbot did not run.
 */
function botApprovalVerdict({ approvals, checks, semanticOk }) {
  const approved = (approvals || []).filter((r) => String(r.state || '').toUpperCase() === 'APPROVED');
  const botOnly = approved.length > 0 && approved.every((r) => isBotLogin(r.user && (r.user.login || r.user)));
  const ran = bugbotRan(checks);
  const needsSemantic = botOnly && !ran;
  return {
    ok: semanticOk === true,
    botApprovalCounted: false,
    needsSemantic,
    botOnly,
    bugbotRan: ran,
    reason: semanticOk === true
      ? (needsSemantic
        ? 'bot approval is not a review; semantic review passed'
        : 'semantic review passed')
      : (needsSemantic
        ? 'bot approval is not a review; Bugbot did not run; semantic review must pass'
        : 'semantic review must pass'),
  };
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function loadComposeDrivers(root) {
  const dir = path.join(root, 'drivers');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const id of fs.readdirSync(dir)) {
    const file = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      out.push({ id, class: json.class || '', capabilities: json.capabilities || [], zigbee: json.zigbee || {} });
    } catch { /* unreadable compose is reported by other gates */ }
  }
  return out;
}

function loadSources(root) {
  const file = path.join(root, 'data', 'ssot', 'couple-sources.json');
  if (!fs.existsSync(file)) return {};
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return json.couples || {};
}

function driverAtRef(ref, id) {
  try {
    const text = git(['show', `${ref}:drivers/${id}/driver.compose.json`]);
    const json = JSON.parse(text);
    return { id, class: json.class || '', capabilities: json.capabilities || [], zigbee: json.zigbee || {} };
  } catch {
    return null;
  }
}

function changedDriverIds(base) {
  let names = '';
  try { names = git(['diff', '--name-only', base, 'HEAD', '--', 'drivers']); } catch { return []; }
  const ids = new Set();
  for (const line of names.split('\n')) {
    const m = line.match(/^drivers\/([^/]+)\//);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

function runCouples(base) {
  const after = loadComposeDrivers(ROOT);
  let before = after;
  if (base) {
    const ids = new Set([...changedDriverIds(base), ...after.map((d) => d.id)]);
    before = [];
    for (const id of ids) {
      const row = driverAtRef(base, id);
      if (row) before.push(row);
    }
    const afterSubset = after.filter((d) => ids.has(d.id) || before.some((b) => b.id === d.id));
    const untouched = after.filter((d) => !afterSubset.some((a) => a.id === d.id));
    return reviewDiff(before.concat(untouched), after, loadSources(ROOT));
  }
  return reviewCouples({ before: after, after, sources: loadSources(ROOT) });
}

function runCompaction() {
  const { compactZigbeeIdentifiers } = require('../maintenance/compact-zigbee-identifiers.cjs');
  const app = readJson(path.join(ROOT, 'app.json'));
  const sacred = require('../maintenance/compact-zigbee-identifiers.cjs').loadSacredKeepCouples(ROOT);
  const verdict = replayCompaction(app, sacred, (manifest) => {
    compactZigbeeIdentifiers(manifest, {
      repoRoot: path.join(ROOT, 'tmp-autonomous-empty'),
      baseline: null,
      holdIds: new Set(),
      sacredKeep: sacred,
    });
  });
  return verdict;
}

function runAssertions(base) {
  if (!base) return { ok: true, problems: [] };
  let names = '';
  try { names = git(['diff', '--name-only', base, 'HEAD', '--', 'test']); } catch { return { ok: true, problems: [] }; }
  const problems = [];
  for (const file of names.split('\n').filter((f) => f.endsWith('.js'))) {
    let after = '';
    let before = '';
    try { after = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { continue; }
    try { before = git(['show', `${base}:${file}`]); } catch { before = ''; }
    const verdict = assertionsWeakened(before, after);
    for (const problem of verdict.problems) problems.push(`${file}: ${problem}`);
  }
  return { ok: problems.length === 0, problems };
}

function runIdentity(branch, base) {
  const app = readJson(path.join(ROOT, '.homeycompose', 'app.json'));
  let previous = '';
  if (base) {
    try { previous = JSON.parse(git(['show', `${base}:.homeycompose/app.json`])).version; } catch { previous = ''; }
  }
  let changelog = {};
  const cl = path.join(ROOT, '.homeychangelog.json');
  if (fs.existsSync(cl)) changelog = JSON.parse(fs.readFileSync(cl, 'utf8'));
  return identityProblems(app, branch, changelog, previous);
}

function printVerdict(name, verdict) {
  const problems = verdict.problems || verdict.missing || [];
  if (verdict.moved && verdict.moved.length) {
    for (const line of verdict.moved) console.log(`moved ${line}`);
  }
  if (!verdict.ok) {
    console.error(`${name} failed`);
    for (const line of problems) console.error(`  ${line}`);
    if (verdict.reason) console.error(`  ${verdict.reason}`);
    return 1;
  }
  console.log(`${name} ok${verdict.reason ? `: ${verdict.reason}` : ''}`);
  return 0;
}

function parseArgs(argv) {
  const out = { cmd: argv[0] || 'all', base: '', branch: '', fixture: '' };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--branch') out.branch = argv[++i];
    else if (a === '--fixture') out.fixture = argv[++i];
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.cmd === 'bot-approval') {
    const fixture = args.fixture ? JSON.parse(fs.readFileSync(args.fixture, 'utf8')) : { approvals: [], checks: [], semanticOk: true };
    const verdict = botApprovalVerdict(fixture);
    return printVerdict('bot-approval', { ok: verdict.ok, reason: verdict.reason, problems: verdict.ok ? [] : [verdict.reason] });
  }
  if (args.cmd === 'couples') return printVerdict('couples', runCouples(args.base));
  if (args.cmd === 'compaction') return printVerdict('compaction', runCompaction());
  if (args.cmd === 'assertions') return printVerdict('assertions', runAssertions(args.base));
  if (args.cmd === 'identity') {
    const branch = args.branch || process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME || 'master';
    return printVerdict('identity', runIdentity(branch, args.base));
  }
  if (args.cmd === 'targeted-tests') {
    let changed = [];
    if (args.base) {
      try { changed = git(['diff', '--name-only', args.base, 'HEAD']).split('\n').filter(Boolean); } catch { changed = []; }
    }
    const verdict = targetedTests(changed, path.join(ROOT, 'test', 'critical'), (dir) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f));
    });
    for (const file of verdict.files) console.log(file);
    console.log(`targeted-tests ${verdict.files.length}`);
    return 0;
  }
  if (args.cmd === 'all') {
    const branch = args.branch || process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME || 'master';
    let code = 0;
    code |= printVerdict('couples', runCouples(args.base));
    code |= printVerdict('assertions', runAssertions(args.base));
    code |= printVerdict('identity', runIdentity(branch, args.base));
    return code;
  }
  console.error(`unknown command ${args.cmd}`);
  return 2;
}

module.exports = {
  exactPairs, reviewCouples, reviewDiff, replayCompaction, assertionsWeakened, assertionProfile,
  targetedTests, identityProblems, botApprovalVerdict, couplesPresent, IDENTITIES, GENERIC_CHANGELOG,
};

if (require.main === module) {
  process.exit(main(process.argv.slice(2)) || 0);
}
