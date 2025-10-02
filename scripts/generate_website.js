const fs = require('fs');

console.log('🌐 GÉNÉRATION SITE WEB DOCUMENTATION');

const db = JSON.parse(fs.readFileSync('MANUFACTURERS_DATABASE.json'));
const classified = JSON.parse(fs.readFileSync('CLASSIFIED.json'));

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Ultimate Zigbee Hub - Manufacturers Database</title>
<style>body{font-family:Arial;margin:20px}h1{color:#2c3e50}.cat{margin:20px 0}
.mfr{display:inline-block;background:#ecf0f1;padding:5px;margin:2px;border-radius:3px;font-size:12px}</style>
</head><body>
<h1>🎭 Ultimate Zigbee Hub - Manufacturers Database</h1>
<p>Total: <strong>${db.total} manufacturers</strong> | <strong>${Object.keys(classified.categories).length} categories</strong></p>
${Object.entries(classified.categories).map(([cat, mfrs]) => `
<div class="cat"><h3>${cat.toUpperCase()} (${mfrs.length})</h3>
${mfrs.map(m => `<span class="mfr">${m}</span>`).join('')}</div>`).join('')}
</body></html>`;

fs.writeFileSync('MANUFACTURERS_DOCUMENTATION.html', html);
console.log('✅ Site web généré: MANUFACTURERS_DOCUMENTATION.html');
