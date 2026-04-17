const fs = require('fs');
const file = 'drivers/switch_2gang/driver.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("this.log('[FLOW] 🎉\r\n    // v5.12.5", "this.log('[FLOW] 🎉 Scene mode setup');\r\n    
content = content.replace("this.log('[FLOW] 🎉\n    // v5.12.5", "this.log('[FLOW] 🎉 Scene mode setup');\n    
content = content.replace("2-Gang switch flow cards registered (v5.5.930)');", "this.log('[FLOW] 🎉 2-Gang switch flow cards registered (v5.5.930)');");

fs.writeFileSync(file, content);
console.log('✅ Fixed syntax error in switch_2gang/driver.js');
