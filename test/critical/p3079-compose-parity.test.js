'use strict';
// P3079: the bot bump must never commit an app.json that a compose rebuild would not give back, and never
// drop a setting/capability that compose still names (399155aae2 dropped adaptive_lighting on 23 lights
// because driver.settings.compose.json shadowed driver.compose.json).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const gate = require('../../scripts/ci/compose-parity-gate.cjs');
const { lostOnRecompose } = require('../../scripts/ci/compose-rebuild.cjs');
const flat = (s) => (s || []).flatMap((x) => x && x.children ? x.children : [x]);

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3079-t-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}
const drv = (id, settings, caps) => ({ id, capabilities: caps || ['onoff'], settings: settings.map((s) => ({ id: s, type: 'checkbox' })) });

describe('P3079 compose ↔ app.json parity gate', function () {
  this.timeout(180000);

  it('committed app.json equals a rebuild from compose (after flow dedupe + sanitize-manifest)', async () => {
    const r = await gate.checkParity(ROOT);
    assert.deepStrictEqual(r.lost, [], 'entries present in app.json only would be lost at the next bump');
    assert.ok(r.ok, `drift: ${JSON.stringify(r.diffs.slice(0, 5))}`);
  });

  it('flags a setting dropped vs base while compose still names it (the 399155aae2 shape)', () => {
    const dir = fixture({ 'drivers/lamp/driver.compose.json': { settings: [{ id: 'adaptive_lighting' }] },
      'drivers/lamp/driver.settings.compose.json': [{ id: 'other' }] });
    try {
      const base = { drivers: [drv('lamp', ['other', 'adaptive_lighting'])] };
      const next = { drivers: [drv('lamp', ['other'])] };
      assert.deepStrictEqual(gate.lostVsBase(dir, base, next), [{ driver: 'lamp', kind: 'setting', id: 'adaptive_lighting' }]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('accepts deliberate removals: id gone from compose, or driver folder deleted', () => {
    const dir = fixture({ 'drivers/lamp/driver.compose.json': { settings: [{ id: 'other' }] } });
    try {
      const base = { drivers: [drv('lamp', ['other', 'old_one'], ['onoff', 'dim']), drv('gone', ['x'])] };
      const next = { drivers: [drv('lamp', ['other'], ['onoff'])] };
      assert.deepStrictEqual(gate.lostVsBase(dir, base, next), []);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('lostOnRecompose reports drivers, capabilities and settings present only in app.json (children flattened)', () => {
    const a = { drivers: [{ id: 'd', capabilities: ['onoff', 'dim'], settings: [{ type: 'group', children: [{ id: 's1' }, { id: 's2' }] }] }, { id: 'e' }] };
    const b = { drivers: [{ id: 'd', capabilities: ['onoff'], settings: [{ id: 's1' }] }] };
    assert.deepStrictEqual(lostOnRecompose(a, b), [
      { driver: 'd', kind: 'capability', id: 'dim' }, { driver: 'd', kind: 'setting', id: 's2' }, { driver: 'e', kind: 'driver' }]);
  });

  it('normalise drops driver-scoped flow cards, _comment and version, and is idempotent', () => {
    const ids = { triggers: new Set(['t_drv']), conditions: new Set(), actions: new Set() };
    const m = { _comment: 'x', version: '1.2.3', id: 'a', flow: { triggers: [{ id: 't_drv' }, { id: 't_app' }] }, drivers: [] };
    const n1 = gate.normalise(ROOT, m, ids);
    assert.deepStrictEqual(n1.flow.triggers.map((c) => c.id), ['t_app']);
    assert.ok(!('_comment' in n1) && !('version' in n1));
    assert.deepStrictEqual(gate.normalise(ROOT, n1, ids), n1);
  });

  it('diff output is bounded', () => {
    const a = {}; const b = {};
    for (let i = 0; i < 500; i++) { a[`k${i}`] = i; b[`k${i}`] = -i - 1; }
    assert.ok(gate.diff(a, b, '', []).length <= 50);
  });

  it('shadowed driver.compose.json settings may only shrink (ratchet vs compose-shadow-baseline.json)', () => {
    const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ci/compose-shadow-baseline.json'), 'utf8')).drivers;
    const fresh = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const sp = path.join(ROOT, 'drivers', id, 'driver.settings.compose.json');
      const cp = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(sp) || !fs.existsSync(cp)) { continue; }
      const eff = new Set(flat(JSON.parse(fs.readFileSync(sp, 'utf8'))).map((x) => x.id));
      for (const s of flat(JSON.parse(fs.readFileSync(cp, 'utf8')).settings)) {
        if (s.id && !eff.has(s.id) && !(base[id] || []).includes(s.id)) { fresh.push(`${id}:${s.id}`); }
      }
    }
    assert.deepStrictEqual(fresh, [], 'put new settings in driver.settings.compose.json — driver.compose.json settings are ignored there');
  });

  // bastien-home: the only bot manifest commit is .github/scripts/version-writeback.sh
  // (auto-publish-on-push.yml triggers on master/main only).
  it('version write-back runs the gate (with --base=HEAD app.json) before its commit; CI self-check runs it', () => {
    const sh = fs.readFileSync(path.join(ROOT, '.github/scripts/version-writeback.sh'), 'utf8');
    assert.ok(/compose-parity-gate\.cjs --base=/.test(sh) && /git show HEAD:app\.json/.test(sh));
    const lines = sh.split('\n');
    const commits = lines.map((l, i) => [l, i]).filter(([l]) => /git commit -q -m "chore\(version\)/.test(l));
    assert.strictEqual(commits.length, 1);
    for (const [, i] of commits) { assert.match(lines[i - 1], /compose_parity_or_die/); }
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/ci-self-check.yml'), 'utf8'), /node scripts\/ci\/compose-parity-gate\.cjs/);
  });

  // Simulated drift: the real version-writeback.sh in a throwaway repo, Athom status and gate stubbed.
  function writebackSandbox(gateExit) {
    const { execFileSync, spawnSync } = require('child_process');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3079-wb-'));
    const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString().trim();
    const origin = path.join(tmp, 'origin.git'); const wt = path.join(tmp, 'wt');
    execFileSync('git', ['init', '-q', '--bare', '-b', 'bastien-home', origin]);
    execFileSync('git', ['init', '-q', '-b', 'bastien-home', wt]);
    const put = (rel, body) => { fs.mkdirSync(path.dirname(path.join(wt, rel)), { recursive: true }); fs.writeFileSync(path.join(wt, rel), body); };
    put('app.json', JSON.stringify({ id: 'x', version: '1.0.0' }));
    put('package.json', '{\n  "name": "x",\n  "version": "1.0.0"\n}\n');
    put('.github/scripts/version-writeback.sh', fs.readFileSync(path.join(ROOT, '.github/scripts/version-writeback.sh'), 'utf8'));
    put('scripts/ci/homey-build-status.js', "console.log(JSON.stringify({state:'test',version:'1.0.5'}));\n");
    put('scripts/ci/compose-parity-gate.cjs', `process.exit(${gateExit});\n`);
    git(wt, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
    git(wt, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
    git(wt, 'remote', 'add', 'origin', origin);
    git(wt, 'push', '-q', 'origin', 'HEAD:bastien-home');
    const head0 = git(origin, 'rev-parse', 'bastien-home');
    const r = spawnSync('bash', ['.github/scripts/version-writeback.sh', 'bastien-home', 'app.x'],
      { cwd: wt, env: { ...process.env, RUNNER_TEMP: tmp, GIT_CONFIG_NOSYSTEM: '1' }, encoding: 'utf8', timeout: 60000 });
    return { r, head0, head1: git(origin, 'rev-parse', 'bastien-home'), log: git(wt, 'log', '--format=%s', '-3'),
      marker: fs.existsSync(path.join(tmp, 'p3079-parity-drift')), dirty: git(wt, 'status', '--porcelain') };
  }

  it('simulated drift: write-back exits 3 before chore(version), pushes nothing, says the bump is skipped', () => {
    const s = writebackSandbox(1);
    assert.strictEqual(s.r.status, 3, s.r.stdout + s.r.stderr);
    assert.match(s.r.stdout, /::error title=compose parity::/);
    assert.match(s.r.stdout, /version bump v1\.0\.5 SKIPPED/);
    assert.ok(!/chore\(version\)/.test(s.log), s.log);
    assert.strictEqual(s.head1, s.head0, 'origin must not move');
    assert.ok(s.marker, 'drift marker for the red verdict step');
    assert.strictEqual(s.dirty, '');
  });

  it('control: parity OK lets the same sandbox commit and push chore(version) v1.0.5', () => {
    const s = writebackSandbox(0);
    assert.strictEqual(s.r.status, 0, s.r.stdout + s.r.stderr);
    assert.match(s.log, /chore\(version\): v1\.0\.5 written back/);
    assert.notStrictEqual(s.head1, s.head0);
    assert.ok(!s.marker);
  });

  it('bastien-publish.yml: a parity drift turns the job red despite continue-on-error on the write-back step', () => {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-publish.yml'), 'utf8');
    const i = y.indexOf('id: version_writeback'); const j = y.indexOf('Compose parity verdict for write-back');
    assert.ok(i > 0 && j > i);
    const verdict = y.slice(j, j + 600);
    assert.match(verdict, /steps\.version_writeback\.outcome == 'failure'/);
    assert.match(verdict, /p3079-parity-drift/);
    assert.ok(!/continue-on-error/.test(verdict.split('\n      - name:')[0]));
  });
});
