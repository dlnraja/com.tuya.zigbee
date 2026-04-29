const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const triggers = {};

console.log('--- Checking for duplicate trigger IDs ---');

// Driver triggers
if (app.drivers) {
  app.drivers.forEach(d => {
    if (d.flow && d.flow.triggers) {
      d.flow.triggers.forEach(t => {
        if (triggers[t.id]) {
            console.log(`Duplicate trigger ID: "${t.id}" found in driver "${d.id}" (already seen in "${triggers[t.id]}")`);
        } else {
            triggers[t.id] = d.id;
        }
      });
    }
  });
}

// Root triggers
if (app.flow && app.flow.triggers) {
  app.flow.triggers.forEach(t => {
    if (triggers[t.id]) {
        console.log(`Duplicate trigger ID: "${t.id}" found in root triggers (already seen in "${triggers[t.id]}")`);
    } else {
        triggers[t.id] = 'root';
    }
  });
}

console.log('--- Check complete ---');
