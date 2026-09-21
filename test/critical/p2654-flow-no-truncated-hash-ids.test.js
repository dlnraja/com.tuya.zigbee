'use strict';

/**
 * P2654 — Contre quoi: Athom rejects publish when a full Flow card id
 * truncates to the same hash as an explicit truncated sibling
 * (e.g. …_double_press → …_d_59d9b).
 */
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const HASH_TAIL = /_[a-z0-9]_[a-f0-9]{5}$/;

describe('P2654 — no Athom-truncated hash Flow card sibling IDs', () => {
  it('remote_button_wireless flow compose has no _x_hhhhh truncated ids', () => {
    const p = path.join(ROOT, 'drivers', 'remote_button_wireless', 'driver.flow.compose.json');
    if (!fs.existsSync(p)) return;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const bad = (j.triggers || []).filter((t) => t.id && HASH_TAIL.test(t.id)).map((t) => t.id);
    assert.deepStrictEqual(bad, [], `truncated siblings: ${bad.join(', ')}`);
  });
});
