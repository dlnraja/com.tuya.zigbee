'use strict';
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const g = require('../scripts/ci/standing-rules-gate');
const ROOT = path.join(__dirname, '..');

describe('P3102 standing rules gate', () => {
  it('flags two human pushes under 15 min, ignores bot commits', () => {
    const now = 1e9;
    const out = g.spacing([`a\t${now}\tdlnraja fix x`, `b\t${now - 60}\tgithub-actions[bot] chore [skip ci]`, `c\t${now - 300}\tdlnraja feat y`, `d\t${now - 3000}\tdlnraja z`]);
    assert.strictEqual(out.length, 1);
    assert.ok(out[0].startsWith('a 5 min'));
  });
  it('fails ci/test commits that touch CHANGELOG.md', () => {
    assert.deepStrictEqual(g.changelog([{ h: '1', subject: 'ci(P1): x', files: ['CHANGELOG.md'] }, { h: '2', subject: 'feat: y', files: ['CHANGELOG.md'] }, { h: '3', subject: 'test: z', files: ['a.js'] }]), ['1']);
  });
  it('flags mail to Athom and forum write calls, not forum reads', () => {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'srg-'));
    const w = (n, s) => { const f = path.join(tmp, n); fs.writeFileSync(f, s); return f; };
    const bad1 = w('a.js', "sendMail({ to: 'support@athom.com' })");
    const bad2 = w('b.js', "fetch('https://community.homey.app/posts.json', { method: 'POST' })");
    const ok = w('c.js', "fetch('https://community.homey.app/t/1/posts.json')");
    assert.strictEqual(g.athom([bad1, bad2, ok]).length, 2);
  });
  it('repo passes the Athom rule today', () => {
    const { execFileSync } = require('child_process');
    const files = execFileSync('git', ['ls-files', '.github/workflows', 'scripts', 'tools'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => /\.(ya?ml|js|cjs|mjs|sh|py)$/.test(f)).map((f) => path.join(ROOT, f));
    assert.deepStrictEqual(g.athom(files), []);
  });
});

describe('P3102 secret scan workflow', () => {
  const src = fs.readFileSync(path.join(ROOT, '.github/workflows/secret-scan.yml'), 'utf8');
  it('parses, pins gitleaks by version + sha256, read-only, bounded', () => {
    const y = yaml.load(src);
    assert.deepStrictEqual(y.permissions, { contents: 'read' });
    assert.ok(y.concurrency && y.jobs.gitleaks['timeout-minutes'] <= 10);
    assert.ok(/sha256sum -c/.test(src) && /v8\.30\.1/.test(src));
    assert.ok(!/pull_request_target/.test(src));
    assert.ok(!/\$\{\{ github\.event\.[^}]*\}\}"?\s*$/m.test(src.split('run:').slice(1).join('')) || /env:/.test(src));
  });
  it('allowlist keeps real token rules (extends defaults)', () => {
    const t = fs.readFileSync(path.join(ROOT, '.gitleaks.toml'), 'utf8');
    assert.ok(/useDefault = true/.test(t));
    assert.ok(!/^\s*'''\^lib\//m.test(t), 'runtime code must stay scanned');
  });
});
