'use strict';

/**
 * P2352 — L99 inbox intelligence config + orchestrator present
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

describe('P2352 L99 inbox intelligence automation', () => {
  it('has config + orchestrator + workflow', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'config/enrichment/l99-inbox-intelligence.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/l99-inbox-intelligence-orchestrator.js')));
    assert.ok(fs.existsSync(path.join(ROOT, '.github/workflows/l99-inbox-intelligence.yml')));
  });

  it('config forces SHADOW forum and never-invent policy', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/enrichment/l99-inbox-intelligence.json'), 'utf8'));
    assert.equal(cfg.shadowEnv.FORUM_AUTO_POST, '0');
    assert.equal(cfg.shadowEnv.SHADOW_FORUM, '1');
    assert.equal(cfg._meta.policy.includes('Never invent'), true);
    assert.ok(cfg.phases.full.includes('github'));
    assert.ok(cfg.phases.full.includes('forum'));
    assert.ok(cfg.phases.full.includes('drivers'));
  });

  it('workflow is SHADOW + staggered cron', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/l99-inbox-intelligence.yml'), 'utf8');
    assert.match(yml, /FORUM_AUTO_POST:\s*'0'/);
    assert.match(yml, /45 2,6,10,14,18,22/);
    assert.match(yml, /defaults:\s*\n\s*run:\s*\n\s*shell:\s*bash/);
    assert.match(yml, /l99-inbox-intelligence-orchestrator/);
  });

  it('hooks exist in forum-poll / auto-enrich / recurrent', () => {
    for (const wf of [
      'forum-poll.yml',
      'auto-enrich-closed-loop.yml',
      'recurrent-orchestrator.yml',
    ]) {
      const yml = fs.readFileSync(path.join(ROOT, '.github/workflows', wf), 'utf8');
      assert.match(yml, /l99-inbox-intelligence-orchestrator/, wf);
    }
  });
});
