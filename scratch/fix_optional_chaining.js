'use strict';

const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'lib', 'flow', 'AdvancedFlowCardManager.js');
console.log('Reading file:', targetFile);

let content = fs.readFileSync(targetFile, 'utf8');

// Regex to find: _safeGetCard(anything)? followed by newline and dot
// e.g. _safeGetCard('trigger','motion_alarm_lux')? \n      .
const regex = /_safeGetCard\(([^)]+)\)\?\r?\n\s*\./g;

const replaced = content.replace(regex, '_safeGetCard($1)?.');

fs.writeFileSync(targetFile, replaced, 'utf8');
console.log('Successfully repaired optional chaining inside AdvancedFlowCardManager.js!');
