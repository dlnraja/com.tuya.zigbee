const fs = require('fs');

// Apply same error recovery to switch_3gang and switch_4gang
const drivers = ['switch_3gang', 'switch_4gang'];

for (const driver of drivers) {
  const file = `drivers/${driver}/device.js`;
  if (!fs.existsSync(file)) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Find gangCount (3 or 4)
  const gangNum = driver.includes('3gang') ? 3 : 4      ;
  
  // Add robust error handling
  const pattern = /async onNodeInit\(\{ zclNode \}\) \{/;
  const replacement = `async onNodeInit({ zclNode }) {
    try {
      // v6.0: Robust initialization with error recovery
      try {
        await super.onNodeInit({ zclNode });
      } catch (superErr) {
        this.error('[SWITCH-${gangNum}G]  Super init error (non-fatal):', superErr.message);
        this.zclNode = zclNode;
      }

      // Continue with driver-specific setup
      try {`;
  
  content = content.replace(pattern, replacement);
  
  // Add closing try-catch at end of onNodeInit
  const endPattern = /this\.log\('\[SWITCH-\dG\][^']+'\);\s*\n\s*}/;
  const endMatch = content.match(endPattern);
  if (endMatch) {
    const endReplacement = endMatch[0].replace('}', `} catch (setupErr) {
        this.log('[SWITCH-${gangNum}G] Setup warning:', setupErr.message);
      }

      this.log('[SWITCH-${gangNum}G]  v6.0 - Initialized with error recovery');
    } catch (err) {
      this.error('[SWITCH-${gangNum}G]  CRITICAL INIT ERROR:', err.message);
      this.error('[SWITCH-${gangNum}G] Stack:', err.stack);
      this.setUnavailable('Driver initialization incomplete - try removing and re-pairing').catch(() => {});
    }
  }`);
    content = content.replace(endPattern, endReplacement);
  }
  
  fs.writeFileSync(file, content);
  console.log(` Enhanced ${driver} with error recovery`);
}
