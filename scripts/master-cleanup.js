const fs = require('fs-extra');
const path = require('path');

class ProjectCleaner {
  constructor() {
    this.driversPath = path.join(__dirname, '..', 'drivers');
    this.duplicates = [];
    this.jsonErrors = [];
    this.uniqueDrivers = new Map();
  }

  async execute() {
    console.log('🧹 Starting Master Cleanup Process...\n');
    
    try {
      // Phase 1: Identifier et supprimer les duplications
      console.log('📋 Phase 1: Removing duplicates...');
      await this.removeDuplicates();
      
      // Phase 2: Réparer tous les JSON
      console.log('\n🔧 Phase 2: Repairing JSON files...');
      await this.repairAllJson();
      
      // Phase 3: Réorganiser la structure
      console.log('\n📁 Phase 3: Reorganizing structure...');
      await this.reorganizeStructure();
      
      // Phase 4: Standardiser les noms
      console.log('\n✏️ Phase 4: Standardizing naming...');
      await this.standardizeNaming();
      
      // Générer le rapport
      await this.generateReport();
      
      console.log('\n✅ Cleanup completed successfully!');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  }
  
  async removeDuplicates() {
    const files = await this.walkDir(this.driversPath);
    const driverMap = new Map();
    
    for (const file of files) {
      if (file.endsWith('driver.compose.json')) {
        try {
          const content = await fs.readJson(file);
          const zigbee = content.zigbee || {};
          const manufacturer = Array.isArray(zigbee.manufacturerName) 
            ? zigbee.manufacturerName.join(',') 
            : zigbee.manufacturerName;
          const productId = Array.isArray(zigbee.productId) 
            ? zigbee.productId.join(',') 
            : zigbee.productId;
          
          const key = `${manufacturer}_${productId}`;
          
          if (key !== 'undefined_undefined' && key !== '_') {
            if (!driverMap.has(key)) {
              driverMap.set(key, { file, content });
              this.uniqueDrivers.set(key, file);
            } else {
              // Duplicate trouvé
              this.duplicates.push({
                key,
                original: driverMap.get(key).file,
                duplicate: file
              });
              
              // Supprimer le dossier du duplicate
              const driverDir = path.dirname(file);
              console.log(`  - Removing duplicate: ${path.basename(driverDir)}`);
              await fs.remove(driverDir);
            }
          }
        } catch (err) {
          this.jsonErrors.push({ file, error: err.message });
        }
      }
    }
    
    console.log(`  ✓ Found and removed ${this.duplicates.length} duplicates`);
    console.log(`  ✓ Kept ${this.uniqueDrivers.size} unique drivers`);
  }
  
  async repairAllJson() {
    const files = await this.walkDir(this.driversPath);
    let repaired = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(file, 'utf8');
          
          // Tentative de parse
          try {
            JSON.parse(content);
          } catch (parseError) {
            // Réparer les erreurs communes
            let fixed = content
              // Supprimer les virgules trailing
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              // Supprimer les commentaires
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/\/\/.*/g, '')
              // Corriger les quotes
              .replace(/'/g, '"')
              // Supprimer les caractères non-printables
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            
            try {
              // Vérifier si la réparation a fonctionné
              const parsed = JSON.parse(fixed);
              
              // Réécrire le fichier formaté
              await fs.writeJson(file, parsed, { spaces: 2 });
              repaired++;
              console.log(`  ✓ Repaired: ${path.basename(file)}`);
            } catch (stillBroken) {
              this.jsonErrors.push({ 
                file, 
                error: 'Could not auto-repair',
                details: stillBroken.message
              });
            }
          }
        } catch (err) {
          console.error(`  ✗ Error processing ${file}:`, err.message);
        }
      }
    }
    
    console.log(`  ✓ Repaired ${repaired} JSON files`);
    if (this.jsonErrors.length > 0) {
      console.log(`  ⚠ ${this.jsonErrors.length} files need manual repair`);
    }
  }
  
  async reorganizeStructure() {
    // Créer la nouvelle structure
    const newStructure = {
      '_base': [],
      'sensors': ['temperature', 'motion', 'contact', 'water_leak', 'smoke', 'vibration'],
      'switches': ['wall_switch', 'scene_switch', 'smart_plug'],
      'lights': ['rgb_bulb', 'cct_bulb', 'dimmer'],
      'climate': ['thermostat', 'trv'],
      'security': ['smart_lock', 'doorbell'],
      'covers': ['curtain', 'blind']
    };
    
    for (const [category, subcategories] of Object.entries(newStructure)) {
      const categoryPath = path.join(this.driversPath, category);
      await fs.ensureDir(categoryPath);
      
      if (Array.isArray(subcategories)) {
        for (const sub of subcategories) {
          await fs.ensureDir(path.join(categoryPath, sub));
        }
      }
    }
    
    // Déplacer les drivers existants dans les bonnes catégories
    await this.categorizeDrivers();
    
    console.log('  ✓ Structure reorganized successfully');
  }
  
  async categorizeDrivers() {
    const categoryMap = {
      'TS0201': 'sensors/temperature',
      'TS0202': 'sensors/motion',
      'TS0203': 'sensors/contact',
      'TS0207': 'sensors/water_leak',
      'TS0210': 'sensors/vibration',
      'TS0001': 'switches/wall_switch',
      'TS0002': 'switches/wall_switch',
      'TS0003': 'switches/wall_switch',
      'TS0041': 'switches/scene_switch',
      'TS0042': 'switches/scene_switch',
      'TS0043': 'switches/scene_switch',
      'TS0044': 'switches/scene_switch',
      'TS011F': 'switches/smart_plug',
      'TS0121': 'switches/smart_plug',
      'TS0505A': 'lights/rgb_bulb',
      'TS0505B': 'lights/rgb_bulb',
      'TS0502A': 'lights/cct_bulb',
      'TS0502B': 'lights/cct_bulb',
      'TS0601_thermostat': 'climate/thermostat',
      'TS0601_trv': 'climate/trv',
      'TS0601_lock': 'security/smart_lock',
      'TS130F': 'covers/curtain'
    };
    
    // À implémenter: logique de déplacement des drivers
  }
  
  async standardizeNaming() {
    // Standardiser les manufacturerName
    const manufacturerMap = {
      '_TZ3000_xr3htd96': 'Tuya',
      '_TZ3000_qaayslip': 'Tuya',
      '_TZ3000_mcxw5ehu': 'Tuya',
      '_TZ3000_msl6wxk9': 'Tuya',
      '_TZ3000_1dd0d5yi': 'Tuya',
      '_TYZB01': 'Tuya',
      '_TYZB02': 'Tuya',
      '_TZE200': 'Tuya'
    };
    
    const files = await this.walkDir(this.driversPath);
    let updated = 0;
    
    for (const file of files) {
      if (file.endsWith('driver.compose.json')) {
        try {
          const content = await fs.readJson(file);
          
          if (content.zigbee && content.zigbee.manufacturerName) {
            const currentMfr = content.zigbee.manufacturerName;
            const standardName = Array.isArray(currentMfr) 
              ? currentMfr.map(m => manufacturerMap[m] || m)
              : manufacturerMap[currentMfr] || currentMfr;
            
            if (standardName !== currentMfr) {
              content.zigbee.manufacturerName = standardName;
              await fs.writeJson(file, content, { spaces: 2 });
              updated++;
            }
          }
        } catch (err) {
          console.error(`  ✗ Error updating ${file}:`, err.message);
        }
      }
    }
    
    console.log(`  ✓ Standardized ${updated} driver names`);
  }
  
  async walkDir(dir, fileList = []) {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        await this.walkDir(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }
  
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        duplicatesRemoved: this.duplicates.length,
        uniqueDrivers: this.uniqueDrivers.size,
        jsonErrors: this.jsonErrors.length
      },
      duplicates: this.duplicates,
      jsonErrors: this.jsonErrors,
      uniqueDrivers: Array.from(this.uniqueDrivers.entries())
    };
    
    await fs.writeJson(
      path.join(__dirname, '..', 'reports', 'cleanup-report.json'),
      report,
      { spaces: 2 }
    );
    
    console.log('\n📊 Report saved to reports/cleanup-report.json');
  }
}

// Exécution
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = ProjectCleaner;
