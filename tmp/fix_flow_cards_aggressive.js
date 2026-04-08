const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

function walk(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                files = files.concat(walk(fullPath));
            }
        } else if (file.endsWith('.js')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = walk(path.join(rootDir, 'drivers')).concat(walk(path.join(rootDir, 'lib')));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Remove the "insane" wrapper and just keep the inner call
    // We search for the pattern that contains the actual get call
    const insaneMatch = content.match(/this\.homey\.flow\.get(Trigger|Condition|Action)Card\(['"][^'"]+['"]\)/);
    if (insaneMatch) {
       // If we find the core call, and the file contains the markers of the insane wrapper
       if (content.includes('[FLOW-SAFE] Failed to load card:')) {
           // We extract all the card IDs first
           const cardCalls = [];
           const regex = /this\.homey\.flow\.get(Trigger|Condition|Action)Card\(['"]([^'"]+)['"]\)/g;
           let match;
           while ((match = regex.exec(content)) !== null) {
               cardCalls.push({
                   full: match[0],
                   type: match[1],
                   id: match[2]
               });
           }
           
           // Now we perform a very aggressive replacement of any line that contains this.homey.flow.get*Card 
           // and [FLOW-SAFE]
           const lines = content.split('\n');
           for (let i = 0; i < lines.length; i++) {
               if (lines[i].includes('this.homey.flow.get') && lines[i].includes('[FLOW-SAFE]')) {
                   // Find which card call it is
                   for (const call of cardCalls) {
                       if (lines[i].includes(call.id)) {
                           // Replace the entire line's mess with the clean call
                           // We assume the clean call is: this.homey.flow.get[Type]Card('[id]')
                           // But wait, it might be assigned to a variable
                           if (lines[i].includes('const ') || lines[i].includes('let ') || lines[i].includes('var ')) {
                               const varMatch = lines[i].match(/(const|let|var)\s+(\w+)\s*=/);
                               if (varMatch) {
                                   lines[i] = `      ${varMatch[1]} ${varMatch[2]} = this.homey.flow.get${call.type}Card('${call.id}');`;
                               } else {
                                   lines[i] = `      this.homey.flow.get${call.type}Card('${call.id}');`;
                               }
                           } else {
                               lines[i] = `      this.homey.flow.get${call.type}Card('${call.id}');`;
                           }
                           changed = true;
                           break;
                       }
                   }
               }
           }
           content = lines.join('\n');
       }
    }

    // 2. Direct replacement of deprecated names (fallback)
    if (content.includes('getDeviceTriggerCard') || content.includes('getDeviceConditionCard') || content.includes('getDeviceActionCard')) {
        content = content.replace(/getDeviceTriggerCard/g, 'getTriggerCard');
        content = content.replace(/getDeviceConditionCard/g, 'getConditionCard');
        content = content.replace(/getDeviceActionCard/g, 'getActionCard');
        changed = true;
    }

    if (changed) {
        console.log(`Updated ${file}`);
        fs.writeFileSync(file, content);
    }
});
