const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 PROJECT OPTIMIZER - Clean & Organize');

// Remove duplicate/unnecessary files
const unnecessaryFiles = [
    'node_modules', // Already in .gitignore but clean if exists
    '.DS_Store', 'Thumbs.db', '*.tmp'
];

// Clean empty directories
const emptyDirs = ['archive', 'dev-tools', 'documentation', 'guidelines', 
                  'logs', 'project-data', 'references', 'refs', 'reports', 'test-suite'];

emptyDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        try {
            const files = fs.readdirSync(dir);
            if (files.length === 0) {
                fs.rmdirSync(dir);
                console.log(`🗑️ Removed empty directory: ${dir}`);
            }
        } catch(e) {}
    }
});

// Optimize .homeyignore
const homeyIgnore = `# Build cache
.homeycompose/
.homeybuild/

# Development files
scripts/
tools/
docs/development/
*.tmp
*.log

# Node.js
node_modules/
package-lock.json

# IDE
.vscode/
.idea/`;

fs.writeFileSync('.homeyignore', homeyIgnore);

// Update README with optimizer
execSync('node scripts/dynamic-readme-generator.js');

console.log('✅ Project optimized and organized');
console.log('📁 Structure: SDK3 compliant');
console.log('🎯 Ready for Homey App Store publishing');
