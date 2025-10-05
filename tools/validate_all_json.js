"use strict";
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

function validateJSON(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message, line: e.lineNumber };
  }
}

console.log('🔍 Validating all JSON files...\n');

let totalFiles = 0;
let errors = 0;

// Check drivers
const drivers = fs.readdirSync(DRIVERS);
for(const d of drivers) {
  const file = path.join(DRIVERS, d, 'driver.compose.json');
  if(!fs.existsSync(file)) continue;
  
  totalFiles++;
  const result = validateJSON(file);
  if(!result.ok) {
    console.log(`❌ ${d}/driver.compose.json`);
    console.log(`   Error: ${result.error}\n`);
    errors++;
  }
}

// Check root files
const rootFiles = ['app.json', 'package.json', '.homeychangelog.json'];
for(const f of rootFiles) {
  const file = path.join(ROOT, f);
  if(!fs.existsSync(file)) continue;
  
  totalFiles++;
  const result = validateJSON(file);
  if(!result.ok) {
    console.log(`❌ ${f}`);
    console.log(`   Error: ${result.error}\n`);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files checked: ${totalFiles}`);
console.log(`   Errors found: ${errors}`);

if(errors === 0) {
  console.log('\n✅ All JSON files are valid!');
  process.exit(0);
} else {
  console.log('\n❌ JSON validation failed!');
  process.exit(1);
}
