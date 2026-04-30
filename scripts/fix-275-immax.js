'use strict';
const fs = require('fs');
const path = require('path');

const fpPath = path.join(__dirname, '..', 'data', 'fingerprints.json');
const raw = fs.readFileSync(fpPath, 'utf8');

// Replace the specific fingerprint entry
const oldPattern = '"_TZE200_xlppj4f5|TS0601": {\n    "driver": "device_radiator_valve",\n    "profile": "valve",\n    "description": "Immax NEO Smart Water Timer"\n  }';
const newEntry = '"_TZE200_xlppj4f5|TS0601": {\n    "driver": "valve_irrigation",\n    "profile": "valve",\n    "description": "Immax NEO Smart Water Timer"\n  }';

if (raw.includes(oldPattern)) {
  const updated = raw.replace(oldPattern, newEntry);
  fs.writeFileSync(fpPath, updated, 'utf8');
  console.log('✅ Fixed _TZE200_xlppj4f5 mapping: device_radiator_valve → valve_irrigation');
} else {
  console.log('❌ Pattern not found - checking current state...');
  const idx = raw.indexOf('_TZE200_xlppj4f5');
  if (idx > -1) {
    console.log('Context:', raw.substring(idx - 2, idx + 120));
  } else {
    console.log('Fingerprint not found at all');
  }
}