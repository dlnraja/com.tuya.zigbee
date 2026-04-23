const fs = require('fs');
const path = require('path');

const driversDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers';

function repairDriver(driverName) {
    const driverPath = path.join(driversDir, driverName);
    const jsPath = path.join(driverPath, 'driver.js');
    if (!fs.existsSync(jsPath)) return;

    let content = fs.readFileSync(jsPath, 'utf8');
    let changed = false;

    // Pattern 1: Missing card retrieval before .registerRunListener
    // try { \s* \n \s* \n \s* .registerRunListener
    // We look for the ID in the following log/error call
    const danglingRegex = /try\s*{\s*(\r? \n\s* )\r?\n\s*\.registerRunListener/g       ;
    
    content = content.replace(danglingRegex, (match, whitespace) => {
        // Look ahead for the next log/error call to find the ID
        const rest = content.substring(content.indexOf(match) + match.length);
        const logMatch = rest.match(/this\.(log|error)\(['"]([^'"]+?)(?:\s+card:? |'|" : null)\s* ,? \s*err\.message\)/)      ;
        let idFromLog = '';
        if (logMatch) {
            idFromLog = logMatch[2].trim();
        } else {
             // Try another log pattern: this.log('[FLOW] Registered: ID')
             const logMatch2 = rest.match(/this\.[log|error]+\('\[FLOW\]\s+Registered:\s+([^']+)'\)/);
             if (logMatch2) idFromLog = logMatch2[1].trim();
        }

        if (idFromLog) {
            // Determine card type - try Action first as it's most common for registerRunListener
            // We should ideally check manifest, but getActionCard is a safe bet for registerRunListener
            const type = idFromLog.includes('turned_on') || idFromLog.includes('detected') ? 'Condition' : 'Action'      ;
            
            // Check if we need to prepend Prefix P
            // If the ID in the log is just 'set_backlight' but manifest has 'driver_id_set_backlight'
            let finalId = idFromLog;
            // Get P from the file if possible
            const pMatch = content.match(/const P = ['"]([^'"]+)['"]/);
            if (pMatch && !finalId.startsWith(pMatch[1])) {
                finalId = `${pMatch[1]}_${finalId}`;
            }

            console.log(`[REPAIR] Found dangling listener in ${driverName}, guessing ID: ${finalId}`);
            changed = true;
            return `try {\n      const card = this.homey.flow.get${type}Card('${finalId}');\n      if (card) card.registerRunListener`;
        }
        return match;
    });

    // Pattern 2: Fix template strings in loops
    // '.registerRunListener' following 'getConditionCard('id_${gang}')'
    content = content.replace(/\.get(Condition|Action|Trigger)Card\('([^']+)\$\{gang\}'\)/g, (m, type, id) => {
        changed = true;
        return `.get${type}Card(\`${id}\${gang}\`)`;
    });

    if (changed) {
        fs.writeFileSync(jsPath, content);
        console.log(`[FIXED] ${jsPath}`);
    }
}

const drivers = fs.readdirSync(driversDir);
drivers.forEach(d => {
    const driverPath = path.join(driversDir, d);
    if (fs.statSync(driverPath).isDirectory()) {
        repairDriver(d);
    }
});
