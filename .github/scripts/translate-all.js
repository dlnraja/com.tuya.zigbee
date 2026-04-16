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
    let count = 0;
    const MAX_PER_RUN = 10;

    for (const d of drivers) {
        if (count >= MAX_PER_RUN) {
            console.log(`Reached limit of ${MAX_PER_RUN} translations. Stopping.`);
            break;
        }

        const composePath = path.join(driversDir, d, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                if (data.name && data.name.en && (!data.name.fr || !data.name.nl || !data.name.de)) {
                    console.log(`Needs translation: ${d}`);
                    try {
                        execSync(`node .github/scripts/i18n-translator.js "${composePath}"`, { stdio: 'inherit' });
                        count++;
                    } catch(e) { console.error('Translation step failed'); }
                }
            } catch (e) {}
        }
    }
}

translateAll();
