const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const GLOBAL_FLOW_DIR = path.join(ROOT_DIR, '.homeycompose', 'flow');

function injectArgsIntoTitleFormatted(card) {
    if (!card.title) return;
    
    // Create a clone of title for titleFormatted if missing
    if (!card.titleFormatted) {
        card.titleFormatted = JSON.parse(JSON.stringify(card.title));
    }
    
    // Remove [[device]] as it's not allowed in SDK v3 titleFormatted
    for (const lang of Object.keys(card.titleFormatted)) {
        card.titleFormatted[lang] = card.titleFormatted[lang].replace(/\[\[device\]\]\s*/i, '').replace(/\s*\[\[device\]\]/i, '').trim();
        card.titleFormatted[lang] = card.titleFormatted[lang].charAt(0).toUpperCase() + card.titleFormatted[lang].slice(1);
    }

    // Ensure all args are present in titleFormatted
    if (card.args && Array.isArray(card.args)) {
        for (const arg of card.args) {
            if (!arg.name) continue;
            const argToken = `[[${arg.name}]]`;
            
            for (const lang of Object.keys(card.titleFormatted)) {
                if (!card.titleFormatted[lang].includes(argToken)) {
                    card.titleFormatted[lang] = `${card.titleFormatted[lang]} ${argToken}`;
                }
            }
        }
    }
}

function processJSONFile(filePath) {
    if (!fs.existsSync(filePath)) return { modified: false, count: 0 };
    
    try {
        const flowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;
        let count = 0;

        // Handling structure where file is an array of cards (e.g. .homeycompose/flow/triggers/*.json)
        if (Array.isArray(flowData)) {
            for (const card of flowData) {
                if (card.title && (!card.titleFormatted || (card.args && card.args.some(a => !card.titleFormatted.en.includes(`[[${a.name}]]`))))) {
                    injectArgsIntoTitleFormatted(card);
                    modified = true;
                    count++;
                }
            }
        } 
        // Handling structure where file is a single card object (e.g. .homeycompose/flow/triggers/button_double_press.json)
        else if (flowData.id && flowData.title) {
            if (!flowData.titleFormatted || (flowData.args && flowData.args.some(a => !flowData.titleFormatted.en.includes(`[[${a.name}]]`)))) {
                injectArgsIntoTitleFormatted(flowData);
                modified = true;
                count++;
            }
        }
        // Handling structure where file is an object with sections (e.g. driver.flow.compose.json)
        else {
            const sections = ['triggers', 'conditions', 'actions'];
            for (const section of sections) {
                if (!flowData[section] || !Array.isArray(flowData[section])) continue;
                
                for (const card of flowData[section]) {
                    if (card.title && (!card.titleFormatted || (card.args && card.args.some(a => !card.titleFormatted.en.includes(`[[${a.name}]]`))))) {
                        injectArgsIntoTitleFormatted(card);
                        modified = true;
                        count++;
                    }
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2) + '\n', 'utf8');
        }
        
        return { modified, count };
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
        return { modified: false, count: 0 };
    }
}

function main() {
    console.log('--- Starting Missing Flow titleFormatted Auto-Fix ---');

    let fixedCards = 0;
    let fixedFiles = 0;

    // 1. Process driver specific flows
    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    for (const d of driverDirs) {
        const flowComposePath = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');
        const res = processJSONFile(flowComposePath);
        if (res.modified) {
            fixedFiles++;
            fixedCards += res.count;
            console.log(`[FIXED] Updated driver flow: ${d}`);
        }
    }

    // 2. Process global flows
    if (fs.existsSync(GLOBAL_FLOW_DIR)) {
        const sections = ['triggers', 'conditions', 'actions'];
        for (const section of sections) {
            const sectionDir = path.join(GLOBAL_FLOW_DIR, section);
            if (!fs.existsSync(sectionDir)) continue;
            
            const files = fs.readdirSync(sectionDir);
            for (const f of files) {
                if (!f.endsWith('.json')) continue;
                const filePath = path.join(sectionDir, f);
                const res = processJSONFile(filePath);
                if (res.modified) {
                    fixedFiles++;
                    fixedCards += res.count;
                    console.log(`[FIXED] Updated global flow: ${section}/${f}`);
                }
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Fixed Files: ${fixedFiles}`);
    console.log(`Fixed Cards: ${fixedCards}`);
}

main();
