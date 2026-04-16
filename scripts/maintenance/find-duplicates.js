const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const allIds = {};
const duplicates = [];

function findComposeFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findComposeFiles(fullPath);
    } else if (file === 'driver.flow.compose.json') {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const driverName = path.basename(path.dirname(fullPath));
        
        ['triggers', 'conditions', 'actions'].forEach(type => {
          if (content[type]) {
            content[type].forEach(card => {
              const id = card.id;
              if (allIds[id]) {
                allIds[id].push(driverName);
                if (!duplicates.includes(id)) duplicates.push(id);
              } else {
                allIds[id] = [driverName];
              }
            });
          }
        });
      } catch (e) {
        console.error(`Error parsing ${fullPath}: ${e.message}`);
      }
    }
  }
}

findComposeFiles(driversDir);

if (duplicates.length > 0) {
  console.log('❌ Found duplicate Flow card IDs:');
  duplicates.forEach(id => {
    console.log(`- ${id}: found in drivers [${allIds[id].join(', ')}]`);
  });
} else {
  console.log('✅ No duplicate Flow card IDs found.');
}
