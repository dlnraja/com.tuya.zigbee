// QUICK HOMEY GUIDELINES COMPLIANCE FIX
const fs = require('fs').promises;

async function fixGuidelines() {
  console.log('📋 FIXING HOMEY GUIDELINES...');
  
  // Fix app.json
  const appJson = JSON.parse(await fs.readFile('app.json', 'utf8'));
  
  // Ensure compliant name (max 4 words, no protocols)
  appJson.name = { en: 'Universal Hub' };
  appJson.description = { 
    en: 'Connect and control your smart devices effortlessly. Supports hundreds of device types with automatic discovery.' 
  };
  
  await fs.writeFile('app.json', JSON.stringify(appJson, null, 2), 'utf8');
  
  // Create README.txt (not .md)
  const readme = `Universal Hub brings effortless smart home control.

FEATURES:
• Automatic device discovery
• Supports hundreds of device types
• Simple setup and use
• Works with mixed-brand devices

Perfect for home automation enthusiasts!`;
  
  await fs.writeFile('README.txt', readme, 'utf8');
  
  console.log('✅ GUIDELINES FIXED');
}

if (require.main === module) {
  fixGuidelines().catch(console.error);
}
