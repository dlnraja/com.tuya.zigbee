'use strict';

/**
 * P2620 — Contre quoi: draft→test fleet must cover all 3 independent App IDs.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2620 draft-to-test fleet (3 apps)', () => {
  it('draft-to-test.yml accepts bastien-home branch', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/draft-to-test.yml'), 'utf8');
    assert.ok(yml.includes('bastien-home'));
    assert.ok(yml.includes('com.dlnraja.tuya.zigbee.bastien'));
    assert.ok(yml.includes('stable-v5'));
  });

  it('draft-to-test-fleet.yml matrix covers Universal + Stable + Bastien', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/draft-to-test-fleet.yml'), 'utf8');
    assert.ok(yml.includes('Draft to Test Fleet'));
    assert.ok(yml.includes('com.dlnraja.tuya.zigbee'));
    assert.ok(yml.includes('com.dlnraja.tuya.zigbee.stable'));
    assert.ok(yml.includes('com.dlnraja.tuya.zigbee.bastien'));
    assert.ok(yml.includes('bastien-home'));
    assert.ok(yml.includes('FORUM_AUTO_POST: "0"') || yml.includes("FORUM_AUTO_POST: '0'"));
  });

  it('bastien-publish.yml promotes draft→test after publish', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-publish.yml'), 'utf8');
    assert.ok(yml.includes('auto-promote-puppeteer'));
    assert.ok(yml.includes('EXPECTED_APP_ID'));
    assert.ok(!yml.includes('com.dlnraja.tuya.zigbee.stable') || yml.includes('must never'));
  });
});
