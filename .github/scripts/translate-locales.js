const fs = require('fs');
const path = require('path');
const { callAI } = require('./ai-helper');

const localesDir = path.join(__dirname, '../../locales');
const TARGET_LANGS = ['fr', 'nl', 'de', 'es', 'it'];

async function translateLocales() {
    if (!fs.existsSync(localesDir)) return console.log('No locales dir found.');
    
    const enPath = path.join(localesDir, 'en.json');
    if (!fs.existsSync(enPath)) return console.log('No en.json found.');
    
    let enData = {};
    try { enData = JSON.parse(fs.readFileSync(enPath, 'utf8')); } catch(e) { return console.log('Error parsing en.json'); }
    
    const enKeys = Object.keys(enData);
    if (!enKeys.length) return console.log('en.json is empty.');

    for (const lang of TARGET_LANGS) {
        const langPath = path.join(localesDir, `${lang}.json`);
        let langData = {};
        if (fs.existsSync(langPath)) {
            try { langData = JSON.parse(fs.readFileSync(langPath, 'utf8')); } catch(e) {}
        }

        const missingKeys = enKeys.filter(k => typeof langData[k] === 'undefined');
        if (!missingKeys.length) {
            console.log(`✅ [${lang}] All locales are up to date.`);
            continue;
        }

        console.log(`🔄 [${lang}] Fetching translation for ${missingKeys.length} new keys...`);
        
        // Chunk translation requests to avoid token limits
        const chunkSize = 20;
        for (let i = 0; i < missingKeys.length; i += chunkSize) {
            const chunk = missingKeys.slice(i, i + chunkSize);
            const mapping = {};
            chunk.forEach(k => mapping[k] = enData[k]);

            const prompt = `Translate the values of this JSON object from English to ${lang.toUpperCase()}. Retain the exact same keys. Output ONLY valid JSON, nothing else.\n\n${JSON.stringify(mapping, null, 2)}`;
            const res = await callAI(prompt, "You are a professional JSON translation bot.", { maxTokens: 1500, complexity: 'low' });

            if (res && res.text) {
                try {
                    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const tr = JSON.parse(jsonMatch[0]);
                        for (const k of Object.keys(tr)) langData[k] = tr[k];
                    }
                } catch(e) {
                    console.log(`❌ AI JSON parse failed for ${lang} chunk.`);
                }
            }
        }
        
        fs.writeFileSync(langPath, JSON.stringify(langData, null, 2));
        console.log(`✅ [${lang}] File saved.`);
    }
}

translateLocales().catch(e => console.error(e));
