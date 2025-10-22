const fs = require('fs');
try {
  JSON.parse(fs.readFileSync('settings/drivers-database.json','utf8'));
  console.log('✅ Valid JSON');
} catch(e) {
  console.log('❌ Invalid JSON:', e.message);
}
