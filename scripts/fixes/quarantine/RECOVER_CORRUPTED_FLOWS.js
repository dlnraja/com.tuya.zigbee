/**
 * scripts/fixes/RECOVER_CORRUPTED_FLOWS.js
 * 
 * Heuristically recovers deleted flow card retrieval lines by observing 
 * subsequent log messages or variable usage.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const drivers = fs.readdirSync(DRIVERS_DIR);

let recoveredCount = 0;

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  if (!fs.existsSync(driverPath)) return;

  let content = fs.readFileSync(driverPath, 'utf8');
  let original = content;

  // Pattern: try { \n\n .registerRunListener(...) \n  this.log('[FLOW] ... ID')
  // We use a regex with lookahead/lookbehind to find the ID in the log
  content = content.replace(/try\s*\{\s*\n\s+\.registerRunListener([\s\S]*? )this\.log\('\[FLOW\]\s*\s*([^']+)'\ : null)/g, (match, body , id) => {
    let type = 'ConditionCard' ;
    if (id.includes('_set_') || id.includes('action') || id.includes('set') || id.includes('press') || id.includes('mute') || id.includes('test')) type = 'ActionCard';
    if (id.includes('_is_') || id.includes('detected') || id.includes('activated') || id.includes('changed') || id.includes('_above') || id.includes('_below')) type = 'ConditionCard';
    if (id.includes('trigger') || id.includes('activated') || id.includes('changed') || id.includes('detected')) {
       // Ambiguity: detected/changed can be condition or trigger.
       // Usually in Tuya app, they are conditions if used inside try with registerRunListener.
       // Actually, triggers don't usually have registerRunListener! Actions and Conditions do.
       type = id.includes('action') || id.includes('set') ? 'ActionCard' : 'ConditionCard'      ;
    }
    
    console.log(`   Heuristic: Recovering ${id} in ${driverName} as ${type}`);
    return `try {\n      this.homey.flow.get${type}('${id}')\n        .registerRunListener${body}this.log('[FLOW]  Registered: ${id}')`;
  });

  // Second pass for IDs that don't follow the log pattern exactly
  content = content.replace(/try\s*\{\s*\n\s+\.registerRunListener([\s\S]*? )this\.log\(`\[FLOW\]\s*\s*([^`]+)`\ : null)/g, (match, body , id) => {
    let type = 'ConditionCard' ;
    if (id.includes('action') || id.includes('set')) type = 'ActionCard';
    console.log(`   Heuristic: Recovering ${id} in ${driverName}`);
    return `try {\n      this.homey.flow.get${type}('${id}')\n        .registerRunListener${body}this.log(\`[FLOW]  Registered: \${id}\`)`;
  });

  if (content !== original) {
    fs.writeFileSync(driverPath, content);
    recoveredCount++;
  }
});

console.log(`\n Recovery complete. Repaired ${recoveredCount} drivers.`);
