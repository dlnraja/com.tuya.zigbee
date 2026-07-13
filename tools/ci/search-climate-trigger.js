// search-climate-trigger.js
const fs = require('fs');
const path = require('path');

function walk(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if ((e.name.endsWith('.js') || e.name.endsWith('.json')) && !e.name.includes('node_modules')) out.push(p);
  }
  return out;
}

const files = walk('lib').concat(walk('drivers'));
if (fs.existsSync('app.js')) files.push('app.js');

const ids = ['climate_scene_trigger', 'climate_scene_triggered', '_inferCapabilityFromValue', 'safeSetCapabilityValue'];
for (const id of ids) {
  console.log('\n=== Searching for: ' + id + ' ===');
  for (const f of files) {
    try {
      const c = fs.readFileSync(f, 'utf8');
      if (c.includes(id)) {
        const lines = c.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(id)) {
            console.log('  ' + f.replace(/\\/g, '/') + ':' + (i+1) + ': ' + lines[i].trim().substring(0, 130));
          }
        }
      }
    } catch(e) {}
  }
}
