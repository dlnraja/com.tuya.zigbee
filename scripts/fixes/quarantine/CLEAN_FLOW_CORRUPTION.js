const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file === 'driver.js') {
      callback(filePath);
    }
  });
}

let fixedFiles = 0;

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Pattern 1: this.(() => { try { return homey.flow.get...
  // Should be: (() => { try { return this.homey.flow.get...
  content = content.replace(/this\.\(\(\) => { try { return homey\.flow/g, '(() => { try { return this.homey.flow');
  
  // Pattern 2: this.(() => { try { return this.homey.flow.get...
  // Should be: (() => { try { return this.homey.flow.get...
  content = content.replace(/this\.\(\(\) => { try { return this\.homey\.flow/g, '(() => { try { return this.homey.flow');

  // Pattern 3: some files might have (() => { try { return homey.flow... without 'this.'
  // but it still needs 'this.homey'
  content = content.replace(/\(\(\) => { try { return homey\.flow/g, '(() => { try { return this.homey.flow');

  // Pattern 4: Fix trailing parenthesis issues if any
  // Some had: this.(() => { try { return homey.flow.getConditionCard('din_rail_meter_reset_meter'); 
  // } catch(e) { return null; } })() 
  // This is actually okay-ish if the 'this.' is removed and 'homey.' becomes 'this.homey.'

  // Let's also fix the duplicate 'this.homey.flow' if it happened
  content = content.replace(/this\.this\.homey\.flow/g, 'this.homey.flow');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedFiles++;
    console.log(`[FIXED] ${filePath}`);
  }
});

console.log(`\nDone. Fixed ${fixedFiles} files.`);
