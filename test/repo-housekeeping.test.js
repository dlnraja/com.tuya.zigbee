'use strict';

/**
 * Tests — repo housekeeping (v9.0.368)
 * Safety contract of .github/scripts/repo-housekeeping.js:
 *  - PROTECTED files never match a move rule
 *  - referenced files are skipped, never moved
 *  - dry-run mode never mutates the working tree
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.github', 'scripts', 'repo-housekeeping.js');
const src = fs.readFileSync(SCRIPT, 'utf8');

const PROTECTED_MUST_STAY = [
  'app.js', 'app.json', 'api.js', 'package.json', 'README.md',
  'CHANGELOG.md', 'AGENTS.md', 'LICENSE', 'jest.config.js',
];

function dryRun() {
  return JSON.parse(
    execSync(`node "${SCRIPT}"`, { cwd: ROOT, encoding: 'utf8' })
      ? true
      : fs.readFileSync(path.join(ROOT, '.github', 'state', 'housekeeping-report.json'), 'utf8')
  );
}

describe('repo housekeeping — safety contract', () => {
  it('has an explicit PROTECTED list covering critical root files', () => {
    for (const f of PROTECTED_MUST_STAY) {
      assert.ok(src.includes(`'${f}'`), `${f} must be PROTECTED`);
    }
  });

  it('skips any file that has incoming references', () => {
    assert.match(src, /countReferences/);
    assert.match(src, /refs > 0/);
  });

  it('defaults to dry-run and only mutates with --apply', () => {
    assert.match(src, /APPLY = process\.argv\.includes\('--apply'\)/);
    assert.match(src, /if \(APPLY\)/);
  });

  it('uses git mv for tracked files (history preserved)', () => {
    assert.match(src, /git mv/);
  });

  it('dry-run does not modify the working tree', function () {
    if (typeof this.timeout === 'function') {this.timeout(120000);}
    const before = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    execSync(`node "${SCRIPT}"`, { cwd: ROOT, stdio: 'pipe' });
    const after = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(after, before);
  });

  it('report marks protected root files as unmovable', () => {
    const report = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.github', 'state', 'housekeeping-report.json'), 'utf8')
    );
    const moved = report.moved.map(m => m.file);
    for (const f of PROTECTED_MUST_STAY) {
      assert.ok(!moved.includes(f), `${f} must never be moved`);
    }
  });
});
