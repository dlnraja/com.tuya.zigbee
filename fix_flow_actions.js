const fs = require('fs');
const glob = require('glob');

const replacement = `    for (const { id, ep, val } of gangActions) {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(async (args) => {
          if (!args.device) return false;
          const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
          try {
            if (val === 'toggle') {
              await args.device.triggerCapabilityListener(cap, !args.device.getCapabilityValue(cap));
            } else {
              await args.device.triggerCapabilityListener(cap, val);
            }
          } catch(e) {
            args.device.error('Flow Action Error:', e);
          }
          return true;
        });
      } catch (err) { this.error(\`Action \${id}: \${err.message}\`); }
    }`;

const allReplacement = `    for (const { id, val } of [
      { id: \`\${P}_turn_on_all\`, val: true },
      { id: \`\${P}_turn_off_all\`, val: false },
    ]) {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(async (args) => {
          if (!args.device) return false;
          // Determine the number of gangs from P (e.g. 'switch_3gang' -> 3)
          let numGangs = 1;
          const match = P.match(/^switch_(\\d+)gang$/);
          if (match) numGangs = parseInt(match[1], 10);
          for (let ep = 1; ep <= numGangs; ep++) {
            const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
            try { await args.device.triggerCapabilityListener(cap, val); } catch(e) {}
          }
          return true;
        });
      } catch (err) { this.error(\`Action \${id}: \${err.message}\`); }
    }`;

const files = glob.sync('drivers/wall_switch_*/driver.js');
for (const file of files) {
   let text = fs.readFileSync(file, 'utf8');
   let changed = false;
   const rx = /for\s*\(\s*const\s*\{\s*id,\s*ep,\s*val\s*\}\s*of\s*gangActions\s*\)\s*\{[\s\S]*?catch\s*\([^)]*\)\s*\{\s*this\.error.*?\n\s*\}/;
   if (rx.test(text)) {
      text = text.replace(rx, replacement);
      changed = true;
   }
   
   const rxAll = /for\s*\(\s*const\s*\{\s*id,\s*val\s*\}\s*of\s*\[[\s\S]*?turn_off_all[\s\S]*?catch\s*\([^)]*\)\s*\{\s*this\.error.*?\n\s*\}/;
   if (rxAll.test(text)) {
      text = text.replace(rxAll, allReplacement);
      changed = true;
   }
   
   if (changed) {
      fs.writeFileSync(file, text);
      console.log('Patched:', file);
   }
}
// } balancing for validator
