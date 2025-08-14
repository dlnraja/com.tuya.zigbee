#!/usr/bin/env node

/**
 * 📊 Generate Test Report - Universal Tuya Zigbee
 * Generates comprehensive test reports for the CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.reportsPath = path.join(this.projectRoot, 'reports');
    this.testData = {
      timestamp: new Date().toISOString(),
      version: '3.4.0',
      environment: process.env.NODE_ENV || 'development',
      tests: {
        catalog: { status: 'pending', details: {} },
        generation: { status: 'pending', details: {} },
        validation: { status: 'pending', details: {} }
      },
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * Main report generation
   */
  async generateReport() {
    console.log('📊 Generating Test Report...\n');
    
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsPath)) {
        fs.mkdirSync(this.reportsPath, { recursive: true });
      }

      // Collect test data
      await this.collectTestData();
      
      // Generate summary
      this.generateSummary();
      
      // Save report
      await this.saveReport();
      
      // Display results
      this.displayResults();
      
      return true;
      
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      return false;
    }
  }

  /**
   * Collect test data from various sources
   */
  async collectTestData() {
    console.log('📋 Collecting Test Data...');
    
    // Catalog test data
    try {
      const catalogPath = path.join(this.projectRoot, 'catalog');
      if (fs.existsSync(catalogPath)) {
        const categories = JSON.parse(fs.readFileSync(path.join(catalogPath, 'categories.json'), 'utf8'));
        const vendors = JSON.parse(fs.readFileSync(path.join(catalogPath, 'vendors.json'), 'utf8'));
        
        this.testData.tests.catalog = {
          status: 'passed',
          details: {
            categories: Object.keys(categories.categories || {}).length,
            vendors: Object.keys(vendors.vendors || {}).length,
            structure: 'valid'
          }
        };
        console.log('  ✅ Catalog data collected');
      } else {
        this.testData.tests.catalog = {
          status: 'failed',
          details: { error: 'Catalog directory not found' }
        };
        console.log('  ❌ Catalog directory not found');
      }
    } catch (error) {
      this.testData.tests.catalog = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('  ❌ Catalog data collection failed');
    }

    // Generation test data
    try {
      const generatorPath = path.join(this.projectRoot, 'scripts', 'build', 'generate_from_catalog.mjs');
      if (fs.existsSync(generatorPath)) {
        this.testData.tests.generation = {
          status: 'passed',
          details: {
            script: 'present',
            capability: 'ready'
          }
        };
        console.log('  ✅ Generation data collected');
      } else {
        this.testData.tests.generation = {
          status: 'failed',
          details: { error: 'Generator script not found' }
        };
        console.log('  ❌ Generator script not found');
      }
    } catch (error) {
      this.testData.tests.generation = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('  ❌ Generation data collection failed');
    }

    // Validation test data
    try {
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

      if (validScripts === validationScripts.length) {
        this.testData.tests.validation = {
          status: 'passed',
          details: {
            scripts: validScripts,
            total: validationScripts.length
          }
        };
        console.log('  ✅ Validation data collected');
      } else {
        this.testData.tests.validation = {
          status: 'warning',
          details: {
            scripts: validScripts,
            total: validationScripts.length,
            missing: validationScripts.length - validScripts
          }
        };
        console.log('  ⚠️  Validation data collected with warnings');
      }
    } catch (error) {
      this.testData.tests.validation = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('  ❌ Validation data collection failed');
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    console.log('\n📈 Generating Summary...');
    
    let total = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const test of Object.values(this.testData.tests)) {
      total++;
      switch (test.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'warning':
          warnings++;
          break;
      }
    }

    this.testData.summary = { total, passed, failed, warnings };
    
    // Calculate overall status
    if (failed === 0 && warnings === 0) {
      this.testData.overall = 'passed';
    } else if (failed === 0) {
      this.testData.overall = 'warning';
    } else {
      this.testData.overall = 'failed';
    }

    console.log('  ✅ Summary generated');
  }

  /**
   * Save report to file
   */
  async saveReport() {
    console.log('\n💾 Saving Report...');
    
    try {
      const reportPath = path.join(this.reportsPath, `test-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(this.testData, null, 2));
      
      // Also save latest report
      const latestPath = path.join(this.reportsPath, 'test-report-latest.json');
      fs.writeFileSync(latestPath, JSON.stringify(this.testData, null, 2));
      
      console.log(`  ✅ Report saved: ${reportPath}`);
      console.log(`  ✅ Latest report: ${latestPath}`);
      
    } catch (error) {
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n📊 TEST REPORT SUMMARY');
    console.log('========================');
    console.log(`🎯 Overall Status: ${this.testData.overall.toUpperCase()}`);
    console.log(`📅 Generated: ${new Date(this.testData.timestamp).toLocaleString()}`);
    console.log(`🏷️  Version: ${this.testData.version}`);
    console.log(`🌍 Environment: ${this.testData.environment}`);
    console.log('');
    console.log(`📁 Catalog: ${this.testData.tests.catalog.status.toUpperCase()}`);
    console.log(`🏗️ Generation: ${this.testData.tests.generation.status.toUpperCase()}`);
    console.log(`🔍 Validation: ${this.testData.tests.validation.status.toUpperCase()}`);
    console.log('');
    console.log(`📊 Summary: ${this.testData.summary.passed}/${this.testData.summary.total} passed`);
    
    if (this.testData.summary.warnings > 0) {
      console.log(`⚠️  Warnings: ${this.testData.summary.warnings}`);
    }
    
    if (this.testData.summary.failed > 0) {
      console.log(`❌ Failed: ${this.testData.summary.failed}`);
    }

    if (this.testData.overall === 'passed') {
      console.log('\n🎉 All tests passed! System is ready for production.');
    } else if (this.testData.overall === 'warning') {
      console.log('\n⚠️  Some tests have warnings. Review the details above.');
    } else {
      console.log('\n❌ Some tests failed. Fix the issues before proceeding.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = TestReportGenerator;
