'use strict';
/**
 * P3057: presence_sensor_radar and its combo-budget sibling presence_sensor_radar_ts0601 are one
 * driver family (same device.js / driver.js / settings / app-level flow cards). Fingerprint locks on
 * "the radar" hold when the name is on either driver of the family.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FAMILY = ['presence_sensor_radar', 'presence_sensor_radar_ts0601'];

function merge(parts) {
  const [first] = parts;
  const uniq = (a) => [...new Set(a)];
  return {
    ...first,
    zigbee: {
      ...first.zigbee,
      manufacturerName: uniq(parts.flatMap((p) => (p.zigbee && p.zigbee.manufacturerName) || [])),
      productId: uniq(parts.flatMap((p) => (p.zigbee && p.zigbee.productId) || [])),
    },
  };
}

/** Parent compose with the family's merged manufacturerName / productId. */
function radarFamilyCompose(root = ROOT) {
  return merge(FAMILY
    .map((id) => path.join(root, 'drivers', id, 'driver.compose.json'))
    .filter((p) => fs.existsSync(p))
    .map((p) => JSON.parse(fs.readFileSync(p, 'utf8'))));
}

/** Same, from an app.json object. */
function radarFamilyAppDriver(app) {
  return merge(FAMILY.map((id) => (app.drivers || []).find((d) => d.id === id)).filter(Boolean));
}

module.exports = { FAMILY, radarFamilyCompose, radarFamilyAppDriver };
