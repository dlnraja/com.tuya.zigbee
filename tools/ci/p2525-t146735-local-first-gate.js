'use strict';

/**
 * P2525 gate — T146735 local-first SSOT + wiring present.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const ssot = path.join(ROOT, 'config/architecture/t146735-local-first-lessons.json');
const persist = path.join(ROOT, 'lib/wifi/LocalCredentialPersist.js');
const device = path.join(ROOT, 'lib/tuya-local/TuyaLocalDevice.js');

function fail(msg) {
  console.error('[P2525]', msg);
  process.exit(1);
}

if (!fs.existsSync(ssot)) fail('missing t146735-local-first-lessons.json');
if (!fs.existsSync(persist)) fail('missing LocalCredentialPersist.js');
const j = JSON.parse(fs.readFileSync(ssot, 'utf8'));
if (j.patch !== 'P2525' || j.source?.topicId !== 146735) fail('SSOT patch/topic mismatch');
const src = fs.readFileSync(device, 'utf8');
if (!src.includes('hydrateLocalCredentialsOnBoot')) fail('TuyaLocalDevice missing hydrate hook');

const r = spawnSync(process.execPath, ['--test', path.join(ROOT, 'test/critical/p2525-t146735-local-first.test.js')], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) fail('unit test failed');
console.log('[P2525] PASS t146735 local-first gate');
