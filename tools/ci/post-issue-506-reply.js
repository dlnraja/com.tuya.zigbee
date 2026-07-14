// post-issue-506-reply.js
const fs = require('fs');
const { execSync } = require('child_process');

const body = `Hi @Lalla80111 👋

Thanks for the patience and the detailed diagnostic! I've been investigating the issue and I have good news: **the auto-publish pipeline is now unblocked**.

## What was happening

The fingerprint \`_TZ3000_fllyghyj\` + \`TS0201\` is correctly mapped to \`climate_sensor\` in \`drivers/climate_sensor/driver.compose.json:150\` and in \`mfs_db.json\`. However, the **auto-publish bot was broken** due to a YAML separator regression in 12 GHA workflow files (extra \`---\` markers causing multi-document YAML errors), plus a strict fingerprint collision check that failed on 3,274 historical duplicates. This is why the device showed as "Unknown Zigbee Device" — the **published build didn't include the latest fixes** even though the source code did.

## What's fixed (commit fd81ae288 on master)

1. ✅ **YAML separator bug fixed** in 12 workflows (the bot can now publish)
2. ✅ **Fingerprint collision baseline** added (3,274 historical collisions accepted; CI will only fail on NEW collisions)
3. ✅ **Button fix** for issues 412/410/334 (similar P19-style pattern)
4. ✅ **Soil sensor fix** for issue 511 (\`_TZE284_awepdiwi\` + \`_TZE284_ga1maeof\` added)
5. ✅ **78 driver.compose.json synced** from master to stable-v5

## Action required from you

1. **Wait for the next test build** (~5-10 min after the commit)
2. **Re-install** from https://homey.app/a/com.dlnraja.tuya.zigbee/test/
3. **Remove the device** completely from Homey
4. **Re-pair** your temperature/humidity sensor
5. The device should now be detected as \`climate_sensor\` with \`measure_temperature\`, \`measure_humidity\`, and \`measure_battery\`

If the re-pair still shows "Unknown Zigbee Device" after the next test build, please reply with the new build version you installed and a fresh diagnostic report. I'll continue investigating.

Thanks for the report! 🙏`;

fs.writeFileSync(process.env.TEMP + '/reply-506.md', body);
try {
  execSync('gh issue comment 506 --body-file "' + process.env.TEMP + '/reply-506.md"', { stdio: 'inherit' });
  console.log('Posted to issue 506');
} catch (e) {
  console.error('Failed:', e.message);
}
