#!/usr/bin/env node

/**
 * SCRIPT D'INTÉGRATION HEALTHCHECK
 * 
 * Ajoute automatiquement HealthCheck à tous les drivers qui n'en ont pas encore
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const DRIVERS_PATH = path.join(PROJECT_ROOT, 'drivers');

const HEALTHCHECK_CODE = `
  /**
   * Initialize HealthCheck system
   */
  initializeHealthCheck() {
    const HealthCheck = require('../../lib/HealthCheck');
    this.healthCheck = new HealthCheck(this);
    
    // Optional: Run periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const report = await this.healthCheck.check();
        
        if (report.overall === 'poor' || report.overall === 'critical') {
          this.log('⚠️ Health issues detected:', report.issues.length, 'issues');
          report.issues.forEach(issue => {
            this.log(\`  - [\${issue.severity}] \${issue.message}\`);
          });
        }
      } catch (err) {
        this.error('Health check failed:', err);
      }
    }, 3600000); // Every hour
  }
  
  /**
   * Get health report
   */
  async getHealthReport() {
    if (!this.healthCheck) {
      throw new Error('HealthCheck not initialized');
    }
    return await this.healthCheck.check();
  }
`;

const CLEANUP_CODE = `
  async onDeleted() {
    // Cleanup health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
`;

async function integrateHealthCheck() {
  console.log('🔧 Intégration HealthCheck dans les drivers...\n');
  
  const driverDirs = await glob('*/', { cwd: DRIVERS_PATH });
  
  let integrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const driverDir of driverDirs) {
    const devicePath = path.join(DRIVERS_PATH, driverDir, 'device.js');
    
    try {
      const exists = await fs.access(devicePath).then(() => true).catch(() => false);
      if (!exists) {
        skipped++;
        continue;
      }
      
      let content = await fs.readFile(devicePath, 'utf8');
      
      // Check if already integrated
      if (content.includes('initializeHealthCheck') || content.includes('this.healthCheck')) {
        console.log(`⏭️  ${driverDir.replace('/', '')} - Already has HealthCheck`);
        skipped++;
        continue;
      }
      
      // Find onInit method
      const onInitRegex = /async\s+onInit\s*\(\s*\)\s*{/;
      if (!onInitRegex.test(content)) {
        console.log(`⚠️  ${driverDir.replace('/', '')} - No onInit method found`);
        skipped++;
        continue;
      }
      
      // Add initializeHealthCheck call in onInit
      content = content.replace(
        onInitRegex,
        `async onInit() {
    // Initialize HealthCheck
    this.initializeHealthCheck();
`
      );
      
      // Add methods before last closing brace
      const lastBraceIndex = content.lastIndexOf('}');
      content = content.slice(0, lastBraceIndex) + HEALTHCHECK_CODE + '\n' + CLEANUP_CODE + '\n' + content.slice(lastBraceIndex);
      
      // Write back
      await fs.writeFile(devicePath, content, 'utf8');
      
      console.log(`✅ ${driverDir.replace('/', '')} - HealthCheck integrated`);
      integrated++;
      
    } catch (err) {
      console.error(`❌ ${driverDir.replace('/', '')} - Error:`, err.message);
      errors++;
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`  ✅ Intégrés: ${integrated}`);
  console.log(`  ⏭️  Ignorés: ${skipped}`);
  console.log(`  ❌ Erreurs: ${errors}`);
  console.log(`  📦 Total: ${driverDirs.length}`);
}

integrateHealthCheck().catch(console.error);
