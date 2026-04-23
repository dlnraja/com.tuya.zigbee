const fs = require('fs');
const path = require('path');

const driversDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers';

function fixDriver(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix 1: Dangling .registerRunListener after empty line
    // Look for: try {\s*\n\s*\.registerRunListener
    // We need to find the ID. Often the ID is mentioned in the next log or based on the function body.
    
    // Pattern A: Multi-gang loops where the template string is broken
    // Replace 'id' or `id` with `${id}` if it's in single quotes but contains variables
    content = content.replace(/'switch_3gang_turn_on_\${gang}'/g, '`switch_3gang_turn_on_${gang}`');
    content = content.replace(/'switch_3gang_turn_off_\${gang}'/g, '`switch_3gang_turn_off_${gang}`');
    content = content.replace(/'switch_2gang_turn_on_\${gang}'/g, '`switch_2gang_turn_on_${gang}`');
    content = content.replace(/'switch_2gang_turn_off_\${gang}'/g, '`switch_2gang_turn_off_${gang}`');
    
    // Pattern B: Recover missing card retrieval for standard actions
    const patterns = [
        { regex: /try\s*{\s*\n\s*\.registerRunListener\s*\(\s*async\s*\(args\)\s*=>\s*{\s*if\s*\(!args\.device\)\s*return\s*false;\s*for\s*\(let\s*i\s*=\s*1;\s*i\s*<=\s*3;\s*i\+\+\)/, id: 'switch_3gang_turn_on_all', type: 'Action' },
        { regex: /try\s*{\s*\n\s*\.registerRunListener\s*\(\s*async\s*\(args\)\s*=>\s*{\s*if\s*\(!args\.device\)\s*return\s*false;\s*for\s*\(let\s*i\s*=\s*1;\s*i\s*<=\s*3;\s*i\+\+\).*? false/ , id: 'switch_3gang_turn_off_all', type: 'Action' },
        { regex: /try\s*{\s*\n\s*\.registerRunListener\s*\(\s*async\s*\(args\)\s*=>\s*{\s*if\s*\(!args\.device\)\s*\|\|\s*!args\.mode\)\s*return\s*false;\s*await\s*args\.device\.setSceneMode/, id: 'switch_3gang_set_scene_mode', type: 'Action' },
        { regex: /try\s*{\s*\n\s*\.registerRunListener\s*\(\s*async\s*\(args\)\s*=>\s*{\s*if\s*\(!args\.device\)\s*\|\|\s*!args\.mode\)\s*return\s*false;\s*await\s*args\.device\.setBacklightMode/, id: 'switch_3gang_set_backlight', type: 'Action' }
    ];

    patterns.forEach(p => {
        if (p.regex.test(content)) {
            const replacement = `try {\n      const card = this.homey.flow.get${p.type}Card('${p.id}');\n      if (card) card`;
            content = content.replace(p.regex, replacement);
            changed = true;
        }
    });

    // Fix 2: Wrap all .registerRunListener calls if they are dangling
    // Generic fix: if we see .registerRunListener after a try { \n [space] \n
    // This is risky but we can try to find the ID from the log call that follows.
    
    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    }
}

const drivers = fs.readdirSync(driversDir);
drivers.forEach(d => {
    const p = path.join(driversDir, d, 'driver.js');
    if (fs.existsSync(p)) fixDriver(p);
});
