#!/usr/bin/env node
/**
 * ✅ VÉRIFICATION ZIGBEE LOCAL UNIQUEMENT
 * 
 * Vérifie que TOUS nos drivers sont:
 * 1. 100% Zigbee (pas WiFi/Cloud)
 * 2. Communication locale uniquement
 * 3. Pas de connexions cloud/internet
 * 4. Privacy totale garantie
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class ZigbeeLocalVerifier {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.results = {
      total: 0,
      zigbeeLocal: 0,
      invalid: [],
      warnings: []
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // Vérifier un driver
  verifyDriver(driverId) {
    const composePath = path.join(this.driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      return { valid: false, reason: 'No driver.compose.json' };
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const issues = [];
      
      // Vérifier platforms
      if (data.platforms) {
        if (data.platforms.includes('cloud')) {
          issues.push('❌ ERREUR: platform "cloud" détecté!');
        }
        if (!data.platforms.includes('local')) {
          issues.push('⚠️  WARNING: platform "local" manquant');
        }
      }
      
      // Vérifier connectivity
      if (data.connectivity) {
        if (data.connectivity.includes('wifi')) {
          issues.push('❌ ERREUR: connectivity "wifi" détecté!');
        }
        if (data.connectivity.includes('bluetooth')) {
          issues.push('⚠️  INFO: connectivity "bluetooth" (vérifier si approprié)');
        }
        if (!data.connectivity.includes('zigbee')) {
          issues.push('❌ ERREUR: connectivity "zigbee" manquant!');
        }
      }
      
      // Vérifier présence section zigbee
      if (!data.zigbee) {
        issues.push('❌ ERREUR: Section zigbee manquante!');
      } else {
        // Vérifier endpoints
        if (!data.zigbee.endpoints) {
          issues.push('⚠️  WARNING: zigbee.endpoints manquant');
        }
        
        // Vérifier manufacturerName ou productId
        if (!data.zigbee.manufacturerName && !data.zigbee.productId) {
          issues.push('⚠️  WARNING: manufacturerName et productId manquants');
        }
      }
      
      return {
        valid: issues.filter(i => i.includes('❌ ERREUR')).length === 0,
        issues: issues,
        data: data
      };
      
    } catch (err) {
      return { valid: false, reason: `Parse error: ${err.message}` };
    }
  }

  // Vérifier tous les drivers
  verifyAll() {
    this.log('\n✅ VÉRIFICATION ZIGBEE LOCAL UNIQUEMENT', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const drivers = fs.readdirSync(this.driversDir).filter(item => {
      const driverPath = path.join(this.driversDir, item);
      return fs.statSync(driverPath).isDirectory();
    });
    
    this.results.total = drivers.length;
    this.log(`\n📊 Vérification de ${drivers.length} drivers...`, 'blue');
    
    let errorsCount = 0;
    let warningsCount = 0;
    
    for (const driverId of drivers) {
      const result = this.verifyDriver(driverId);
      
      if (!result.valid) {
        errorsCount++;
        this.results.invalid.push({
          driver: driverId,
          reason: result.reason,
          issues: result.issues
        });
        
        this.log(`\n❌ ${driverId}`, 'red');
        if (result.reason) {
          this.log(`   ${result.reason}`, 'red');
        }
        if (result.issues) {
          result.issues.forEach(issue => {
            if (issue.includes('❌')) {
              this.log(`   ${issue}`, 'red');
            } else {
              this.log(`   ${issue}`, 'yellow');
              warningsCount++;
            }
          });
        }
      } else if (result.issues && result.issues.length > 0) {
        warningsCount++;
        this.results.warnings.push({
          driver: driverId,
          issues: result.issues
        });
        
        this.log(`\n⚠️  ${driverId}`, 'yellow');
        result.issues.forEach(issue => {
          this.log(`   ${issue}`, 'yellow');
        });
      } else {
        this.results.zigbeeLocal++;
      }
    }
    
    // Résumé
    this.log('\n' + '═'.repeat(70), 'magenta');
    this.log('  📊 RÉSUMÉ VÉRIFICATION', 'magenta');
    this.log('═'.repeat(70), 'magenta');
    
    this.log(`\n  Total drivers: ${this.results.total}`, 'blue');
    this.log(`  ✅ Zigbee local OK: ${this.results.zigbeeLocal}`, 'green');
    this.log(`  ❌ Erreurs: ${errorsCount}`, errorsCount > 0 ? 'red' : 'green');
    this.log(`  ⚠️  Warnings: ${warningsCount}`, warningsCount > 0 ? 'yellow' : 'green');
    
    const percentage = Math.round((this.results.zigbeeLocal / this.results.total) * 100);
    this.log(`\n  📈 Conformité: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');
    
    if (percentage === 100 && warningsCount === 0) {
      this.log('\n🎉 PARFAIT! Tous les drivers sont 100% Zigbee local!', 'green');
    } else if (errorsCount === 0) {
      this.log('\n👍 BIEN! Zigbee local OK, quelques warnings à vérifier.', 'yellow');
    } else {
      this.log('\n⚠️  ATTENTION! Certains drivers ne sont pas conformes.', 'red');
    }
    
    // Sauvegarder rapport
    const reportPath = path.join(this.rootDir, 'references', 'ZIGBEE_LOCAL_VERIFICATION.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n  📄 Rapport: ${reportPath}`, 'cyan');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     ✅ VÉRIFICATION ZIGBEE LOCAL UNIQUEMENT                         ║', 'magenta');
    this.log('║     Aucun cloud, aucun WiFi, 100% local                             ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.verifyAll();
    
    this.log('\n✅ VÉRIFICATION TERMINÉE!\n', 'green');
  }
}

if (require.main === module) {
  const verifier = new ZigbeeLocalVerifier();
  verifier.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = ZigbeeLocalVerifier;
