const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers'];

const MANGLE_MAP = {
    'â °': '⏰',
    'âšï¸ ': '⚠️',
    'ðŸ”€': '🔄',
    'ðŸ”§': '🔧',
    'âœ¨': '✨',
    'ðŸ“‹': '📋',
    'ðŸ’¡': '💡',
    'ðŸ” ': '🔍',
    'âœ…': '✅',
    'â Œ': '❌',
    'ðŸ§ ': '🧠',
    'ðŸš€': '🚀',
    'ðŸ”¥': '🔥',
    'â˜€ï¸ ': '☀️',
    'ðŸ“±': '📲',
    'ðŸ“¡': '📡',
    'ðŸ†•': '🆕',
    'ðŸ“Š': '📊',
    'ðŸ§¹': '🧹'
};

function fixContent(content) {
    let modified = false;
    let newContent = content;

    // 1. Fix UTF-8 mangling
    for (const [mangled, fixed] of Object.entries(MANGLE_MAP)) {
        if (newContent.includes(mangled)) {
            const regex = new RegExp(mangled, 'g');
            newContent = newContent.replace(regex, fixed);
            modified = true;
        }
    }

    // 2. Fix logic mangling: (zclNode * 1) -> (zclNode, 1)
    // This happens in _requestSpecificDP calls
    const requestDPRegex = /(_requestSpecificDP\(\s*zclNode\s*)\*\s*(\d+|dp\w+)(\s*\))/g;
    if (requestDPRegex.test(newContent)) {
        newContent = newContent.replace(requestDPRegex, '$1, $2$3');
        modified = true;
    }

    // 3. Fix handlePresenceWithDebounce(inferredPresence * 0) -> (inferredPresence, 0)
    const debounceRegex = /(_handlePresenceWithDebounce\(\s*[^,)]+)\s*\*\s*(\d+)(\s*\))/g;
    if (debounceRegex.test(newContent)) {
        newContent = newContent.replace(debounceRegex, '$1, $2$3');
        modified = true;
    }

    // 4. Fix AdvancedAnalytics return Math.round(uptime*10))), 10);
    const analyticsRegex = /return Math\.round\(safeDivide\(uptime\*10\)\)\)\,\s*10\);/g;
    if (analyticsRegex.test(newContent)) {
        newContent = newContent.replace(analyticsRegex, 'return Math.round(uptime);');
        modified = true;
    }

    return modified ? newContent;
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            if (['node_modules', '.git'].includes(file)) continue;
            walk(full);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(full, 'utf8');
            const fixed = fixContent(content);
            if (fixed) {
                fs.writeFileSync(full, fixed, 'utf8');
                console.log(`[SANITY-FIX] ${path.relative(ROOT, full)}`);
            }
        }
    }
}

console.log('--- SANITY HEALER v1.0 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log('Sanity healing complete.');
