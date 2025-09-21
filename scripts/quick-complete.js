const fs = require('fs');

console.log('🚀 COMPLETION RAPIDE');

// Images
fs.readdirSync('drivers').forEach(d => {
    const a = `drivers/${d}/assets`;
    if (!fs.existsSync(a)) fs.mkdirSync(a, {recursive: true});
    ['small.svg','large.svg','xlarge.svg'].forEach(s => {
        if (!fs.existsSync(`${a}/${s}`)) {
            const svg = `<svg viewBox="0 0 100 100"><rect fill="#4CAF50" width="100" height="100" rx="15"/><circle fill="white" cx="50" cy="50" r="20"/></svg>`;
            fs.writeFileSync(`${a}/${s}`, svg);
        }
    });
});

console.log('✅ TERMINÉ');
