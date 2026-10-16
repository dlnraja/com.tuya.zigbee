'use strict';

/**
 * P2829 — GitHub Actions anti-spam Contre quoi
 * Contre quoi: Secure Notifications fans out on every Unified-CI / syntax /
 * code-quality / auto-fix completion → Cancelled+Success email storm.
 * Dual-app: MASTER_ONLY (CI). No invent pid. No forum POST.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const YML = path.join(ROOT, '.github/workflows/notifications.yml');

describe('P2829 GH Actions anti-spam (notifications)', () => {
  it('workflow_run watches Auto-Publish only (not CI fan-out)', () => {
    const yml = fs.readFileSync(YML, 'utf8');
    const block = yml.match(/workflow_run:\s*\n([\s\S]*?)(?=\n  [a-z_]|\npermissions:)/);
    assert.ok(block, 'workflow_run block present');
    const body = block[1];
    assert.match(body, /Auto-Publish on Push/);
    assert.doesNotMatch(body, /Unified CI\/CD Orchestrator/);
    assert.doesNotMatch(body, /Syntax Check & SDK3/);
    assert.doesNotMatch(body, /code-quality/);
    assert.doesNotMatch(body, /Auto-Fix \+ Publish Pipeline/);
  });

  it('digest-event on workflow_run only when conclusion==failure', () => {
    const yml = fs.readFileSync(YML, 'utf8');
    assert.match(yml, /workflow_run\.conclusion\s*==\s*'failure'/);
  });

  it('npm check:p2829 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2829']);
  });
});
