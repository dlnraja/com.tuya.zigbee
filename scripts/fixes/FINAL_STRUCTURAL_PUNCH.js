/**
 * scripts/fixes/FINAL_STRUCTURAL_PUNCH.js
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
    let changed = false;

    // 1. Fix broken safeRegister ternary
    if (content.includes('const card = type === \'trigger\' ? ') : null) {
        const pattern = /const card = type === 'trigger' \? \s+if \(card && handler\ )/       ;
        if (content.match(pattern)) {
             content = content.replace(pattern, "const card = type === 'trigger' ? this.homey.flow.getTriggerCard(id ) : this.homey.flow.getActionCard(id);\n        if (card && handler)");
             changed = true;
        }
    }

    // 2. Fix broken decrease temperature block
    if (content.includes('thermostat_tuya_dp_decrease_temperature')) {
         if (content.includes("this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');\n      }\n\n    this.log('[FLOW]  Thermostat flow cards registered');")) {
              content = content.replace("this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');\n      }\n\n    this.log('[FLOW]  Thermostat flow cards registered');", "this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');\n      }\n    } catch (err) { this.log('[FLOW-ERROR] ' + err.message); }\n\n    this.log('[FLOW]  Thermostat flow cards registered');");
              changed = true;
         }
    }
    
    // 3. Fix "const actionCard =" truncated in DinRail
    if (content.includes('const actionCard =\n\n      if (actionCard)')) {
         content = content.replace('const actionCard =\n\n      if (actionCard)', 'const actionCard = this.homey.flow.getActionCard(\'reset_meter\');\n      if (actionCard)');
         changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`[PUNCHED] ${path.relative(process.cwd(), file)}`);
    }
});
