/**
 * scripts/fixes/THERMOSTAT_DECREASE_FIX.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const allFiles = getFiles(path.join(process.cwd(), 'drivers'));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('thermostat_tuya_dp_decrease_temperature')) {
        // Fix the broken block
        const regex = /try\s*{\s*const card = this\._getFlowCard\('thermostat_tuya_dp_decrease_temperature',\s*'action'\);\s*if\s*\(card\)\s*{\s*card\.registerRunListener\(async\s*\(args\)\s*=>\s*{\s*if\s*\(!args\.device\)\s*return\s*false;\s*const\s*current\s*=\s*args\.device\.getCapabilityValue\('target_temperature'\)\s*\|\|\s*20;\s*await\s*args\.device\.triggerCapabilityListener\('target_temperature',\s*current\s*-\s*\(args\.degrees\s*\|\|\s*1\)\);\s*return\s*true;\s*}\);\s*this\.log\('\[FLOW\]\s*Registered:\s*thermostat_tuya_dp_decrease_temperature'\);\s*}\s*this\.log\('\[FLOW\]\s*Fixed\s*registration'\);\s*}/;
        
        const replacement = `    try {
      const card = this._getFlowCard('thermostat_tuya_dp_decrease_temperature', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.triggerCapabilityListener('target_temperature', current - (args.degrees || 1));
          return true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');
      }
    } catch (err) { this.log('[FLOW-ERROR] ' + err.message); }`;

        // Brute force: match the lines
        if (content.includes("this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');") && !content.includes("} catch (err) { this.log('[FLOW-ERROR] ' + err.message); }") && content.includes("Decrease temperature")) {
             // We can just find the end of the block and insert the missing pieces
             content = content.replace(/this\.log\('\[FLOW\]\s*Registered:\s*thermostat_tuya_dp_decrease_temperature'\);\s*}\n\s*this\.log\('\[FLOW\]\s*Fixed\s*registration'\);/, "this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');\n      }\n    } catch (err) { this.log('[FLOW-ERROR] ' + err.message); }\n\n    this.log('[FLOW] Fixed registration');");
             fs.writeFileSync(file, content);
             console.log(`[FIXED BLOCK] ${file}`);
        }
    }
});
