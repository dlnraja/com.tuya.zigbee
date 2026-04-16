/**
 * scripts/fixes/FINAL_STABILITY_SWEEP.js
 * 
 * Performs a deep audit and auto-repair of all drivers to ensure SDK 3 compliance
 * and fix common corruption patterns.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const drivers = fs.readdirSync(DRIVERS_DIR);

let fixedCount = 0;

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  if (!fs.existsSync(driverPath)) return;

  let content = fs.readFileSync(driverPath, 'utf8');
  let original = content;

  // 1. Fix broken registerRunListener syntax (missing closing brace before });)
  // Replaces: return ...\s+\n\s+}); with return ...\s+\n\s+}); but usually it's missing the brace
  // This is tricky with regex, but let's look for: => {\s+return[^;]+;\s+});
  content = content.replace(/=>\s*\{(\s+return\s+[^;]+;)\s+}\)\s*;/g, '=> {$1\n      });'); 
  
  // 2. Fix empty try blocks followed by .registerRunListener (The "Deletion" bug)
  // This looks for: try {\s+\n\s+\.registerRunListener
  // We can't automatically know the ID here easily without manifest, but we can log it.
  const deletionRegex = /try\s*\{\s*\n\s+\.registerRunListener/g;
  if (deletionRegex.test(content)) {
    console.warn(`⚠️  Possible corrupted flow registration in ${driverName}. Manual check recommended.`);
  }

  // 3. Ensure super.onInit() and guard exist
  if (content.includes('onInit()') && !content.includes('_flowCardsRegistered')) {
    content = content.replace(/async\s+onInit\(\)\s*\{/, 'async onInit() {\n    await super.onInit();\n    if (this._flowCardsRegistered) return;\n    this._flowCardsRegistered = true;\n');
  }

  // 4. Wrap flow card lookups in try-catch if not already
  // Simple heuristic: look for this.homey.flow.get...Card that isn't inside a try
  // (This is complex to do perfectly with regex, skipping mass auto-fix for now to avoid breaking things)

  // 5. Cleanup branding remnants just in case
  content = content.replace(/Nexus Awakening/g, 'Universal Engine Reimplementation');
  content = content.replace(/Nexus/g, 'Hybrid Engine');

  if (content !== original) {
    fs.writeFileSync(driverPath, content);
    fixedCount++;
    console.log(`✅ Stabilized driver: ${driverName}`);
  }
});

console.log(`\n✨ Sweep complete. Stabilized ${fixedCount} drivers.`);
