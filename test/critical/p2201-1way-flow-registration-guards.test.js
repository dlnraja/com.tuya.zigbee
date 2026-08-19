'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2201 1-way flow registration guards', () => {
  const drivers = [
    'drivers/wall_switch_1gang_1way/driver.js',
    'drivers/wall_switch_2gang_1way/driver.js',
    'drivers/wall_switch_3gang_1way/driver.js',
    'drivers/wall_switch_4gang_1way/driver.js',
  ];

  it('prevents duplicate flow card registration via _flowCardsRegistered guard', () => {
    for (const d of drivers) {
      const src = read(d);
      assert.match(src, /if \(this\._flowCardsRegistered\)/, `${d} missing early return guard`);
      assert.match(src, /this\._flowCardsRegistered\s*=\s*true/, `${d} missing _flowCardsRegistered=true`);
    }
  });
});

