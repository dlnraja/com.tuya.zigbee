const fs = require('fs');
const path = require('path');

// Fix "Missing Capability Listener" error in fingerbot and others
const searchDir = 'drivers';
let fixedCount = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'device.js') {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Check for common capability listener registrations missing before super.onNodeInit()
      // This is a known issue where capabilities are triggered during init but listeners aren't ready yet.
      // We will look for instances where super.onNodeInit is called before registerCapabilityListener

      // For this specific pass, let's fix any syntax errors reported in the logs first
      // "Initializing Driver switch_1gang: /app/drivers/switch_1gang/driver.js:93"
      // "Invalid or unexpected token"
    }
  }
}

// walk(searchDir);
console.log(`\n✅ Script setup ready`);
