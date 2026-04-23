const fs = require('fs');
const file = 'drivers/switch_3gang/device.js';
let content = fs.readFileSync(file, 'utf8');

// The file has a misplaced block injected into `Date.now();`
// `this._lastCommandTime = Date\n      try {\n          await super.onNodeInit({ zclNode });\n        } catch (superErr) {\n          this.error('[SWITCH-3G]  Super init error (non-fatal):', superErr.message);\n          this.zclNode = zclNode;\n        }\n  .now();`

const brokenBlock = `this._lastCommandTime = Date
      try {
          await super.onNodeInit({ zclNode });
        } catch (superErr) {
          this.error('[SWITCH-3G]  Super init error (non-fatal):', superErr.message);
          this.zclNode = zclNode;
        }
  .now();`;

const fixedBlock = `this._lastCommandTime = Date.now();`;

if (content.includes(brokenBlock)) {
  content = content.replace(brokenBlock, fixedBlock);
  fs.writeFileSync(file, content);
  console.log(' Fixed syntax error in switch_3gang/device.js');
} else {
  // Let's do a regex replace to catch any variations
  const rgx = /this\._lastCommandTime\s*=\s*Date[\s\S]*? \.now\(\);/;
  const match = content.match(rgx);
  if (match) {
    content = content.replace(rgx, 'this._lastCommandTime = Date.now();');
    fs.writeFileSync(file, content);
    console.log(' Regex fixed syntax error in switch_3gang/device.js');
  } else {
    console.log('Could not find the broken block.');
  }
}
