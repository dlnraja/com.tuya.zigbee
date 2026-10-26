'use strict';
// P2964 — one test per Homey SDK rule, with a good and a bad fixture.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const checker = require(path.join(ROOT, 'tools/ci/homey-sdk-rules.js'));
const { normalize } = require(path.join(ROOT, 'tools/ci/normalize-homey-changelog.js'));
const { goodApp, BAD } = require(path.join(ROOT, 'test/fixtures/homey-sdk-rules/cases.js'));

const SIZES = { '/assets/images/small.png': [250, 175], '/assets/images/large.png': [500, 350], '/drivers/plug/assets/images/small.png': [75, 75], '/drivers/plug/assets/images/large.png': [500, 500] };

function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}

function makeRoot(app, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2964-'));
  for (const [rel, [w, h]] of Object.entries(SIZES)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, png(w, h));
  }
  for (const d of app.drivers || []) fs.mkdirSync(path.join(root, 'drivers', d.id), { recursive: true });
  fs.writeFileSync(path.join(root, '.homeychangelog.json'), JSON.stringify({ [app.version]: { en: 'Fixes.' } }));
  fs.writeFileSync(path.join(root, 'README.txt'), 'Plain text summary.');
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(app));
  return root;
}

function runRule(id, app, files = {}) {
  const root = makeRoot(app, files);
  if (app.drivers && app.drivers[0] && app.drivers[0].id === 'ghost') fs.rmSync(path.join(root, 'drivers', 'ghost'), { recursive: true });
  try {
    return checker.run({ app, root, mode: 'build', appPath: path.join(root, 'app.json'), only: [id] }).results[0].violations;
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

describe('P2964 Homey SDK rules checker', () => {
  it('has a unique id, level, enforcement and source for every rule', () => {
    const ids = new Set();
    for (const r of checker.RULES) {
      assert.ok(!ids.has(r.id), `duplicate ${r.id}`); ids.add(r.id);
      assert.ok(['debug', 'publish', 'verified', 'project'].includes(r.level), r.id);
      assert.ok(['block', 'report'].includes(r.enforce), r.id);
      assert.ok(/^https:\/\//.test(r.source), `${r.id} source`);
      if (r.level === 'verified') assert.strictEqual(r.enforce, 'report', `${r.id} verified rules are report-only`);
    }
    assert.ok(checker.RULES.length >= 50);
  });

  it('every rule has a fixture entry', () => {
    for (const r of checker.RULES) assert.ok(r.id in BAD, `missing fixture for ${r.id}`);
  });

  it('the good fixture passes every rule', () => {
    const app = goodApp();
    const root = makeRoot(app, {});
    try {
      const out = checker.run({ app, root, mode: 'build', appPath: path.join(root, 'app.json') });
      const bad = out.results.filter((r) => r.violations.length);
      assert.deepStrictEqual(bad.map((r) => `${r.id}: ${r.violations.join('; ')}`), []);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  for (const [id, mutate] of Object.entries(BAD)) {
    if (!mutate) continue;
    it(`${id} flags its bad fixture`, () => {
      const app = goodApp(); const files = {};
      mutate(app, files);
      const v = runRule(id, app, files);
      assert.ok(v.length > 0, `${id} should report a violation`);
    });
  }

  it('SDK-P03 flags a symlinked module only in build mode', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2964-nm-'));
    try {
      fs.mkdirSync(path.join(root, 'node_modules', 'real'), { recursive: true });
      fs.symlinkSync(path.join(root, 'node_modules', 'real'), path.join(root, 'node_modules', 'linked'));
      const app = goodApp();
      const b = checker.run({ app, root, mode: 'build', only: ['SDK-P03'] }).results[0].violations;
      const c = checker.run({ app, root, mode: 'compose', only: ['SDK-P03'] }).results[0].violations;
      assert.deepStrictEqual(b, ['node_modules/linked is a symlink']);
      assert.deepStrictEqual(c, []);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('SDK-P04 reports a compact manifest above 5 MB', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2964-sz-'));
    try {
      const big = { ...goodApp(), pad: 'x'.repeat(5 * 1024 * 1024 + 10) };
      fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(big));
      assert.strictEqual(checker.run({ app: big, root, appPath: path.join(root, 'app.json'), only: ['SDK-P04'] }).results[0].violations.length, 1);
      fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(goodApp()));
      assert.strictEqual(checker.run({ app: goodApp(), root, appPath: path.join(root, 'app.json'), only: ['SDK-P04'] }).results[0].violations.length, 0);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('report-only rules never make the run fail', () => {
    const app = goodApp(); delete app.support; delete app.flow.actions[0].titleFormatted;
    const root = makeRoot(app, {});
    try { assert.strictEqual(checker.run({ app, root, appPath: path.join(root, 'app.json') }).ok, true); } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('titleFormatted helper: exact, missing, unknown, duplicate', () => {
    assert.deepStrictEqual(checker.titleFormattedProblems('Set [[a]] [[b]]', ['a', 'b']), []);
    assert.ok(checker.titleFormattedProblems('Set [[a]]', ['a', 'b'])[0].includes('missing [[b]]'));
    assert.ok(checker.titleFormattedProblems('Set [[c]] [[a]]', ['a']).some((x) => x.includes('unknown [[c]]')));
    assert.ok(checker.titleFormattedProblems('[[a]][[a]]', ['a']).some((x) => x.includes('duplicate')));
    assert.ok(checker.titleFormattedProblems('none', ['a'])[0].includes('no [[arg]]'));
  });

  it('first device arg with driver_id filter is implicit; droptoken counts', () => {
    assert.deepStrictEqual(checker.filteredArgs({ args: [{ type: 'device', name: 'device', filter: 'driver_id=x' }, { name: 'n', type: 'number' }] }), ['n']);
    assert.deepStrictEqual(checker.filteredArgs({ droptoken: ['number'], args: [{ name: 'n', type: 'number' }] }), ['n', 'droptoken']);
    assert.deepStrictEqual(checker.filteredArgs({ args: [{ type: 'device', name: 'device', filter: 'class=socket' }] }), ['device']);
  });

  it('brightness and semver helpers', () => {
    assert.ok(checker.brightness('#FFFFFF') > 184);
    assert.ok(checker.brightness('#000') < 1);
    assert.strictEqual(checker.brightness('red'), null);
    assert.strictEqual(checker.verLt('>=12.2.0', '12.5.0'), true);
    assert.strictEqual(checker.verLt('>=13.5.0', '13.5.0'), false);
  });

  it('compose mode merges driver flow cards with an implicit device arg', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2964-cmp-'));
    try {
      const app = goodApp(); app.flow = { triggers: [], conditions: [], actions: [] };
      fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(app));
      fs.mkdirSync(path.join(root, 'drivers', 'plug'), { recursive: true });
      fs.writeFileSync(path.join(root, 'drivers', 'plug', 'driver.flow.compose.json'), JSON.stringify({ actions: [{ id: 'plug_set', title: { en: 'Set' }, titleFormatted: { en: 'Set [[v]]' }, args: [{ name: 'v', type: 'number', title: { en: 'V' } }] }] }));
      const merged = checker.composeApp(root);
      assert.strictEqual(merged.flow.actions[0].args[0].filter, 'driver_id=plug');
      assert.deepStrictEqual(checker.run({ app: merged, root, mode: 'compose', only: ['SDK-F02'] }).results[0].violations, []);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('docTable lists every rule and the KB doc mentions every rule id', () => {
    const t = checker.docTable();
    const doc = fs.readFileSync(path.join(ROOT, 'docs/knowledge/HOMEY_SDK_RULES.md'), 'utf8');
    for (const r of checker.RULES) { assert.ok(t.includes(`| ${r.id} |`)); assert.ok(doc.includes(r.id), `doc misses ${r.id}`); }
  });

  it('data snapshot comes from node-homey-lib with core facts', () => {
    const d = checker.DATA;
    assert.ok(d._commit && d._homeyLibVersion);
    assert.ok(d.categories.includes('tools'));
    assert.ok(d.locales.includes('en') && d.locales.includes('fr'));
    assert.ok('socket' in d.classes && 'onoff' in d.capabilities);
    assert.ok(d.batteries.includes('CR2032'));
    assert.ok(d.flowArgTypes.includes('multiselect') && d.settingTypes.includes('dropdown'));
  });
});

describe('P2964 changelog normalizer', () => {
  it('lifts entries out of an array wrapper without overwriting real ones', () => {
    const { out, lifted, removed } = normalize({ changelog: [{ version: '1.0.0', en: 'A', date: 'x' }, { version: '1.0.1', en: 'B-old' }], '1.0.1': { en: 'B' } });
    assert.deepStrictEqual(out, { '1.0.0': { en: 'A' }, '1.0.1': { en: 'B' } });
    assert.strictEqual(lifted.length, 1);
    assert.deepStrictEqual(removed, ['changelog']);
  });
  it('flattens a version key that holds a nested changelog', () => {
    const { out } = normalize({ '9.0.450': { '9.0.450': { en: 'X' }, '9.0.451': { en: 'Y' } }, '9.0.452': { en: 'Z' } });
    assert.deepStrictEqual(Object.keys(out), ['9.0.450', '9.0.451', '9.0.452']);
    assert.strictEqual(out['9.0.450'].en, 'X');
  });
  it('leaves a clean changelog unchanged', () => {
    const src = { '1.0.0': { en: 'a', fr: 'b' }, '1.0.2': { en: 'c' } };
    const { out, lifted, removed } = normalize(src);
    assert.deepStrictEqual(out, src); assert.strictEqual(lifted.length + removed.length, 0);
  });
  it('the repository changelog: normalizing would keep every version (P3062: report-only, no rewrite)', () => {
    // WHY(P3062): master still carries a legacy "changelog" array wrapper that other scripts read
    // (homey-mandatory-check, strip-changelog-backticks). The gate stays report-only until those
    // readers are migrated; this guards that a future normalization never drops a version.
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8'));
    const versions = new Set(Object.keys(j).filter((k) => /^\d+\.\d+\.\d+$/.test(k)));
    for (const e of Array.isArray(j.changelog) ? j.changelog : []) { if (e && /^\d+\.\d+\.\d+$/.test(String(e.version || '')) && typeof e.en === 'string') versions.add(String(e.version)); }
    const { out } = normalize(j);
    for (const v of versions) assert.ok(out[v], `version ${v} kept`);
  });
});
