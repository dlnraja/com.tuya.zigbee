#!/usr/bin/env node

/**
 * AUDIT COMPLET DU PROJET
 * Analyse exhaustive de tous les composants
 */

import { readJSON, findFiles, exists, getProjectRoot } from './lib/file-utils.js';
import { logger } from './lib/logger.js';
import path from 'path';
import { glob } from 'glob';

const PROJECT_ROOT = getProjectRoot();

class CompleteAudit {
  constructor() {
    this.results = {
      app: {},
      drivers: {},
      database: {},
      scripts: {},
      documentation: {},
      tests: {},
      performance: {},
      issues: [],
      recommendations: []
    };
  }

  async run() {
    logger.title('🔍 AUDIT COMPLET DU PROJET');
    
    await this.auditApp();
    await this.auditDrivers();
    await this.auditDatabase();
    await this.auditScripts();
    await this.auditDocumentation();
    await this.auditTests();
    await this.auditPerformance();
    
    this.generateReport();
    
    return this.results;
  }

  async auditApp() {
    logger.section('📱 Audit app.json');
    
    try {
      const appPath = path.join(PROJECT_ROOT, 'app.json');
      const app = await readJSON(appPath);
      
      this.results.app = {
        version: app.version,
        sdk: app.sdk,
        driversCount: app.drivers ? app.drivers.length : 0,
        flowCount: (app.flow?.triggers?.length || 0) + 
                   (app.flow?.actions?.length || 0) +
                   (app.flow?.conditions?.length || 0),
        hasImages: !!app.images,
        size: (await import('fs')).statSync(appPath).size
      };
      
      logger.success(`✓ Version: ${app.version}`);
      logger.success(`✓ Drivers: ${this.results.app.driversCount}`);
      logger.success(`✓ Flow cards: ${this.results.app.flowCount}`);
      logger.success(`✓ SDK: ${app.sdk}`);
      
      if (this.results.app.size > 5 * 1024 * 1024) {
        this.results.issues.push({
          severity: 'medium',
          component: 'app.json',
          message: `File size is ${(this.results.app.size / 1024 / 1024).toFixed(2)}MB`,
          recommendation: 'Consider optimizing app.json size'
        });
      }
      
    } catch (err) {
      logger.error(`Error auditing app.json: ${err.message}`);
      this.results.issues.push({
        severity: 'critical',
        component: 'app.json',
        message: err.message
      });
    }
  }

  async auditDrivers() {
    logger.section('🚗 Audit Drivers');
    
    try {
      const driversPath = path.join(PROJECT_ROOT, 'drivers');
      const driverDirs = await glob('*/', { cwd: driversPath });
      
      let validDrivers = 0;
      let totalManufacturerIDs = 0;
      let driversWithImages = 0;
      let driversWithDevice = 0;
      
      for (const driverDir of driverDirs) {
        const driverPath = path.join(driversPath, driverDir);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (await exists(composePath)) {
          validDrivers++;
          
          const compose = await readJSON(composePath);
          
          // Count manufacturer IDs
          if (compose.zigbee?.manufacturerName) {
            totalManufacturerIDs += compose.zigbee.manufacturerName.length;
          }
          
          // Check images
          if (await exists(path.join(driverPath, 'assets', 'images', 'small.png'))) {
            driversWithImages++;
          }
          
          // Check device.js
          if (await exists(path.join(driverPath, 'device.js'))) {
            driversWithDevice++;
          }
        }
      }
      
      this.results.drivers = {
        total: driverDirs.length,
        valid: validDrivers,
        withImages: driversWithImages,
        withDevice: driversWithDevice,
        totalManufacturerIDs,
        avgIDsPerDriver: (totalManufacturerIDs / validDrivers).toFixed(2)
      };
      
      logger.success(`✓ Total drivers: ${validDrivers}`);
      logger.success(`✓ With images: ${driversWithImages}`);
      logger.success(`✓ With device.js: ${driversWithDevice}`);
      logger.success(`✓ Total manufacturer IDs: ${totalManufacturerIDs}`);
      
      if (driversWithImages < validDrivers) {
        this.results.issues.push({
          severity: 'high',
          component: 'drivers',
          message: `${validDrivers - driversWithImages} drivers missing images`,
          recommendation: 'Add images to all drivers'
        });
      }
      
    } catch (err) {
      logger.error(`Error auditing drivers: ${err.message}`);
    }
  }

  async auditDatabase() {
    logger.section('📊 Audit Database');
    
    try {
      const dbPath = path.join(PROJECT_ROOT, 'project-data', 'MANUFACTURER_DATABASE.json');
      
      if (await exists(dbPath)) {
        const db = await readJSON(dbPath);
        
        this.results.database = {
          version: db.metadata?.version,
          totalEntries: db.metadata?.totalEntries || Object.keys(db.manufacturers || {}).length,
          lastUpdated: db.metadata?.lastUpdated,
          sources: db.metadata?.sources?.length || 0
        };
        
        logger.success(`✓ Database version: ${this.results.database.version}`);
        logger.success(`✓ Total entries: ${this.results.database.totalEntries}`);
        
      } else {
        this.results.issues.push({
          severity: 'medium',
          component: 'database',
          message: 'MANUFACTURER_DATABASE.json not found',
          recommendation: 'Create manufacturer database'
        });
      }
    } catch (err) {
      logger.error(`Error auditing database: ${err.message}`);
    }
  }

