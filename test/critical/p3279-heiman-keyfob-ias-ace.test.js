'use strict';
// The keyfob binds IAS ACE (1281). The endpoint cluster list is what Homey builds.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('HEIMAN keyfob declares the IAS ACE cluster it binds', () => {
  const k = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers/heiman_keyfob/driver.compose.json'), 'utf8'));
  const ep = k.zigbee.endpoints['1'];
  assert.ok(ep.bindings.includes(1281));
  assert.ok(ep.clusters.includes(1281));
});
