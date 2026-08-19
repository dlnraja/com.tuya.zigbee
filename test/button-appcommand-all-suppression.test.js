'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');

describe('markAppCommandAll suppression risk (perEndpointControl)', () => {
  it('UnifiedSwitchBase must not call markAppCommandAll in _setGangOnOff', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');

    // Gate: no longer stamp all gangs as appCommandPending
    assert.doesNotMatch(
      src,
      /requiresPerEndpointControl\(\)[\s\S]{0,400}markAppCommandAll\(\)/
    );

    // Gate: we always mark only the targeted gang
    assert.match(src, /this\.markAppCommand\(gang,\s*value\)/);
  });
});

