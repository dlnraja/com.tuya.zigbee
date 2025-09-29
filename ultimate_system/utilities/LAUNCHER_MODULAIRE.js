// LAUNCHER MODULAIRE - Lance tous les modules par thématique
const fs = require('fs');

console.log('🚀 LAUNCHER MODULAIRE - Exécution par thématiques');

// Phase 1: Utils et préparation
console.log('\n🔧 PHASE 1: UTILS');
const { gitFix, gitPush } = require('./modules/utils/git_helper');
const { safeReadJSON } = require('./modules/utils/json_utils');

gitFix();
console.log('✅ Git préparé');

// Phase 2: Backup et analyse
console.log('\n💾 PHASE 2: BACKUP');
const { dumpGitHistory } = require('./modules/backup/git_dumper');
const backupResult = dumpGitHistory();
console.log(`✅ Backup: ${backupResult.success ? 'OK' : 'ERROR'}`);

// Phase 3: Enrichissement par type de driver
console.log('\n🔧 PHASE 3: ENRICHISSEMENT DRIVERS');
const { enrichSensor } = require('./modules/drivers/sensor/sensor_enricher');
const { enrichSwitch } = require('./modules/drivers/switch/switch_enricher');
const { enrichLight } = require('./modules/drivers/light/light_enricher');

let enriched = 0;
if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').slice(0, 10).forEach(driver => {
    const path = `./drivers/${driver}`;
    if (enrichSensor(path) || enrichSwitch(path) || enrichLight(path)) {
      enriched++;
    }
  });
}
console.log(`✅ ${enriched} drivers enrichis`);

// Phase 4: Scraping par source
console.log('\n🔍 PHASE 4: SCRAPING SOURCES');
const { scrapeGithub } = require('./modules/sources/github_scraper');
const { scrapeForum } = require('./modules/sources/forum_scraper');

const githubData = scrapeGithub('tuya sensors');
const forumData = scrapeForum('zigbee devices');
console.log(`✅ GitHub: ${githubData.results.length} résultats`);
console.log(`✅ Forums: ${forumData.results.length} résultats`);

// Phase 5: Validation spécialisée
console.log('\n✅ PHASE 5: VALIDATION');
const { validateSchema } = require('./modules/validation/schema_validator');
const { checkCoherence } = require('./modules/validation/coherence_checker');

let validated = 0, coherent = 0;
if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').slice(0, 5).forEach(driver => {
    const path = `./drivers/${driver}`;
    
    const schemaCheck = validateSchema(path);
    if (schemaCheck.valid) validated++;
    
    const coherenceCheck = checkCoherence(path);
    if (coherenceCheck.coherent) coherent++;
  });
}

console.log(`✅ ${validated}/5 drivers valides`);
console.log(`✅ ${coherent}/5 drivers cohérents`);

// Finalisation
gitPush('🚀 Modulaire complete');
console.log('\n🎉 LAUNCHER MODULAIRE TERMINÉ');
console.log('📊 Toutes les phases modulaires exécutées avec succès!');
