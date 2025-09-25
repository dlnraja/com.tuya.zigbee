const fs = require('fs');

console.log('📦 OPTIMIZING FOR HOMEY APP STORE');
console.log('🗑️ Excluding ALL non-essential files from app package\n');

// Ultra-comprehensive .homeyignore for clean app
const homeyIgnoreContent = `# Build cache
.homeycompose/
.homeybuild/

# Development files - EXCLUDE ALL
scripts/
tools/
docs/
tests/
utils/
lib/
config/

# Development documentation
*.md
README.md
SECURITY.md
CHANGELOG.md
CONTRIBUTING.md
LICENSE

# Git files
.git/
.gitignore
.gitattributes

# Node.js development
node_modules/
package-lock.json
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE and editor files
.vscode/
.idea/
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# Temporary files
*.tmp
*.temp
*.log
*.cache

# User response and diagnostic files
user-response-*.md
diagnostic-*.md

# Archive and backup files
archive/
backup/
temp/
*.bak
*.backup

# Development scripts and tools
*.bat
*.ps1
*.sh

# Environment files
.env*
config.json
secrets.json

# Test files
test/
tests/
spec/
*.test.js
*.spec.js

# Source maps and debug
*.map
*.debug

# Documentation assets
assets/docs/
assets/screenshots/
assets/dev/`;

fs.writeFileSync('.homeyignore', homeyIgnoreContent);

// Also check app.json for any development references
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Clean up app.json - remove any development metadata
if (app.devDependencies) {
    delete app.devDependencies;
}

// Ensure version is clean
app.version = '4.0.3'; // Clean release version

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ .homeyignore updated - MAXIMUM exclusions');
console.log('✅ app.json cleaned of development metadata');
console.log(`📦 Version: ${app.version} - Clean release`);
console.log('\n🎯 HOMEY APP WILL CONTAIN ONLY:');
console.log('  - app.json (configuration)');
console.log('  - app.js (main app file)');
console.log('  - package.json (dependencies)');
console.log('  - drivers/ (159 device drivers)');
console.log('  - assets/ (required images)');
console.log('  - settings/ (configuration UI)');
console.log('  - locales/ (translations)');
console.log('\n🚫 EXCLUDED FROM APP:');
console.log('  - ALL scripts/ (development tools)');
console.log('  - ALL docs/ (documentation)');
console.log('  - ALL tests/ (testing files)');
console.log('  - ALL *.md files (documentation)');
console.log('  - ALL development files');
console.log('\n📦 Result: MINIMAL, CLEAN APP PACKAGE');
