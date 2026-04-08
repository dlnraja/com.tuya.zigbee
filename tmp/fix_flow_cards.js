const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

function walk(dir) {
    let files = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                files = files.concat(walk(file));
            }
        } else if (file.endsWith('.js')) {
            files.push(file);
        }
    });
    return files;
}

const files = walk(path.join(rootDir, 'drivers')).concat(walk(path.join(rootDir, 'lib')));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Replace getDeviceTriggerCard -> getTriggerCard etc.
    if (content.includes('getDeviceTriggerCard') || content.includes('getDeviceConditionCard') || content.includes('getDeviceActionCard')) {
        content = content.replace(/getDeviceTriggerCard/g, 'getTriggerCard');
        content = content.replace(/getDeviceConditionCard/g, 'getConditionCard');
        content = content.replace(/getDeviceActionCard/g, 'getActionCard');
        changed = true;
    }

    // 2. Fix the insane nesting by matching the start and end tokens
    // We look for a line that contains the call and the crazy wrapper
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('this.homey.flow.get') && lines[i].includes('[FLOW-SAFE] Failed to load card:')) {
            // Find the ID part
            const match = lines[i].match(/this\.homey\.flow\.get(Trigger|Condition|Action)Card\(([^)]*)\)/);
            if (match) {
                const type = match[1];
                const id = match[2];
                // Replace the ENTIRE crazy wrapper with a simple call
                // Usually it starts with `try { (() => { ...` or just `(() => { ...`
                // Let's use a simpler surgical replacement if the line is too messy
                const newLine = lines[i].replace(/\(+\(\) => \{ try \{ (?:return )*(\(+\(\) => \{ try \{ return )*this\.homey\.flow\.get(Trigger|Condition|Action)Card\(([^)]*)\);( \}+ catch \(e\) \{ [^}]* \} \)\(\);?)+/g, 'this.homey.flow.get$2Card($3)');
                
                if (newLine !== lines[i]) {
                    lines[i] = newLine;
                    changed = true;
                }
            }
        }
    }
    
    if (changed) {
        content = lines.join('\n');
        console.log(`Updated ${file}`);
        fs.writeFileSync(file, content);
    }
});
