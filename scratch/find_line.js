const fs = require('fs');
const content = fs.readFileSync('app.json', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('"id": "contact_sensor_opened"')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
console.log('--- Search complete ---');
