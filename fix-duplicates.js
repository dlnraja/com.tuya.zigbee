const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔧 FIX DUPLICATES');

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let fixed = 0;

app.drivers.forEach(driver => {
    if (driver.capabilities) {
        const orig = driver.capabilities.length;
        driver.capabilities = [...new Set(driver.capabilities)];
        if (driver.capabilities.length < orig) {
            console.log(`✅ ${driver.id}: Fixed duplicates`);
            fixed++;
        }
    }
});

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`📊 Fixed ${fixed} drivers`);

// Commit
execSync('git add -A && git commit -m "🔧 FIX: Remove duplicate capabilities" && git push origin master');
console.log('✅ Committed');
