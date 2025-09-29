#!/usr/bin/env node
/**
 * AUTO_RETRY_PUBLISH - Monitoring avec relance auto
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 AUTO_RETRY_PUBLISH - Monitoring + Relance automatique');

const rootDir = path.resolve(__dirname, '..', '..');
const MAX_RETRIES = 3;

class RetryPublisher {
  constructor() {
    this.attempts = 0;
  }

  checkAndRetry() {
    console.log(`\n📊 Tentative ${this.attempts + 1}/${MAX_RETRIES}`);
    
    try {
      // Validation locale
      console.log('✅ Validation...');
      execSync('homey app validate', { cwd: rootDir, stdio: 'ignore' });
      
      // Trigger publication via commit
      console.log('🚀 Déclenchement publication...');
      execSync('git commit --allow-empty -m "🔄 Auto-retry publication"', { cwd: rootDir });
      execSync('git push origin master', { cwd: rootDir });
      
      console.log('✅ PUBLICATION DÉCLENCHÉE');
      
      // Générer rapport
      const report = {
        timestamp: new Date().toISOString(),
        attempt: this.attempts + 1,
        status: 'TRIGGERED',
        method: 'GitHub Actions Auto-retry'
      };
      
      const reportPath = path.join(__dirname, '..', 'reports', 'auto_retry_report.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      return true;
      
    } catch (error) {
      console.error(`❌ Échec tentative ${this.attempts + 1}:`, error.message);
      this.attempts++;
      
      if (this.attempts < MAX_RETRIES) {
        console.log(`🔄 Nouvelle tentative dans 10s...`);
        setTimeout(() => this.checkAndRetry(), 10000);
      } else {
        console.error('❌ TOUTES LES TENTATIVES ÉCHOUÉES');
        return false;
      }
    }
  }
}

// Démarrage
console.log('🎯 MONITORING LINKS:');
console.log('📊 Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
console.log('📱 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');

const publisher = new RetryPublisher();
publisher.checkAndRetry();

console.log('\n✨ AUTO-RETRY CONFIGURÉ - Publication en cours!');
