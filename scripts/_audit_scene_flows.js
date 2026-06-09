const fs = require('fs');
const path = require('path');
const d = 'drivers';
const issues = [];

const configs = {
  'switch_2gang': { gangs: 2 },
  'switch_3gang': { gangs: 3 },
  'switch_4gang': { gangs: 4 },
  'switch_wall_5gang': { gangs: 5 },
  'switch_wall_6gang': { gangs: 6 },
  'switch_wall_7gang': { gangs: 7 },
  'switch_wall_8gang': { gangs: 8 },
  'wall_switch_2gang_1way': { gangs: 2 },
  'wall_switch_3gang_1way': { gangs: 3 },
  'wall_switch_4gang_1way': { gangs: 4 },
  'switch_1gang': { gangs: 1 },
};

Object.entries(configs).forEach(([dr, cfg]) => {
  const f = path.join(d, dr, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) { issues.push(dr + ': NO flow compose file'); return; }
  try {
    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    const triggers = (json.triggers || []).map(t => t.id);
    const actions = (json.actions || []).map(a => a.id);
    
    // Check scene triggers for each gang
    for (let g = 1; g <= cfg.gangs; g++) {
      const sceneId = dr + '_gang' + g + '_scene';
      if (!triggers.includes(sceneId)) {
        issues.push(dr + ': MISSING scene trigger ' + sceneId);
      }
    }
    // Check set_scene_mode action
    const actionId = dr + '_set_scene_mode';
    if (!actions.includes(actionId)) {
      issues.push(dr + ': MISSING action ' + actionId);
    }
    
    // Check physical button triggers
    for (let g = 1; g <= cfg.gangs; g++) {
      const onId = dr + '_physical_gang' + g + '_on';
      const offId = dr + '_physical_gang' + g + '_off';
      if (cfg.gangs === 1) {
        if (!triggers.includes(dr + '_physical_on')) issues.push(dr + ': MISSING ' + dr + '_physical_on');
        if (!triggers.includes(dr + '_physical_off')) issues.push(dr + ': MISSING ' + dr + '_physical_off');
      } else {
        if (!triggers.includes(onId)) issues.push(dr + ': MISSING ' + onId);
        if (!triggers.includes(offId)) issues.push(dr + ': MISSING ' + offId);
      }
    }
  } catch(e) { issues.push(dr + ': JSON parse error - ' + e.message); }
});

if (issues.length === 0) console.log('All scene + physical flow cards OK!');
else { console.log('Issues found: ' + issues.length); issues.forEach(i => console.log('  ' + i)); }
