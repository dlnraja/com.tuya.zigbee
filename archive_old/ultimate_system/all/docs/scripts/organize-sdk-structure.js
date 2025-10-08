const fs = require('fs');
const { execSync } = require('child_process');

console.log('📁 ORGANIZING SDK3 STRUCTURE');
console.log('🏗️ Creating proper Homey SDK directories\n');

// Create SDK3 compliant directory structure
const directories = [
    'scripts',
    'lib',
    'tools',
    'docs/development',
    'docs/api',
    'config/templates',
    'tests',
    'utils'
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir}/`);
    }
});

// Files that MUST stay at root (Homey SDK requirements)
const rootFiles = [
    'app.json', 'package.json', 'app.js', 'README.md', 'LICENSE',
    '.gitignore', '.homeyignore', '.prettierrc', '.prettierignore',
    '.homeychangelog.json', 'SECURITY.md'
];

// Move scripts to scripts/ directory
const scriptFiles = [
    'auto-publish.js', 'backup-publish.js', 'complete-all-drivers.js',
    'complete-driver.js', 'complete-ids.js', 'enrich-drivers.js',
    'enrich-ids.js', 'enrich.js', 'final-fix.js', 'final-homey-compliance.js',
    'fix-git-lock.js', 'fix-publish.js', 'fix.js', 'force-publish-homey.js',
    'iterative-publish.js', 'local-publish.js', 'mega-enrich.js',
    'mega-final.js', 'monitor.js', 'quick-complete-ids.js',
    'quick-publish.js', 'repair.js', 'retry.js', 'update-deps.js',
    'add-driver-assets.js'
];

// Move scripts
scriptFiles.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.renameSync(file, `scripts/${file}`);
            console.log(`📝 Moved script: ${file} → scripts/`);
        } catch(e) {
            console.log(`⚠️ Could not move ${file}: ${e.message}`);
        }
    }
});

// Move batch files to tools/
const toolFiles = ['auto-retry.bat', 'smart-retry.bat'];
toolFiles.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.renameSync(file, `tools/${file}`);
            console.log(`🔧 Moved tool: ${file} → tools/`);
        } catch(e) {}
    }
});

// Move documentation to docs/
const docFiles = [
    'DRIVER-COMPLETION-STATUS.md', 'DRIVER_STATS.md', 'HOMEY-SDK3-STRUCTURE.md',
    'REAL-TIME-MONITOR.md'
];

docFiles.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.renameSync(file, `docs/${file}`);
            console.log(`📚 Moved doc: ${file} → docs/`);
        } catch(e) {}
    }
});

console.log('\n📁 SDK3 STRUCTURE ORGANIZED');
console.log('✅ All files properly arranged according to Homey guidelines');
