'use strict';

/**
 * P2832 — Peer complementary enrich cron Contre quoi
 *
 * Contre quoi: lose autonomous free cron; paid AI; forum POST; P2570 cartesian in cron;
 * missing safe-auto-commit; invent pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2832 peer complementary cron automation', () => {
  it('orchestrator exists and skips P2570 cartesian + forum POST + paid AI', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'tools/ci/p2832-peer-complementary-cron.js'),
      'utf8',
    );
    assert.ok(src.includes('p2830-peer-apps-compose-complementary'));
    assert.ok(src.includes('p2572-johan-mega-complementary'));
    assert.ok(src.includes('prune-fp-collision-bleed'));
    assert.ok(src.includes('skipP2570Cartesian'));
    assert.ok(src.includes('FORUM_AUTO_POST'));
    assert.ok(src.includes("AI_ALLOW_PAID: 'false'"));
    assert.ok(src.includes('neverInventPid'));
    assert.ok(!src.includes('p2570-johan-complementary-enrich.js'));
  });

  it('workflow is free cron autonomous with kill switch + safe-auto-commit', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/peer-complementary-enrich.yml'),
      'utf8',
    );
    assert.ok(yml.includes("cron: '10 6 * * 1,4'"));
    assert.ok(yml.includes('workflow_dispatch'));
    assert.ok(yml.includes("AI_ALLOW_PAID: 'false'"));
    assert.ok(yml.includes("AI_FORCE_LOCAL: 'true'"));
    assert.ok(yml.includes("FORUM_AUTO_POST: '0'"));
    assert.ok(yml.includes('PEER_COMPOSE_ENRICH_DISABLED'));
    assert.ok(yml.includes('safe-auto-commit.js'));
    assert.ok(yml.includes('peer-complementary-enrich'));
    assert.ok(yml.includes('p2832-peer-complementary-cron.js'));
    assert.ok(yml.includes('defaults:'));
    assert.ok(yml.includes('shell: bash'));
    assert.ok(yml.includes('timeout-minutes:'));
    assert.ok(yml.includes('permissions:'));
  });

  it('npm scripts check:p2832 / enrich:peers:cron wired into p283x', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2832']?.includes('p2832-peer-complementary-cron'));
    assert.ok(pkg.scripts['check:p283x']?.includes('check:p2832'));
    assert.ok(pkg.scripts['enrich:peers:cron']?.includes('p2832-peer-complementary-cron'));
    assert.ok(pkg.scripts['enrich:peers:cron:apply']?.includes('--apply'));
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/peer-complementary-cron-ssot.json'), 'utf8'),
    );
    assert.equal(ssot.patch, 'P2832');
    assert.equal(ssot.forumPost, false);
    assert.equal(ssot.paidAi, false);
    assert.ok(ssot.forbiddenInCron.some((x) => /p2570/i.test(x)));
  });

  it('auto-enrich closed-loop soft-hooks P2832 dry', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/auto-enrich-closed-loop.yml'),
      'utf8',
    );
    assert.ok(yml.includes('P2832') || yml.includes('peer-complementary') || yml.includes('p2832-peer-complementary-cron'));
  });
});
