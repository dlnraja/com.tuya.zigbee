// TEST MODULES - Test tous les petits modules
const fs = require('fs');

console.log('🧪 TEST MODULES');

const modules = [
  './modules/zigbee/enricher',
  './modules/utils/git_helper', 
  './modules/utils/json_utils',
  './modules/sources/github_scraper',
  './modules/validation/schema_validator'
];

let working = 0, total = modules.length;

modules.forEach(mod => {
  try {
    const module = require(mod);
    console.log(`✅ ${mod} - OK`);
    working++;
  } catch(e) {
    console.log(`❌ ${mod} - ERROR: ${e.message}`);
  }
});

console.log(`\n📊 ${working}/${total} modules fonctionnent`);

// Test avec un driver réel
if (fs.existsSync('./drivers')) {
  const testDriver = fs.readdirSync('./drivers')[0];
  if (testDriver) {
    const { validateSchema } = require('./modules/validation/schema_validator');
    const result = validateSchema(`./drivers/${testDriver}`);
    console.log(`🧪 Test validation: ${result.valid ? 'VALID' : 'INVALID'}`);
  }
}

console.log('🎯 TESTS TERMINÉS');
