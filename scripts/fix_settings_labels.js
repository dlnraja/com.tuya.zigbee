const fs = require('fs');
const path = require('path');
const driversDir = './drivers';
let fixed = 0;

const dirs = fs.readdirSync(driversDir);

for (const dir of dirs) {
  const filePath = path.join(driversDir, dir, 'driver.compose.json');
  if (!fs.existsSync(filePath)) continue;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    let changed = false;

    if (json.settings && Array.isArray(json.settings)) {
      for (const setting of json.settings) {
        if (!setting.label && setting.id) {
          // Create a label from the id
          const label = setting.id
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          setting.label = { en: label };
          changed = true;
          console.log(`  Added label "${label}" to ${setting.id}`);
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
      fixed++;
      console.log(`Fixed: ${dir}`);
    }
  } catch (err) {
    console.error(`Error processing ${dir}:`, err.message);
  }
}

console.log(`\nTotal fixed: ${fixed}`);
