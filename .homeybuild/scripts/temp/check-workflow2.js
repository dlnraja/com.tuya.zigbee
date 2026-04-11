const fs = require('fs');
const file = '.github/workflows/tuya-automation-hub.yml';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('GOOGLE_API_KEY')) {
  console.log('No GOOGLE_API_KEY in tuya-automation-hub.yml, trying to add...');
} else {
  console.log('GOOGLE_API_KEY already in tuya-automation-hub.yml');
}
