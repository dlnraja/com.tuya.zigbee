/**
 * Auto-Translator for Homey Drivers
 * Usage: node .github/scripts/i18n-translator.js [path/to/driver.compose.json]
 * Uses AI to populate missing fr, nl, de, es translations.
 */
const fs = require('fs');
const path = require('path');
const { callAI } = require('./ai-helper');

async function translateDriver(driverPath) {
    if (!fs.existsSync(driverPath)) return console.error('Path not found:', driverPath);
    console.log(`Translating: ${driverPath}`);
    const data = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    
    let needsUpdate = false;
    
    // Check main name
    if (data.name && typeof data.name === 'object' && data.name.en) {
        if (!data.name.fr || !data.name.nl || !data.name.de) {
            const prompt = `Translate this device name to French, Dutch, German, and Spanish. Respond strictly in JSON format {"fr": "...", "nl": "...", "de": "...", "es": "..."}. Device name: "${data.name.en}"`;
            console.log('Querying AI for translations...');
            const res = await callAI(prompt, "You are a professional JSON translator for smart home apps.");
            if (res && res.text) {
                try {
                    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const tr = JSON.parse(jsonMatch[0]);
                        data.name = { ...data.name, ...tr };
                        needsUpdate = true;
                    }
                } catch(e) { console.error('AI JSON parse failed'); }
            }
        }
    }
    
    // In the future: iterate through flow cards, etc.
    if (needsUpdate) {
        fs.writeFileSync(driverPath, JSON.stringify(data, null, 2));
        console.log('✅ Translations updated successfully!');
    } else {
        console.log('✅ Translations already complete or AI unavailable.');
    }
}

const target = process.argv[2];
if (target) {
    translateDriver(target).catch(e => {
        console.error('Translation error:', e.message);
        process.exit(1);
    });
} else {
    console.log('Please provide a driver path, e.g. drivers/my_sensor/driver.compose.json');
}
