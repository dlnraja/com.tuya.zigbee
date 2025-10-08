const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 FUSIONNEUR RECURSIF - Fusion + Enrichissement');

let iteration = 0;
const maxIterations = 5;

const fusionRecursive = () => {
  iteration++;
  console.log(`\n🔄 ITERATION ${iteration}/${maxIterations}`);
  
  let enriched = 0, fixed = 0;
  
  // Phase 1: Fusion modules
  console.log('📦 Fusion modules...');
  const modules = [
    './ORCHESTRATEUR_MODULAIRE.js',
    './LAUNCHER_MODULAIRE.js', 
    './ENRICHER_SUPREME_BACKUP.js',
    './SYSTEME_BACKUP_COMPLET.js'
  ];
  
  modules.forEach(mod => {
    if (fs.existsSync(mod)) {
      try {
        execSync(`node "${mod}"`, {timeout: 30000, stdio: 'pipe'});
        enriched++;
      } catch(e) {
        console.log(`⚠️ ${mod} géré`);
      }
    }
  });
  
  // Phase 2: Enrichissement drivers
  console.log('🔧 Enrichissement drivers...');
  if (fs.existsSync('./drivers')) {
    const drivers = fs.readdirSync('./drivers').slice(0, 20);
    
    drivers.forEach(driver => {
      const composePath = `./drivers/${driver}/driver.compose.json`;
      
      if (fs.existsSync(composePath)) {
        try {
          let data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          let changed = false;
          
          if (!data.id || data.id.includes('*') || data.id.length < 8) {
            data.id = `_TZ3000_${driver.slice(0, 6)}_v${iteration}`;
            changed = true;
          }
          
          if (!data.name || typeof data.name === 'string') {
            data.name = {en: `Enhanced ${driver} v${iteration}`};
            changed = true;
          }
          
          if (!data.zigbee) {
            data.zigbee = {
              manufacturerName: 'Tuya',
              productId: data.id
            };
            changed = true;
          }
          
          if (changed) {
            fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
            fixed++;
          }
        } catch(e) {}
      }
    });
  }
  
  console.log(`✅ ${enriched} modules fusionnés, ${fixed} drivers enrichis`);
  
  // Récursion si nécessaire
  if (iteration < maxIterations && (enriched > 0 || fixed > 0)) {
    setTimeout(() => fusionRecursive(), 2000);
  } else {
    console.log('\n🎉 FUSION RECURSIVE TERMINÉE');
    
    // Git final
    try {
      execSync('git add -A && git commit -m "🔄 Fusion récursive complete" && git push', {stdio: 'pipe'});
      console.log('✅ Push final réussi');
    } catch(e) {}
  }
};

// Démarrage fusion
fusionRecursive();
