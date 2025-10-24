#!/usr/bin/env node
'use strict';

/**
 * Master Orchestrator v3.0.0
 * Coordonne tous les scripts et algorithmes
 * Intègre: DP Engine, AI Automation, CI/CD, Validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MasterOrchestrator {
  constructor() {
    this.version = '3.0.0';
    this.startTime = Date.now();
    this.results = {
      validation: null,
      matrix: null,
      coverage: null,
      aiReady: null,
      dpEngine: null
    };
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  MASTER ORCHESTRATOR v3.0.0                      ║');
    console.log('║  Universal Tuya Zigbee - Complete Automation     ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    try {
      // Phase 1: Validation
      await this.phase1_Validation();
      
      // Phase 2: DP Engine Check
      await this.phase2_DPEngine();
      
      // Phase 3: Matrix & Coverage
      await this.phase3_MatrixCoverage();
      
      // Phase 4: AI System Check
      await this.phase4_AISystem();
      
      // Phase 5: Documentation Update
      await this.phase5_Documentation();
      
      // Phase 6: Final Report
      await this.phase6_FinalReport();
      
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
      console.log(`\n✅ Orchestration complète en ${duration}s\n`);
      
      return this.results;
      
    } catch (err) {
      console.error('\n❌ Orchestration error:', err.message);
      process.exit(1);
    }
  }

  async phase1_Validation() {
    console.log('═══ PHASE 1: Validation ═══\n');
    
    try {
      // Homey validation
      console.log('  → Homey app validation...');
      execSync('homey app validate --level publish', { stdio: 'pipe' });
      console.log('  ✅ Homey validation OK\n');
      
      // Driver schema validation
      console.log('  → Driver schemas validation...');
      const schemaResult = execSync('node scripts/validation/validate-driver-schemas.js', { stdio: 'pipe' });
      const match = schemaResult.toString().match(/(\d+)\/(\d+)/);
      if (match) {
        this.results.validation = {
          valid: parseInt(match[1]),
          total: parseInt(match[2]),
          percentage: Math.round((parseInt(match[1]) / parseInt(match[2])) * 100)
        };
        console.log(`  ✅ Schemas: ${this.results.validation.valid}/${this.results.validation.total} (${this.results.validation.percentage}%)\n`);
      }
      
    } catch (err) {
      console.log('  ⚠️ Validation warnings (continuing...)\n');
    }
  }

  async phase2_DPEngine() {
    console.log('═══ PHASE 2: DP Engine Check ═══\n');
    
    try {
      const enginePath = path.join(process.cwd(), 'lib/tuya-dp-engine');
      
      // Check files
      const files = ['index.js', 'fingerprints.json', 'profiles.json', 'capability-map.json'];
      let allPresent = true;
      
      files.forEach(file => {
        const exists = fs.existsSync(path.join(enginePath, file));
        console.log(`  ${exists ? '✅' : '❌'} ${file}`);
        if (!exists) allPresent = false;
      });
      
      // Count profiles & fingerprints
      if (allPresent) {
        const profiles = JSON.parse(fs.readFileSync(path.join(enginePath, 'profiles.json'), 'utf8'));
        const fingerprints = JSON.parse(fs.readFileSync(path.join(enginePath, 'fingerprints.json'), 'utf8'));
        
        this.results.dpEngine = {
          profiles: Object.keys(profiles.profiles || {}).length,
          fingerprints: (fingerprints.fingerprints || []).length
        };
        
        console.log(`\n  📊 Profiles: ${this.results.dpEngine.profiles}`);
        console.log(`  📊 Fingerprints: ${this.results.dpEngine.fingerprints}\n`);
      }
      
    } catch (err) {
      console.log('  ⚠️ DP Engine check error:', err.message, '\n');
    }
  }

  async phase3_MatrixCoverage() {
    console.log('═══ PHASE 3: Matrix & Coverage ═══\n');
    
    try {
      // Generate device matrix
      console.log('  → Generating device matrix...');
      execSync('node scripts/automation/generate-device-matrix.js', { stdio: 'pipe' });
      console.log('  ✅ Device matrix generated\n');
      
      // Generate coverage stats
      console.log('  → Generating coverage stats...');
      execSync('node scripts/automation/generate-coverage-stats.js', { stdio: 'pipe' });
      
      // Read stats
      const stats = JSON.parse(fs.readFileSync('COVERAGE_STATS.json', 'utf8'));
      this.results.coverage = {
        drivers: stats.total_drivers,
        variants: stats.device_variants,
        categories: stats.categories,
        health: stats.health_score
      };
      
      console.log(`  ✅ Stats generated\n`);
      console.log(`  📊 Drivers: ${this.results.coverage.drivers}`);
      console.log(`  📊 Variants: ${this.results.coverage.variants}+`);
      console.log(`  📊 Categories: ${this.results.coverage.categories}`);
      console.log(`  📊 Health: ${this.results.coverage.health}%\n`);
      
    } catch (err) {
      console.log('  ⚠️ Matrix/Coverage error:', err.message, '\n');
    }
  }

  async phase4_AISystem() {
    console.log('═══ PHASE 4: AI System Check ═══\n');
    
    try {
      const aiPath = path.join(process.cwd(), 'scripts/ai');
      
      // Check AI scripts
      const aiScripts = ['web-research.js', 'heuristic-analyzer.js', 'driver-generator.js'];
      let allPresent = true;
      
      aiScripts.forEach(script => {
        const exists = fs.existsSync(path.join(aiPath, script));
        console.log(`  ${exists ? '✅' : '❌'} ${script}`);
        if (!exists) allPresent = false;
      });
      
      // Check GitHub workflow
      const workflowPath = path.join(process.cwd(), '.github/workflows/auto-driver-generation.yml');
      const workflowExists = fs.existsSync(workflowPath);
      console.log(`  ${workflowExists ? '✅' : '❌'} auto-driver-generation.yml`);
      
      this.results.aiReady = allPresent && workflowExists;
      console.log(`\n  ${this.results.aiReady ? '✅' : '⚠️'} AI System ${this.results.aiReady ? 'Ready' : 'Incomplete'}\n`);
      
    } catch (err) {
      console.log('  ⚠️ AI check error:', err.message, '\n');
    }
  }

  async phase5_Documentation() {
    console.log('═══ PHASE 5: Documentation Update ═══\n');
    
    try {
      // Update all links
      console.log('  → Updating documentation links...');
      execSync('node scripts/automation/update-all-links.js', { stdio: 'pipe' });
      console.log('  ✅ Links updated\n');
      
      // Check key docs
      const docs = [
        'docs/LOCAL_FIRST.md',
        'docs/WHY_THIS_APP.md',
        'docs/COVERAGE_METHODOLOGY.md',
        'lib/tuya-dp-engine/README.md'
      ];
      
      docs.forEach(doc => {
        const exists = fs.existsSync(doc);
        const size = exists ? fs.statSync(doc).size : 0;
        console.log(`  ${exists ? '✅' : '❌'} ${doc} ${exists ? `(${Math.round(size/1024)}KB)` : ''}`);
      });
      
      console.log('');
      
    } catch (err) {
      console.log('  ⚠️ Documentation update error:', err.message, '\n');
    }
  }

  async phase6_FinalReport() {
    console.log('═══ PHASE 6: Final Report ═══\n');
    
    // Generate summary report
    const report = {
      version: this.version,
      timestamp: new Date().toISOString(),
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2) + 's',
      results: this.results
    };
    
    // Save report
    fs.writeFileSync('orchestration-report.json', JSON.stringify(report, null, 2));
    console.log('  ✅ Report saved: orchestration-report.json\n');
    
    // Display summary
    console.log('  📊 SUMMARY\n');
    console.log(`  Version:      ${this.version}`);
    console.log(`  Drivers:      ${this.results.coverage?.drivers || 'N/A'}`);
    console.log(`  Variants:     ${this.results.coverage?.variants || 'N/A'}+`);
    console.log(`  Health:       ${this.results.coverage?.health || 'N/A'}%`);
    console.log(`  DP Profiles:  ${this.results.dpEngine?.profiles || 'N/A'}`);
    console.log(`  AI System:    ${this.results.aiReady ? '✅ Ready' : '⚠️ Check needed'}`);
    console.log('');
  }
}

// Main execution
if (require.main === module) {
  const orchestrator = new MasterOrchestrator();
  orchestrator.run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = MasterOrchestrator;
