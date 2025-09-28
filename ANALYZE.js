const fs = require('fs');

console.log('📊 ANALYZE ALL');

let errors = 0, success = 0;

// Scan references
if (fs.existsSync('./references')) {
  fs.readdirSync('./references').forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(`./references/${file}`, 'utf8'));
        if (data.error) errors++; else success++;
      } catch(e) { errors++; }
    }
  });
}

console.log(`✅ Success: ${success}, ❌ Errors: ${errors}`);
console.log('📋 Analysis done');
