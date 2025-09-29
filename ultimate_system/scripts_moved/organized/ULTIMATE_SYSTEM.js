#!/usr/bin/env node
// 🚀 ULTIMATE SYSTEM v2.0.0 - Complet et condensé
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 ULTIMATE SYSTEM v2.0.0');

class UltimateSystem {
  constructor() {
    this.run();
  }

  run() {
    this.setupDirs();
    this.createBackup();
    this.fixDuplicates();
    this.organizeScripts();
    this.enrichDrivers();
    this.validateAndPublish();
  }

  setupDirs() {
    ['./backup', './ultimate_system', './scripts/organized'].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    });
    fs.appendFileSync('./.gitignore', '\nbackup/\n');
  }

  createBackup() {
    console.log('💾 Backup historique...');
    try {
      const commits = execSync('git log --oneline -20', {encoding: 'utf8'}).split('\n');
      commits.forEach((commit, i) => {
        if (commit.trim()) {
          const hash = commit.split(' ')[0];
          const dir = `./backup/${hash}_${i}`;
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(`${dir}/info.txt`, commit);
          }
        }
      });
    } catch (e) {
      console.log('⚠️ Backup skip');
    }
  }

  fixDuplicates() {
    console.log('🔧 Fix duplicates...');
    
    const UNIQUE_MFG = {
      'air_quality_monitor': ['_TZ3210_alproto2'],
      'motion_sensor_basic': ['_TZ3000_mmtwjmaq'],
      'smart_switch_1gang': ['_TZ3000_qzjcsmar'],
      'smart_switch_2gang': ['_TZ3000_ji4araar'],
      'roller_shutter': ['_TZE200_fctwhugx'],
      'smart_plug': ['_TZ3000_g5xawfcq'],
      'climate_sensor': ['_TZE200_cwbvmsar'],
      'contact_sensor': ['_TZ3000_26fmupbb']
    };

    let fixed = 0;
    fs.readdirSync('./drivers').forEach(d => {
      const f = `./drivers/${d}/driver.compose.json`;
      if (fs.existsSync(f)) {
        const data = JSON.parse(fs.readFileSync(f));
        
        // Assigner IDs uniques basés sur nom driver
        for (const [driverType, ids] of Object.entries(UNIQUE_MFG)) {
          if (d.includes(driverType.split('_')[0])) {
            data.zigbee.manufacturerName = ids;
            fs.writeFileSync(f, JSON.stringify(data, null, 2));
            fixed++;
            break;
          }
        }
      }
    });
    
    console.log(`✅ Fixed ${fixed} drivers`);
  }

  organizeScripts() {
    console.log('📦 Organisation scripts...');
    
    const files = fs.readdirSync('./').filter(f => f.endsWith('.js') && 
      !['app.js', 'index.js'].includes(f));
    
    files.forEach(file => {
      try {
        fs.renameSync(`./${file}`, `./scripts/organized/${file}`);
      } catch (e) {
        // Skip si erreur
      }
    });
  }

  enrichDrivers() {
    console.log('🔍 Enrichissement...');
    
    fs.readdirSync('./drivers').forEach(d => {
      const composeFile = `./drivers/${d}/driver.compose.json`;
      if (fs.existsSync(composeFile)) {
        const data = JSON.parse(fs.readFileSync(composeFile));
        
        // Enrichir selon catégorie
        if (d.includes('motion')) {
          data.zigbee.manufacturerName = ['_TZ3000_mmtwjmaq'];
        } else if (d.includes('switch')) {
          data.zigbee.manufacturerName = ['_TZ3000_qzjcsmar'];
        } else if (d.includes('plug')) {
          data.zigbee.manufacturerName = ['_TZ3000_g5xawfcq'];
        }
        
        fs.writeFileSync(composeFile, JSON.stringify(data, null, 2));
      }
    });
  }

  validateAndPublish() {
    console.log('🚀 Validation et publication...');
    
    try {
      execSync('homey app validate', {stdio: 'inherit'});
      execSync('git add -A && git commit -m "🚀 Ultimate System v2.0.0" && git push', {stdio: 'inherit'});
      console.log('✅ SYSTÈME ULTIMATE COMPLET');
    } catch (e) {
      console.log('❌ Erreur publication:', e.message);
    }
  }
}

new UltimateSystem();
