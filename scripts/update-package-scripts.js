// update-package-scripts.js — ajoute les scripts d'automation dans package.json
'use strict';
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const newScripts = {
  'validate:dual-layer':        'node scripts/validation/app-json-dual-layer-validator.js',
  'validate:dual-layer:fix':    'node scripts/validation/app-json-dual-layer-validator.js --fix',
  'validate:dual-layer:strict': 'node scripts/validation/app-json-dual-layer-validator.js --strict --verbose',
  'master':                     'node scripts/master-automation.js',
  'master:fix':                 'node scripts/master-automation.js --fix',
  'master:full':                'node scripts/master-automation.js --fix --commit --push --verbose',
  'master:dry':                 'node scripts/master-automation.js --fix --dry-run --verbose',
  'check':                      'node scripts/master-automation.js --verbose',
  'prepush':                    'node scripts/master-automation.js && node scripts/automation/pre-push-dual-layer-gate.js'
};

Object.assign(pkg.scripts, newScripts);
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated:', Object.keys(newScripts).length, 'scripts added');
Object.keys(newScripts).forEach(k => console.log(' +', k));
