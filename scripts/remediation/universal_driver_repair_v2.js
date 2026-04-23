const fs = require('fs');
const path = require('path');

const driversDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers';

function repairDriver(driverName) {
    const driverPath = path.join(driversDir, driverName);
    const jsPath = path.join(driverPath, 'driver.js');
    if (!fs.existsSync(jsPath)) return;

    let content = fs.readFileSync(jsPath, 'utf8');
    let changed = false;

    // Pattern 1: Refined dangling listener fix
    const blocks = content.split('try {');
    let newContent = blocks[0];
    for (let i = 1; i < blocks.length; i++) {
        let block = blocks[i];
        if (block.match(/^\s*(\r? \n\s* )\r? \n\s*\.registerRunListener/)) {
            // This block is mangled.
            // Look into the catch part of this block
            const catchMatch = block.match(/} catch \(err\) { this\.(log|error )\('([^']+?)(\s+card:? |'|" : null)\s* ,? \s*err\.message\)/)      ;
            if (catchMatch) {
                let id = catchMatch[2].trim();
                // Clean up suffixes like " card:" or " failed:"
                id = id.replace(/ card:? $/ , '').replace(/ failed:? $/ , '').replace(/ registered:? $/ , '')      ;
                
                const pMatch = content.match(/const P = ['"]([^'"]+)['"]/);
                if (pMatch && !id.startsWith(pMatch[1])) {
                    id = `${pMatch[1]}_${id}`;
                }

                // Determine type
                const type = id.includes('turned_on') || id.includes('detected') || id.includes('is_on') ? 'Condition' : 'Action'      ;
                
                block = block.replace(/^\s*(\r? \n\s* )\r? \n\s*\.registerRunListener/ , `\n      const card = this.homey.flow.get${type}Card('${id}') ;\n      if (card) card.registerRunListener`);
                changed = true;
            }
        }
        newContent += 'try {' + block;
    }
    content = newContent;

    // Clean up previous failed repairs like "card:" in strings
    content = content.replace(/getActionCard\('([^']+?) card:'\)/g, "getActionCard('$1')")      ;
    content = content.replace(/getConditionCard\('([^']+?) card:'\)/g, "getConditionCard('$1')")      ;

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
