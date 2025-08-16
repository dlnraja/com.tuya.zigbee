#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🚪 Quality Gates - Universal Tuya Zigbee
 * Quality control system for the CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');

class QualityGates {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportsPath = path.join(this.projectRoot, 'reports');
    this.qualityResults = {
      timestamp: new Date().toISOString(),
      version: '3.4.0',
      gates: {
        structure: { status: 'pending', score: 0, details: {} },
        validation: { status: 'pending', score: 0, details: {} },
        generation: { status: 'pending', score: 0, details: {} },
        documentation: { status: 'pending', score: 0, details: {} }
      },
      overall: 'pending',
      score: 0
    };
  }

  /**
   * Main quality check execution
   */
  async runQualityCheck() {
    console.log('🚪 Starting Quality Gates Check...\n');
    
    try {
      // Check structure quality
      await this.checkStructureQuality();
      
      // Check validation quality
      await this.checkValidationQuality();
      
      // Check generation quality
      await this.checkGenerationQuality();
      
      // Check documentation quality
      await this.checkDocumentationQuality();
      
      // Calculate overall quality
      this.calculateOverallQuality();
      
      // Generate quality report
      await this.generateQualityReport();
      
      // Display results
      this.displayResults();
      
      return this.qualityResults.overall === 'passed';
      
    } catch (error) {
      console.error('❌ Quality check failed:', error);
      this.qualityResults.overall = 'failed';
      return false;
    }
  }

  /**
   * Check structure quality
   */
  async checkStructureQuality() {
    console.log('🏗️ Checking Structure Quality...');
    
    try {
      let score = 0;
      const details = {};

      // Check catalog structure
      const catalogPath = path.join(this.projectRoot, 'catalog');
      if (fs.existsSync(catalogPath)) {
        score += 25;
        details.catalog = 'present';
        
        // Check categories.json
        const categoriesPath = path.join(catalogPath, 'categories.json');
        if (fs.existsSync(categoriesPath)) {
          score += 25;
          details.categories = 'present';
        }
        
        // Check vendors.json
        const vendorsPath = path.join(catalogPath, 'vendors.json');
        if (fs.existsSync(vendorsPath)) {
          score += 25;
          details.vendors = 'present';
        }
        
        // Check example model
        const exampleModelPath = path.join(catalogPath, 'switch', 'tuya', 'wall_switch_3_gang');
        if (fs.existsSync(exampleModelPath)) {
          score += 25;
          details.exampleModel = 'present';
        }
      }

      this.qualityResults.gates.structure = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`  ✅ Structure Quality: ${score}/100`);
      
    } catch (error) {
      this.qualityResults.gates.structure = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('  ❌ Structure Quality: Failed');
    }
  }

  /**
   * Check validation quality
   */
  async checkValidationQuality() {
    console.log('🔍 Checking Validation Quality...');
    
    try {
      let score = 0;
      const details = {};

      // Check validation scripts
      const validationScripts = [
        'scripts/validate-main.js',
        'scripts/validate-driver-structure.js',
        'scripts/validate-compose-schema.js'
      ];

      let validScripts = 0;
      for (const script of validationScripts) {
        if (fs.existsSync(path.join(this.projectRoot, script))) {
          validScripts++;
        }
      }

      score = (validScripts / validationScripts.length) * 100;
      details.scripts = `${validScripts}/${validationScripts.length}`;

      // Check test scripts
      const testScripts = [
        'scripts/test-generation-pipeline.js',
        'scripts/generate-test-report.js'
      ];

      let testScriptsPresent = 0;
      for (const script of testScripts) {
        if (fs.existsSync(path.join(this.projectRoot, script))) {
          testScriptsPresent++;
        }
      }

      if (testScriptsPresent === testScripts.length) {
        score += 20;
        details.testScripts = 'complete';
      }

      this.qualityResults.gates.validation = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: Math.min(score, 100),
        details: details
      };

      console.log(`  ✅ Validation Quality: ${Math.round(score)}/100`);
      
    } catch (error) {
      this.qualityResults.gates.validation = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('  ❌ Validation Quality: Failed');
    }
  }

  /**
   * Check generation quality
   */
  async checkGenerationQuality() {
    console.log('🏗️ Checking Generation Quality...');
    
    try {
      let score = 0;
      const details = {};

      // Check generator script
      const generatorPath = path.join(this.projectRoot, 'scripts', 'build', 'generate_from_catalog.mjs');
      if (fs.existsSync(generatorPath)) {
        score += 50;
        details.generator = 'present';
        console.log('    ✅ Generator script: Found');
      } else {
        console.log('    ❌ Generator script: Not found');
      }

      // Check build scripts
      const buildScripts = [
        'scripts/build/merge_driver_compose.mjs'
      ];

      let buildScriptsPresent = 0;
      for (const script of buildScripts) {
        if (fs.existsSync(path.join(this.projectRoot, script))) {
          buildScriptsPresent++;
        }
      }

      if (buildScriptsPresent === buildScripts.length) {
        score += 50;
        details.buildScripts = 'complete';
      }

      this.qualityResults.gates.generation = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`  ✅ Generation Quality: ${score}/100`);
      
    } catch (error) {
      this.qualityResults.gates.generation = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('  ❌ Generation Quality: Failed');
    }
  }

  /**
   * Check documentation quality
   */
  async checkDocumentationQuality() {
    console.log('📚 Checking Documentation Quality...');
    
    try {
      let score = 0;
      const details = {};

      // Check README
      const readmePath = path.join(this.projectRoot, 'README.md');
      if (fs.existsSync(readmePath)) {
        score += 25;
        details.readme = 'present';
      }

      // Check CHANGELOG
      const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        score += 25;
        details.changelog = 'present';
      }

      // Check package.json
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageData.scripts && Object.keys(packageData.scripts).length > 0) {
          score += 25;
          details.packageScripts = 'complete';
        }
      }

      // Check app.json
      const appPath = path.join(this.projectRoot, 'app.json');
      if (fs.existsSync(appPath)) {
        const appData = JSON.parse(fs.readFileSync(appPath, 'utf8'));
        if (appData.sdk === 3 && appData.compatibility) {
          score += 25;
          details.appConfig = 'valid';
        }
      }

      this.qualityResults.gates.documentation = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`  ✅ Documentation Quality: ${score}/100`);
      
    } catch (error) {
      this.qualityResults.gates.documentation = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('  ❌ Documentation Quality: Failed');
    }
  }

  /**
   * Calculate overall quality
   */
  calculateOverallQuality() {
    console.log('\n📊 Calculating Overall Quality...');
    
    let totalScore = 0;
    let gateCount = 0;

    for (const gate of Object.values(this.qualityResults.gates)) {
      totalScore += gate.score;
      gateCount++;
    }

    const overallScore = Math.round(totalScore / gateCount);
    
    // Determine overall status
    if (overallScore >= 80) {
      this.qualityResults.overall = 'passed';
    } else if (overallScore >= 60) {
      this.qualityResults.overall = 'warning';
    } else {
      this.qualityResults.overall = 'failed';
    }

    this.qualityResults.score = overallScore;
    console.log(`  ✅ Overall Quality: ${overallScore}/100`);
  }

  /**
   * Generate quality report
   */
  async generateQualityReport() {
    console.log('\n📋 Generating Quality Report...');
    
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsPath)) {
        fs.mkdirSync(this.reportsPath, { recursive: true });
      }

      const reportPath = path.join(this.reportsPath, `quality-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(this.qualityResults, null, 2));
      
      // Also save latest report
      const latestPath = path.join(this.reportsPath, 'quality-report-latest.json');
      fs.writeFileSync(latestPath, JSON.stringify(this.qualityResults, null, 2));
      
      console.log(`  ✅ Report saved: ${reportPath}`);
      console.log(`  ✅ Latest report: ${latestPath}`);
      
    } catch (error) {
      throw new Error(`Failed to save quality report: ${error.message}`);
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n🚪 QUALITY GATES RESULTS');
    console.log('========================');
    console.log(`🎯 Overall Status: ${this.qualityResults.overall.toUpperCase()}`);
    console.log(`📈 Overall Score: ${this.qualityResults.score}/100`);
    console.log(`📅 Generated: ${new Date(this.qualityResults.timestamp).toLocaleString()}`);
    console.log(`🏷️  Version: ${this.qualityResults.version}`);
    console.log('');
    
    for (const [gateName, gate] of Object.entries(this.qualityResults.gates)) {
      const statusIcon = gate.status === 'passed' ? '✅' : gate.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${gateName.toUpperCase()}: ${gate.score}/100 (${gate.status})`);
    }

    console.log('');
    if (this.qualityResults.overall === 'passed') {
      console.log('🎉 All quality gates passed! Project meets production standards.');
    } else if (this.qualityResults.overall === 'warning') {
      console.log('⚠️  Some quality gates have warnings. Review the details above.');
    } else {
      console.log('❌ Some quality gates failed. Fix the issues before proceeding.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const qualityGates = new QualityGates();
  qualityGates.runQualityCheck()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = QualityGates;