  async auditScripts() {
    logger.section('📜 Audit Scripts');
    
    try {
      const scriptsPath = path.join(PROJECT_ROOT, 'scripts');
      const nodeToolsPath = path.join(scriptsPath, 'node-tools');
      
      const jsScripts = await glob('**/*.js', { cwd: nodeToolsPath });
      const psScripts = await glob('**/*.ps1', { cwd: scriptsPath });
      
      this.results.scripts = {
        nodeJS: jsScripts.length,
        powerShell: psScripts.length,
        total: jsScripts.length + psScripts.length,
        migrationProgress: ((jsScripts.length / (jsScripts.length + psScripts.length)) * 100).toFixed(1) + '%'
      };
      
      logger.success(`✓ Node.js scripts: ${jsScripts.length}`);
      logger.success(`✓ PowerShell scripts: ${psScripts.length}`);
      logger.success(`✓ Migration progress: ${this.results.scripts.migrationProgress}`);
      
      this.results.recommendations.push({
        type: 'scripts',
        message: `${psScripts.length} PowerShell scripts remain to be converted to Node.js`
      });
      
    } catch (err) {
      logger.error(`Error auditing scripts: ${err.message}`);
    }
  }

  async auditDocumentation() {
    logger.section('📚 Audit Documentation');
    
    try {
      const docsPath = path.join(PROJECT_ROOT, 'docs');
      const rootDocs = await glob('*.md', { cwd: PROJECT_ROOT });
      const subDocs = await exists(docsPath) ? await glob('**/*.md', { cwd: docsPath }) : [];
      
      this.results.documentation = {
        rootDocs: rootDocs.length,
        subDocs: subDocs.length,
        total: rootDocs.length + subDocs.length,
        hasReadme: rootDocs.includes('README.md'),
        hasChangelog: rootDocs.includes('CHANGELOG.md')
      };
      
      logger.success(`✓ Documentation files: ${this.results.documentation.total}`);
      logger.success(`✓ README: ${this.results.documentation.hasReadme ? 'Yes' : 'No'}`);
      logger.success(`✓ CHANGELOG: ${this.results.documentation.hasChangelog ? 'Yes' : 'No'}`);
      
    } catch (err) {
      logger.error(`Error auditing documentation: ${err.message}`);
    }
  }

  async auditTests() {
    logger.section('🧪 Audit Tests');
    
    try {
      const testsPath = path.join(PROJECT_ROOT, 'tests');
      const testFiles = await exists(testsPath) ? await glob('**/*.js', { cwd: testsPath }) : [];
      
      this.results.tests = {
        totalTests: testFiles.length,
        hasJestConfig: await exists(path.join(PROJECT_ROOT, 'jest.config.js')),
        coverage: 'Unknown' // Would need to run tests to determine
      };
      
      logger.success(`✓ Test files: ${testFiles.length}`);
      logger.success(`✓ Jest config: ${this.results.tests.hasJestConfig ? 'Yes' : 'No'}`);
      
      if (testFiles.length === 0) {
        this.results.recommendations.push({
          type: 'tests',
          message: 'No test files found. Consider adding unit tests.'
        });
      }
      
    } catch (err) {
      logger.error(`Error auditing tests: ${err.message}`);
    }
  }

  async auditPerformance() {
    logger.section('⚡ Audit Performance');
    
    try {
      const appJsonPath = path.join(PROJECT_ROOT, 'app.json');
      const stat = await import('fs').then(fs => fs.statSync(appJsonPath));
      
      this.results.performance = {
        appJsonSize: stat.size,
        buildTime: 'To be measured',
        validationTime: 'To be measured'
      };
      
      logger.success(`✓ app.json size: ${(stat.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (stat.size > 10 * 1024 * 1024) {
        this.results.issues.push({
          severity: 'high',
          component: 'performance',
          message: 'app.json is very large',
          recommendation: 'Optimize data structures'
        });
      }
      
    } catch (err) {
      logger.error(`Error auditing performance: ${err.message}`);
    }
  }

  generateReport() {
    logger.section('📋 RAPPORT D\'AUDIT');
    
    // Summary
    logger.summary('Résumé Global', [
      { label: 'Version', value: this.results.app.version, status: 'success' },
      { label: 'Drivers', value: this.results.drivers.valid, status: 'success' },
      { label: 'Manufacturer IDs', value: this.results.drivers.totalManufacturerIDs, status: 'success' },
      { label: 'Database entries', value: this.results.database.totalEntries, status: 'success' },
      { label: 'Node.js scripts', value: this.results.scripts.nodeJS, status: 'success' },
      { label: 'Issues', value: this.results.issues.length, status: this.results.issues.length > 0 ? 'warning' : 'success' }
    ]);
    
    // Issues
    if (this.results.issues.length > 0) {
      logger.section('⚠️  Issues Détectés');
      this.results.issues.forEach((issue, i) => {
        const icon = issue.severity === 'critical' ? '🔴' : 
                     issue.severity === 'high' ? '🟠' :
                     issue.severity === 'medium' ? '🟡' : '🟢';
        logger.log(`\n${i + 1}. ${icon} [${issue.component}] ${issue.message}`);
        if (issue.recommendation) {
          logger.log(`   💡 ${issue.recommendation}`, { color: 'cyan' });
        }
      });
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      logger.section('💡 Recommendations');
      this.results.recommendations.forEach((rec, i) => {
        logger.log(`${i + 1}. [${rec.type}] ${rec.message}`);
      });
    }
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  const audit = new CompleteAudit();
  
  audit.run()
    .then(results => {
      logger.success('\n✅ Audit terminé!');
      process.exit(results.issues.filter(i => i.severity === 'critical').length > 0 ? 1 : 0);
    })
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default CompleteAudit;
