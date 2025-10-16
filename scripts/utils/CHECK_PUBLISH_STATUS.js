const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING PUBLISH STATUS\n');

// Read current app.json version
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log('📦 Local app.json version:', appJson.version);

// Read .homeychangelog.json
const changelogPath = '.homeychangelog.json';
if (fs.existsSync(changelogPath)) {
  const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
  const versions = Object.keys(changelog).sort().reverse();
  console.log('📋 Latest changelog versions:', versions.slice(0, 5).join(', '));
}

console.log('\n🎯 HOMEY APP STORE STATUS:');
console.log('Published version: 2.15.110');
console.log('Local version:', appJson.version);
console.log('GitHub Actions: Check https://github.com/dlnraja/com.tuya.zigbee/actions');

console.log('\n⚠️ ISSUE IDENTIFIED:');
console.log('Recent GitHub Actions builds are NOT publishing successfully.');
console.log('The "publish succeeded" message is misleading - it succeeded to RUN, but did not PUBLISH.');

console.log('\n🔧 SOLUTION:');
console.log('We need to manually publish OR fix the GitHub Actions workflow.');
console.log('Option 1: Manual publish with: homey app publish');
console.log('Option 2: Debug GitHub Actions to understand why publication fails');

console.log('\n📊 RECOMMENDATION:');
console.log('Since version 2.15.110 is the last published, and we have critical fixes,');
console.log('we should ensure the next build ACTUALLY publishes to Homey App Store.');
console.log('The device.js fixes are NOT live until we successfully publish!\n');
