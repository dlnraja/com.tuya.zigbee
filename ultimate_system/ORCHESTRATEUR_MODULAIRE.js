// ORCHESTRATEUR MODULAIRE - Utilise tous les petits modules
const fs = require('fs');

console.log('🎯 ORCHESTRATEUR MODULAIRE');

// Import modules
const { enrichZigbee } = require('./modules/zigbee/enricher');
const { enrichSensor } = require('./modules/drivers/sensor/sensor_enricher');
const { enrichSwitch } = require('./modules/drivers/switch/switch_enricher');
const { enrichLight } = require('./modules/drivers/light/light_enricher');
const { gitFix, gitPush } = require('./modules/utils/git_helper');
const { scrapeGithub } = require('./modules/sources/github_scraper');
const { scrapeForum } = require('./modules/sources/forum_scraper');

let processed = 0, enriched = 0;

// Traitement modulaire
if (fs.existsSync('./drivers')) {
  const drivers = fs.readdirSync('./drivers').slice(0, 20);
  
  drivers.forEach(driver => {
    const path = `./drivers/${driver}`;
    processed++;
    
    // Enrichissement par type
    if (enrichSensor(path) || enrichSwitch(path) || enrichLight(path) || enrichZigbee(path)) {
      enriched++;
    }
  });
}

// Scraping modulaire
const githubData = scrapeGithub('tuya zigbee');
const forumData = scrapeForum('homey tuya');

console.log(`✅ ${processed} drivers traités`);
console.log(`🔧 ${enriched} drivers enrichis`);
console.log(`🔍 ${githubData.results.length} résultats GitHub`);
console.log(`📋 ${forumData.results.length} résultats forums`);

// Git modulaire
gitFix();
gitPush('🎯 Modulaire update');

console.log('🎉 ORCHESTRATION MODULAIRE TERMINÉE');
