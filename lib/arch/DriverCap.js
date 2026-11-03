'use strict';
// WHY(P3264): single driver-count gate (docs/rules/FIT_347_HOSTED_PROFILES.md).
// Athom refuses builds above 347 drivers: the payload stays <= cap and no script creates a new driver id;
// couples go into a surviving driver, a folding continuation, or a hosted profile in a dormant slot.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function load(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'config', 'architecture', 'driver-cap.json')));
}

/** true when `id` is an existing source driver id (creating anything else is refused). */
function canCreateDriver(id, root = ROOT, cfg = null) {
  const c = cfg || load(root);
  return (c.sourceIds || []).includes(id);
}

/** Throws unless `id` is already known; message tells the caller where couples go instead. */
function assertCanCreateDriver(id, root = ROOT, cfg = null) {
  if (canCreateDriver(id, root, cfg)) {return true;}
  throw new Error(`P3264 driver cap: new driver id "${id}" refused. Add the couples to a surviving driver `
    + '(same class/caps), a continuation folded into its root, or a hosted profile '
    + '(config/architecture/hosted-profiles.json). See docs/rules/FIT_347_HOSTED_PROFILES.md.');
}

/** Source drivers/ ids missing from the baseline (new ids). */
function newSourceIds(root = ROOT, cfg = null) {
  const c = cfg || load(root);
  const known = new Set(c.sourceIds || []);
  const dir = path.join(root, 'drivers');
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'driver.compose.json')) && !known.has(d)).sort();
}

/** Payload check: { ok, count, cap }. */
function checkPayload(manifest, cfg = null) {
  const c = cfg || load();
  const count = ((manifest && manifest.drivers) || []).length;
  return { ok: count <= c.cap, count, cap: c.cap, target: c.target };
}

module.exports = { load, canCreateDriver, assertCanCreateDriver, newSourceIds, checkPayload };
