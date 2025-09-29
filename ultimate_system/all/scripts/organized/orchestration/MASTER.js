const { execSync } = require('child_process');

console.log('🚀 MASTER v5.0.0');

// Execute all phases
execSync('node BACKUP_SYSTEM.js', {stdio: 'inherit'});
execSync('node RESOLVE_DUPLICATES.js', {stdio: 'inherit'});
execSync('node WEB_SCRAPER_V5.js', {stdio: 'inherit'});
execSync('node ORGANIZE_SCRIPTS_V5.js', {stdio: 'inherit'});

console.log('🎉 MASTER COMPLETE');
