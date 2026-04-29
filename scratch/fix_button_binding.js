const fs = require('fs');
const path = 'drivers/button_wireless_4/device.js';
let content = fs.readFileSync(path, 'utf8');

const target = `        try {
          // Try standard bind with cluster ID
          await endpoint.bind(57344, coordinatorAddress);
          this.log('[BUTTON4-BIND]  Standard bind succeeded for cluster 57344');
          return;
        } catch (bindErr) {
          this.log(\`[BUTTON4-BIND]  Standard bind failed (expected for unknown cluster): \${bindErr.message}\`);
        }`;

const replacement = `        try {
          // v7.2.5: Try binding using registered name 'tuyaE000' (cleaner in SDK 3)
          await endpoint.bind('tuyaE000').catch(() => endpoint.bind(57344));
          this.log('[BUTTON4-BIND]  Standard bind succeeded for cluster tuyaE000');
          return;
        } catch (bindErr) {
          this.log(\`[BUTTON4-BIND]  Standard bind failed: \${bindErr.message}\`);
        }`;

// Try flexible replacement if exact match fails
if (content.includes('await endpoint.bind(57344, coordinatorAddress);')) {
    content = content.replace('await endpoint.bind(57344, coordinatorAddress);', "await endpoint.bind('tuyaE000').catch(() => endpoint.bind(57344));");
    content = content.replace("this.log('[BUTTON4-BIND]  Standard bind succeeded for cluster 57344');", "this.log('[BUTTON4-BIND]  Standard bind succeeded for cluster tuyaE000');");
    fs.writeFileSync(path, content);
    console.log('Successfully updated button_wireless_4/device.js');
} else {
    console.log('Target string not found');
}
