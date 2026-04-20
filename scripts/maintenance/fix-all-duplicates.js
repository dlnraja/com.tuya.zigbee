const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');

function fixComposeFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixComposeFiles(fullPath);
    } else if (file === 'driver.flow.compose.json') {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const driverName = path.basename(path.dirname(fullPath));
        let changed = false;
        
        ['triggers', 'conditions', 'actions'].forEach(type => {
          if (content[type]) {
            content[type].forEach(card => {
              // If the ID does not START with the driver name, prefix it
              if (!card.id.startsWith(driverName)) {
                card.id = `${driverName}_${card.id}`;
                changed = true;
              }
            });
          }
        });
        
        if (changed) {
          fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
          console.log(` Fixed IDs in ${fullPath}`);
        }
      } catch (e) {
        console.error(`Error processing ${fullPath}: ${e.message}`);
      }
    }
  }
}

console.log(' Starting system-wide Flow ID namespacing...');
fixComposeFiles(driversDir);
console.log(' Namespacing complete.');
