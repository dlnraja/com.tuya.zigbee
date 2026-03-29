const fs = require('fs');
const path = require('path');

const driversDir = './drivers';
let fixed = 0;
let totalReplacements = 0;

fs.readdirSync(driversDir).forEach(driver => {
  const file = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Fix ALL lowercase Tuya fingerprints - comprehensive list
    const replacements = [
      [/"_tz3000_/gi, '"_TZ3000_'],
      [/"_tz3200_/gi, '"_TZ3200_'],
      [/"_tz3210_/gi, '"_TZ3210_'],
      [/"_tz3218_/gi, '"_TZ3218_'],
      [/"_tz2000_/gi, '"_TZ2000_'],
      [/"_tze200_/gi, '"_TZE200_'],
      [/"_tze204_/gi, '"_TZE204_'],
      [/"_tze284_/gi, '"_TZE284_'],
      [/"_tze201_/gi, '"_TZE201_'],
      [/"_tz1800_/gi, '"_TZ1800_'],
      [/"_tzc000_/gi, '"_TZC000_'],
      [/"_tzc200_/gi, '"_TZC200_'],
    ];
    
    replacements.forEach(([pattern, replacement]) => {
      const matches = content.match(pattern);
      if (matches) {
        totalReplacements += matches.length;
        content = content.replace(pattern, replacement);
      }
    });
    
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Fixed:', driver);
      fixed++;
    }
  }
});

console.log(`\nTotal fixed: ${fixed} drivers`);
console.log(`Total replacements: ${totalReplacements}`);
