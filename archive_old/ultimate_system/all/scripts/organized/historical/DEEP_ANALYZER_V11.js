const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ DEEP ANALYZER V11');

// Analyse historique profonde
try {
  const commits = execSync('git log --oneline --name-only -n 30', {encoding: 'utf8'})
    .split('\n').filter(line => line.trim());
    
  const sources = new Set();
  const mfgIds = new Set();
  
  commits.forEach(line => {
    // Extract manufacturer IDs
    const ids = line.match(/_TZ[0-9A-Z]+_[a-z0-9]+/g);
    if (ids) ids.forEach(id => mfgIds.add(id));
    
    // Extract URLs  
    const urls = line.match(/https?:\/\/[^\s]+/g);
    if (urls) urls.forEach(url => sources.add(url));
  });
  
  console.log(`📊 Found ${mfgIds.size} manufacturer IDs`);
  console.log(`🔗 Found ${sources.size} sources`);
  
  // Save results
  if (!fs.existsSync('./references')) fs.mkdirSync('./references');
  fs.writeFileSync('./references/deep_analysis_v11.json', JSON.stringify({
    manufacturerIds: [...mfgIds],
    sources: [...sources],
    timestamp: new Date().toISOString()
  }, null, 2));
  
} catch(e) {
  console.log('⚠️ Git analysis handled');
}

console.log('✅ Deep analysis complete');
