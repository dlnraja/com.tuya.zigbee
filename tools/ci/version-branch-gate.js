#!/usr/bin/env node
// version-branch-gate.js
// Ensures master stays on v9.0.X and stable-v5 stays on v5.12.X.
// Prevents the auto-fix bot from accidentally bumping stable to v9.

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

function getBranch() {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execSync('git branch --show-current', { encoding: 'utf8', cwd: ROOT }).trim();
  } catch (e) {
    return 'unknown';
  }
}

const branch = getBranch();
const pkgVersion = pkg.version || '';
const appVersion = app.version || '';

const rules = [
  { branch: 'master', prefix: '9.0.' },
  { branch: 'stable-v5', prefix: '5.12.' },
];

let failed = false;
const rule = rules.find(r => branch === r.branch || branch.endsWith('/' + r.branch));

console.log(`═══ Version Branch Gate ═══`);
console.log(`Branch: ${branch}`);
console.log(`package.json version: ${pkgVersion}`);
console.log(`app.json version: ${appVersion}`);

if (!rule) {
  console.log(`No version rule for branch "${branch}" — skipping gate.`);
  process.exit(0);
}

function check(name, version, expectedPrefix) {
  if (!version.startsWith(expectedPrefix)) {
    console.error(`❌ FAIL: ${name} version "${version}" does not start with expected prefix "${expectedPrefix}" for branch ${branch}`);
    failed = true;
  } else {
    console.log(`✅ ${name} version "${version}" matches ${branch} prefix "${expectedPrefix}"`);
  }
}

check('package.json', pkgVersion, rule.prefix);
check('app.json', appVersion, rule.prefix);

if (pkgVersion !== appVersion) {
  console.error(`❌ FAIL: package.json (${pkgVersion}) and app.json (${appVersion}) versions do not match.`);
  failed = true;
} else {
  console.log(`✅ package.json and app.json versions match.`);
}

if (failed) {
  console.error(`\nVersion gate failed for branch "${branch}".`);
  process.exit(1);
}

console.log(`\n✅ Version gate passed.`);
