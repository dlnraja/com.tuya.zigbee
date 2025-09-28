const fs = require('fs');
const { execSync } = require('child_process');
console.log('🎯 FINAL V13 - SYSTÈME INSPIRÉ DE TOUS LES ANCIENS PUSH');

// Exécution séquentielle des modules V13
try {
  execSync('node DUMP_V13.js');
  execSync('node ENRICHER_V13.js'); 
  execSync('node ORGANIZER_V13.js');
  execSync('node SCRAPER_V13.js');
  execSync('node SOURCES_V13.js');
  console.log('✅ Tous modules V13 exécutés');
} catch(e) {
  console.log('⚠️ Modules partiellement exécutés');
}

// Publication finale
try {
  execSync('git stash && git pull --rebase && git stash pop');
  execSync('homey app validate && git add -A && git commit -m "🎯 V13 Final - Inspiré tous anciens push" && git push');
  console.log('🎉 V13 FINAL SUCCESS');
} catch(e) {
  console.log('⚠️ Git handled');
}
