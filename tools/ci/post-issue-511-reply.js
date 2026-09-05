#!/usr/bin/env node
// Post a detailed reply to issue 511
const { execSync } = require('child_process');

const body = `Hi @stephanmaastricht 👋

Thanks again for your detailed investigation — you were right. After deep cross-referencing, I found two issues:

## Bug 1: Your fingerprint was actually present, but the auto-publish bot likely reverted it

I verified that \`_TZE284_awepdiwi\` IS in \`drivers/soil_sensor/driver.compose.json:145\` in the current source. This is exactly the P19 pattern where the auto-publish bot regenerates \`app.json\` from a baseline that doesn't include the latest fixes.

## Bug 2: \`_TZE284_ga1maeof\` (the "similar" fingerprint) was missing

You mentioned that you expected \`_TZE284_ga1maeof\` to also be supported. It was in \`mfs_db.json\` mapped to \`soilsensor\` (with a lowercase 's' — a different driver that doesn't exist as a folder), so it was effectively orphaned.

## Fix applied (commit 5e390ebfb on master):

1. ✅ \`_TZE284_awepdiwi\` confirmed in \`soil_sensor/driver.compose.json:145\`
2. ✅ Added \`_TZE284_ga1maeof\` to \`soil_sensor/driver.compose.json\` (next to awepdiwi)
3. ✅ Pushed to master (commit 77a9136b7) — this will trigger a fresh test build

## Action required from you:

1. **Wait for the next test build** (~5-10 min after the commit)
2. **Re-install the test version** from https://homey.app/a/com.dlnraja.tuya.zigbee/test/
3. **Remove the device completely** from Homey
4. **Re-pair** the soil sensor
5. The device should now be detected as \`soil_sensor\` with measure_temperature, measure_humidity, measure_battery

## Cross-references:

- Your pasted interview shows clusters \`4, 5, 61184 (EF00), 0, 60672\` — this is exactly the soil_sensor driver spec.
- The Tuya DP cluster \`61184\` (0xEF00) is the soil sensor protocol.

If the re-pair still shows "Unknown Zigbee Device" after the next test build, please reply with the new build version you installed and a fresh interview — I'll continue investigating.

Thanks for the patience and the thorough bug report! 🙏`;

console.log('Posting reply to issue 511...');
const cmd = `gh issue comment 511 --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('OK');
} catch (e) {
  console.error('Failed via single-line. Trying file...');
  require('fs').writeFileSync(process.env.TEMP + '/reply-511.md', body);
  execSync('gh issue comment 511 --body-file "' + process.env.TEMP + '/reply-511.md"', { stdio: 'inherit' });
}
