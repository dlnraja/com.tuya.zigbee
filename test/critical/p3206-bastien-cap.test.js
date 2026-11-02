'use strict';
// P3206 (02/11/2026 Paris): owner decision, Bastien publish cap 15500 -> 20000.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P3206 bastien publish cap', () => {
  it('bastien-publish.yml caps total combos at 20000', () => {
    const y = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'bastien-publish.yml'), 'utf8');
    assert.match(y, /HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*'20000'/);
  });
});
