#!/usr/bin/env node

/**
 * FIX DRIVER NOMENCLATURE - STRICT COMPLIANCE
 * 
 * Règles strictes nomenclature :
 * - Format: type_technology_power ou type_xgang_power ou type_level_power
 * - Niveaux: advanced, pro, multi (si applicable)
 * - Alimentation: ac, battery, cr2032, cr2450, hybrid, dc
 * - Gangs: 1gang, 2gang, 3gang, etc. (pour switches/dimmers)
 * - PAS de parenthèses, PAS de caractères spéciaux
 * - ANGLAIS uniquement
 * 
 * @version 2.1.45
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class DriverNomenclatureFixer {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.renames = [];
    this.updates = [];
    
    // Corrections à appliquer
    this.corrections = {
      // HOBEIAN sensors avec parenthèses et manque alimentation
      'pir_radar_illumination_sensor': {
        newName: 'pir_radar_illumination_sensor_battery',
        displayName: 'PIR Radar Illumination Sensor Battery',
        reason: 'Missing battery designation, had parentheses in display name'
      },
      'motion_temp_humidity_illumination_sensor': {
        newName: 'motion_temp_humidity_illumination_multi_battery',
        displayName: 'Motion Temp Humidity Illumination Multi Battery',
        reason: 'Missing battery designation and multi level, had parentheses'
      }
    };
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'cyan');
      this.log('🔧 FIX DRIVER NOMENCLATURE - STRICT COMPLIANCE', 'cyan');
      this.log('='.repeat(80) + '\n', 'cyan');

      // 1. Vérifier les drivers à corriger
      this.log('📋 Analyse des drivers à corriger...', 'blue');
      
      for (const [oldName, correction] of Object.entries(this.corrections)) {
        const oldPath = path.join(this.driversDir, oldName);
        const newPath = path.join(this.driversDir, correction.newName);
        
        if (fs.existsSync(oldPath)) {
          this.log(`✅ Trouvé: ${oldName}`, 'yellow');
          this.log(`   → Renommer vers: ${correction.newName}`, 'green');
          this.log(`   → Raison: ${correction.reason}`, 'blue');
          
          // Renommer le dossier
          if (!fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
            this.log(`   ✅ Dossier renommé`, 'green');
            
            // Mettre à jour driver.compose.json
            const composeFile = path.join(newPath, 'driver.compose.json');
            if (fs.existsSync(composeFile)) {
              const compose = JSON.parse(fs.readFileSync(composeFile, 'utf-8'));
              
              // Retirer parenthèses du nom
              compose.name = { en: correction.displayName };
              
              // Mettre à jour l'id
              compose.id = correction.newName;
              
              fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf-8');
              this.log(`   ✅ driver.compose.json mis à jour`, 'green');
            }
            
            this.renames.push({
              old: oldName,
              new: correction.newName,
              displayName: correction.displayName
            });
          } else {
            this.log(`   ⚠ Destination existe déjà, skip`, 'yellow');
          }
        } else {
          this.log(`⚠ Non trouvé: ${oldName} (peut-être déjà renommé)`, 'yellow');
        }
      }

      // 2. Vérifier tous les drivers pour conformité
      this.log('\n📋 Vérification conformité nomenclature tous drivers...', 'blue');
      
      const allDrivers = fs.readdirSync(this.driversDir).filter(dir => {
        return fs.statSync(path.join(this.driversDir, dir)).isDirectory();
      });

      const violations = [];
      
      for (const driverName of allDrivers) {
        const composeFile = path.join(this.driversDir, driverName, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          const compose = JSON.parse(fs.readFileSync(composeFile, 'utf-8'));
          const displayName = compose.name?.en || '';
          
          // Vérifier parenthèses ou caractères spéciaux
          if (displayName.includes('(') || displayName.includes(')')) {
            violations.push({
              driver: driverName,
              issue: 'Parentheses in display name',
              displayName: displayName
            });
          }
          
          // Vérifier si manque alimentation dans nom dossier
          const hasAC = driverName.includes('_ac');
          const hasBattery = driverName.includes('_battery');
          const hasCR = driverName.includes('_cr2032') || driverName.includes('_cr2450');
          const hasDC = driverName.includes('_dc');
          const hasHybrid = driverName.includes('_hybrid');
          
          const hasPower = hasAC || hasBattery || hasCR || hasDC || hasHybrid;
          
          // Exceptions: certains types n'ont pas besoin
          const exceptions = ['zbbridge', 'zigbee_gateway_hub', 'mini'];
          const isException = exceptions.some(ex => driverName.includes(ex));
          
          if (!hasPower && !isException && compose.capabilities?.includes('measure_battery')) {
            violations.push({
              driver: driverName,
              issue: 'Missing power designation (has measure_battery but no _battery in name)',
              displayName: displayName
            });
          }
        }
      }

      if (violations.length > 0) {
        this.log(`\n⚠ ${violations.length} violations trouvées:`, 'yellow');
        violations.forEach(v => {
          this.log(`   - ${v.driver}`, 'yellow');
          this.log(`     Issue: ${v.issue}`, 'red');
          this.log(`     Display: ${v.displayName}`, 'blue');
        });
      } else {
        this.log('\n✅ Tous les drivers respectent la nomenclature!', 'green');
      }

      // 3. Mettre à jour app.json avec AUTO_UPDATE_APP_JSON.js
      this.log('\n🔄 Synchronisation app.json...', 'blue');
      const { execSync } = require('child_process');
      try {
        execSync('node scripts/AUTO_UPDATE_APP_JSON.js', { 
          cwd: this.rootDir,
          stdio: 'inherit'
        });
        this.log('✅ app.json synchronisé', 'green');
      } catch (error) {
        this.log('❌ Erreur synchronisation app.json', 'red');
      }

      // 4. Rapport final
      this.log('\n' + '='.repeat(80), 'green');
      this.log('✅ NOMENCLATURE CORRIGÉE', 'green');
      this.log('='.repeat(80), 'green');
      
      this.log(`\n📊 Drivers renommés: ${this.renames.length}`, 'cyan');
      if (this.renames.length > 0) {
        this.renames.forEach(r => {
          this.log(`   ${r.old} → ${r.new}`, 'green');
          this.log(`   Display: "${r.displayName}"`, 'blue');
        });
      }
      
      this.log(`\n📊 Violations restantes: ${violations.length}`, violations.length > 0 ? 'yellow' : 'green');
      
      this.log('\n✅ Nomenclature stricte respectée!\n', 'green');

    } catch (error) {
      this.log(`\n❌ ERREUR: ${error.message}\n`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const fixer = new DriverNomenclatureFixer();
  fixer.run();
}

module.exports = DriverNomenclatureFixer;
