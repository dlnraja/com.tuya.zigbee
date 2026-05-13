const fs = require('fs');
const filesToUpdate = [
  '.github/scripts/triage-upstream-enhanced.js',
  '.github/scripts/intelligent-bug-detector.js'
];

// Let's ensure the bot never says "Already in Tuya Unified Zigbee app" but instead gives an empathetic response.
// I'll scan these files and replace any hardcoded instances.

for (const file of filesToUpdate) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Let's check for any remaining instances of "Already" or similar dismissive language
  if (content.includes('I see these fingerprints are mapped')) {
    content = content.replace(/I see these fingerprints are mapped in the Tuya Unified Zigbee app/g, "I've checked our database, and these fingerprints are technically mapped in the Tuya Unified Zigbee app");
    fs.writeFileSync(file, content);
  }
}
