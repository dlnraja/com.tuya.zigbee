const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git') continue;
            processDir(fullPath);
        } else if (file.endsWith('.js')) {
            processJs(fullPath);
        }
    }
}

function processJs(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Fix 1: ]).catch(() => ({}); -> ]).catch(() => ({}));
        if (content.includes(']).catch(() => ({});')) {
            content = content.replace(/\]\)\.catch\(\(\) => \(\{\}\);/g, ']).catch(() => ({}));');
            changed = true;
        }

        // Fix 2: _getFlowCard('flowId') -> getTriggerCard(flowId)
        if (content.includes("_getFlowCard('flowId')")) {
            content = content.replace(/_getFlowCard\('flowId'\)/g, 'getTriggerCard(flowId)');
            changed = true;
        }

        // Fix 3: }) })(; -> } })();
        if (content.includes('}) })(;')) {
            content = content.replace(/\}\) \}\)\(;/g, '} })();');
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content);
            console.log(`Fixed hybrid syntax in: ${filePath}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
    }
}

console.log('Cleaning up common hybrid driver syntax errors...');
processDir('drivers');
console.log('Done.');
