'use strict';
// P3026: platform limits inventory + budget gate + CI cache key + GitHub rate-limit backoff.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const gate = require(path.join(ROOT, 'scripts', 'ci', 'platform-budget-gate.js'));
const cacheKey = require(path.join(ROOT, 'scripts', 'ci', 'npm-cache-key.js'));
const retry = require(path.join(ROOT, '.github', 'scripts', 'retry-helper.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'platform-limits.json'), 'utf8'));

test('every limit has a positive value and a source; gate thresholds are 80/90 and report mode', () => {
  assert.strictEqual(cfg.mode, 'report');
  assert.ok(cfg.failPct <= 90 && cfg.warnPct < cfg.failPct);
  for (const [id, def] of Object.entries(cfg.limits)) {
    assert.ok(def.limit > 0, `${id} limit`);
    assert.ok(typeof def.source === 'string' && def.source.length > 20, `${id} source`);
  }
});

test('grade: ok below warn, warn from 80 %, fail from 90 %, skipped when not measured', () => {
  assert.strictEqual(gate.grade(3, 4, 80, 90).status, 'ok');
  assert.strictEqual(gate.grade(3.3, 4, 80, 90).status, 'warn');
  assert.strictEqual(gate.grade(3.6, 4, 80, 90).status, 'fail');
  assert.strictEqual(gate.grade(null, 4, 80, 90).status, 'skipped');
  assert.strictEqual(gate.grade(undefined, 4, 80, 90).status, 'skipped');
});

test('comboCount matches the publish compactor (raw unique strings, case kept)', () => {
  const d = { zigbee: { manufacturerName: ['_TZ3000_a', '_TZ3000_A', '_TZ3000_a'], productId: ['TS0001', 'TS0002'] } };
  assert.strictEqual(gate.comboCount(d), 4);
  assert.strictEqual(gate.comboCount({}), 0);
  const compactor = path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs');
  if (fs.existsSync(compactor)) assert.strictEqual(require(compactor).comboCount(d), gate.comboCount(d));
});

test('combos limit follows the live workflow cap, static value only as fallback', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3026-'));
  fs.mkdirSync(path.join(dir, 'wf'));
  fs.writeFileSync(path.join(dir, 'wf', 'a.yml'), 'env:\n  HOMEY_ZIGBEE_MAX_TOTAL_COMBOS: "15500"\n');
  const def = { limit: 14000, limitFrom: { workflow: 'wf/a.yml', env: 'HOMEY_ZIGBEE_MAX_TOTAL_COMBOS' } };
  assert.strictEqual(gate.resolveLimit(def, dir), 15500);
  assert.strictEqual(gate.resolveLimit({ ...def, limitFrom: { workflow: 'nope.yml', env: 'X' } }, dir), 14000);
  const r = gate.buildReport({ zigbee_combos: 15000 }, { warnPct: 80, failPct: 90, limits: { zigbee_combos: def } }, dir);
  assert.strictEqual(r.rows[0].limit, 15500);
  assert.deepStrictEqual(r.failing, ['zigbee_combos']);
  // Compactor-filled cap: just under the cap is a warning, only above it fails.
  const filled = { ...def, warnPct: 99, failPct: 100.01 };
  assert.strictEqual(gate.buildReport({ zigbee_combos: 15470 }, { warnPct: 80, failPct: 90, limits: { zigbee_combos: filled } }, dir).rows[0].status, 'warn');
  assert.strictEqual(gate.buildReport({ zigbee_combos: 15600 }, { warnPct: 80, failPct: 90, limits: { zigbee_combos: filled } }, dir).rows[0].status, 'fail');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('report mode never fails the process', () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'ci', 'platform-budget-gate.js'), '--json', '--publish-dir', path.join(ROOT, 'does-not-exist')],
    { cwd: ROOT, encoding: 'utf8', timeout: 240000, env: { ...process.env, PLATFORM_BUDGET_MODE: '' } });
  assert.strictEqual(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  assert.strictEqual(rep.mode, 'report');
  assert.ok(rep.rows.find((x) => x.id === 'workflow_file_kb').status !== 'skipped');
});

test('npm cache key ignores the app version but follows dependencies', () => {
  const lock = { name: 'x', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'x', version: '1.0.0', dependencies: { a: '^1' } }, 'node_modules/a': { version: '1.2.3' } } };
  const bumped = JSON.parse(JSON.stringify(lock)); bumped.version = '1.0.1'; bumped.packages[''].version = '1.0.1';
  assert.strictEqual(cacheKey.depsHash(lock), cacheKey.depsHash(bumped));
  const dep = JSON.parse(JSON.stringify(lock)); dep.packages['node_modules/a'].version = '1.2.4';
  assert.notStrictEqual(cacheKey.depsHash(lock), cacheKey.depsHash(dep));
});

test('committed npm cache key file exists, so every cache-dependency-path resolves', () => {
  assert.ok(fs.existsSync(path.join(ROOT, cacheKey.KEY_FILE)));
  const wfDir = path.join(ROOT, '.github', 'workflows');
  for (const f of fs.readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n))) {
    const txt = fs.readFileSync(path.join(wfDir, f), 'utf8');
    for (const m of txt.matchAll(/cache-dependency-path:\s*['"]?([^\s'"#]+)/g)) {
      if (m[1].includes('${{') || m[1].includes('*')) continue;
      if (m[1] === '.github/npm-cache-key.sha256') assert.ok(fs.existsSync(path.join(ROOT, m[1])), `${f}: ${m[1]}`);
    }
  }
});

test('githubRateLimitWaitMs waits until x-ratelimit-reset only when the quota is exhausted', () => {
  const now = 1_000_000_000_000;
  const reset = String(now / 1000 + 30);
  assert.strictEqual(retry.githubRateLimitWaitMs({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset }, now), 31000);
  assert.strictEqual(retry.githubRateLimitWaitMs({ 'x-ratelimit-remaining': '12', 'x-ratelimit-reset': reset }, now), null);
  assert.strictEqual(retry.githubRateLimitWaitMs({}, now), null);
  assert.strictEqual(retry.githubRateLimitWaitMs(new Map([['x-ratelimit-remaining', '0'], ['x-ratelimit-reset', String(now / 1000 - 5)]]), now), 1000);
});

test('fetchWithRetry retries a 403 with exhausted quota instead of returning it', async () => {
  const orig = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      const h = new Map([['x-ratelimit-remaining', '0'], ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000))]]);
      return { ok: false, status: 403, headers: h, text: async () => 'API rate limit exceeded' };
    }
    return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
  };
  try {
    const r = await retry.fetchWithRetry('https://example.invalid/x', {}, { retries: 2, maxDelay: 5000, queue: 'p3026-test' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(calls, 2);
  } finally { global.fetch = orig; }
});

test('.homeyignore keeps backups/ out of the Homey build', () => {
  const lines = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
  assert.ok(lines.includes('backups') || lines.includes('backups/'));
});

test('PLATFORM_LIMITS.md documents every configured limit and is listed in the KB index', () => {
  const kb = path.join(ROOT, 'docs', 'knowledge', 'KB');
  const doc = fs.readFileSync(path.join(kb, 'PLATFORM_LIMITS.md'), 'utf8');
  assert.match(fs.readFileSync(path.join(kb, 'INDEX.md'), 'utf8'), /PLATFORM_LIMITS\.md/);
  for (const words of [/app\.json/i, /payload/i, /archive/i, /combos|productId/i, /heap/i, /Workflow file/i, /cache/i, /Repository size/i, /quota|rate/i, /tracked file/i]) assert.match(doc, words);
});
