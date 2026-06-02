/**
 * Translate All Drivers
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function translateAll() {
    const driversDir = path.join(__dirname, '../../drivers');
    if (!fs.existsSync(driversDir)) return;
    
    const drivers = fs.readdirSync(driversDir);
    for (const d of drivers) {
        const composePath = path.join(driversDir, d, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                if (data.name && data.name.en && (!data.name.fr || !data.name.nl || !data.name.de)) {
                    console.log(`Needs translation: ${d}`);
                    try {
                        execSync(`node .github/scripts/i18n-translator.js "${composePath}"`, { stdio: 'inherit' });
                    } catch(e) { console.error('Translation step failed'); }
                }
            } catch (e) {}
        }
    }
}

translateAll();
