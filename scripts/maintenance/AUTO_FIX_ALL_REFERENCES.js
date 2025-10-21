const fs = require('fs');
const path = require('path');

/**
 * CORRECTION AUTOMATIQUE ET INTELLIGENTE DE TOUTES LES RÉFÉRENCES
 * Détecte et corrige automatiquement toutes les références obsolètes
 */

console.log('🔧 AUTO-FIX INTELLIGENT - CORRECTION TOUTES RÉFÉRENCES');
console.log('═'.repeat(80));

class AutoFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
  }

  /**
   * Charge le mapping des renommages
   */
  loadRenameMapping() {
    const mappingPath = path.join(this.projectRoot, 'DRIVER_RENAME_MAPPING.json');
    
    if (fs.existsSync(mappingPath)) {
      return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    }
    
    return [];
  }

  /**
   * Corrige app.json
   */
  fixAppJson(mapping) {
    console.log('\n📝 Correction app.json...\n');
    
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    let fixed = 0;
    
    // Convertir le mapping en dictionnaire pour recherche rapide
    const renameDict = {};
    mapping.forEach(m => {
      renameDict[m.old] = m.new;
    });
    
    // Fonction récursive pour remplacer dans tout l'objet
    const replaceInObject = (obj) => {
      if (typeof obj === 'string') {
        // Vérifier si la string contient un ancien nom
        let newStr = obj;
        Object.entries(renameDict).forEach(([oldName, newName]) => {
          if (newStr.includes(oldName)) {
            newStr = newStr.replace(new RegExp(oldName, 'g'), newName);
            fixed++;
          }
        });
        return newStr;
      } else if (Array.isArray(obj)) {
        return obj.map(item => replaceInObject(item));
      } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        Object.entries(obj).forEach(([key, value]) => {
          newObj[key] = replaceInObject(value);
        });
        return newObj;
      }
      return obj;
    };
    
    appJson = replaceInObject(appJson);
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    
    console.log(`   ✅ ${fixed} références corrigées dans app.json`);
    
    return fixed;
  }

  /**
   * Vérifie la cohérence des chemins
   */
  verifyPaths() {
    console.log('\n🔍 Vérification cohérence des chemins...\n');
    
    const appJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'app.json'), 'utf8'));
    const errors = [];
    
    appJson.drivers.forEach(driver => {
      const driverPath = path.join(this.projectRoot, 'drivers', driver.id);
      
      // Vérifier que le dossier existe
      if (!fs.existsSync(driverPath)) {
        errors.push(`Driver folder missing: ${driver.id}`);
      } else {
        // Vérifier les assets si mentionnés
        const checkAsset = (assetPath) => {
          if (assetPath && assetPath.startsWith('./drivers/')) {
            const fullPath = path.join(this.projectRoot, assetPath.substring(2));
            if (!fs.existsSync(fullPath)) {
              errors.push(`Asset missing: ${assetPath}`);
            }
          }
        };
        
        if (driver.images) {
          checkAsset(driver.images.small);
          checkAsset(driver.images.large);
          checkAsset(driver.images.xlarge);
        }
      }
    });
    
    if (errors.length === 0) {
      console.log('   ✅ Tous les chemins sont cohérents');
    } else {
      console.log(`   ⚠️  ${errors.length} erreurs détectées:`);
      errors.forEach(err => console.log(`      - ${err}`));
    }
    
    return errors;
  }

  /**
   * Synchronise automatiquement les IDs
   */
  syncDriverIds() {
    console.log('\n🔄 Synchronisation automatique des IDs...\n');
    
    const appJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'app.json'), 'utf8'));
    const driversDir = path.join(this.projectRoot, 'drivers');
    
    // Obtenir la liste réelle des dossiers
    const actualDrivers = fs.readdirSync(driversDir).filter(item => {
      const fullPath = path.join(driversDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    // Vérifier que tous les drivers dans app.json existent
    const missingDrivers = appJson.drivers.filter(d => !actualDrivers.includes(d.id));
    
    if (missingDrivers.length > 0) {
      console.log(`   ⚠️  ${missingDrivers.length} drivers dans app.json n'existent pas:`);
      missingDrivers.forEach(d => console.log(`      - ${d.id}`));
      
      // Supprimer les drivers manquants
      appJson.drivers = appJson.drivers.filter(d => actualDrivers.includes(d.id));
      fs.writeFileSync(path.join(this.projectRoot, 'app.json'), JSON.stringify(appJson, null, 2));
      console.log(`   ✅ ${missingDrivers.length} drivers supprimés de app.json`);
    } else {
      console.log('   ✅ Tous les drivers sont synchronisés');
    }
    
    return missingDrivers.length;
  }

  /**
   * Exécute tous les fixes
   */
  fix() {
    const mapping = this.loadRenameMapping();
    
    if (mapping.length > 0) {
      this.fixAppJson(mapping);
    } else {
      console.log('\n   ℹ️  Aucun mapping de renommage trouvé');
    }
    
    const removed = this.syncDriverIds();
    const errors = this.verifyPaths();
    
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSUMÉ AUTO-FIX');
    console.log('═'.repeat(80));
    
    console.log(`\n✅ Références corrigées: ${this.fixes.length}`);
    console.log(`✅ Drivers supprimés: ${removed}`);
    console.log(`${errors.length === 0 ? '✅' : '⚠️'}  Erreurs de chemins: ${errors.length}`);
    
    console.log('\n✅ AUTO-FIX TERMINÉ !');
  }
}

// Exécution
const fixer = new AutoFixer();
fixer.fix();
