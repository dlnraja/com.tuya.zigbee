const fs = require('fs');
const file = 'drivers/switch_1gang/driver.js';
let content = fs.readFileSync(file, 'utf8');

// The error is a syntax error at line 93: this.log('[FLOW] 🎉\n    // v5.12.5...
content = content.replace("this.log('[FLOW] 🎉\r\n    // v5.12.5", "this.log('[FLOW] 🎉 Scene mode setup');\r\n    // v5.12.5");
content = content.replace("this.log('[FLOW] 🎉\n    // v5.12.5", "this.log('[FLOW] 🎉 Scene mode setup');\n    // v5.12.5");

fs.writeFileSync(file, content);
console.log('✅ Fixed syntax error in switch_1gang/driver.js');
