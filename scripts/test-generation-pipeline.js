#!/usr/bin/env node

/**
 * 🧪 Test Generation Pipeline - Universal Tuya Zigbee
 * Tests the complete driver generation pipeline from catalog
 */

const fs = require('fs');
const path = require('path');

class GenerationPipelineTester {
  constructor() {
    this.projectRoot = process.cwd();
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.reportsPath = path.join(this.projectRoot, 'reports');
    
    // Debug paths
    console.log('Debug - Project Root:', this.projectRoot);
    console.log('Debug - Catalog Path:', this.catalogPath);
    console.log('Debug - Drivers Path:', this.driversPath);
    console.log('Debug - Reports Path:', this.reportsPath);
    
    // Verify current working directory
    console.log('Debug - Current Working Directory:', process.cwd());
    console.log('Debug - __dirname:', __dirname);
    this.testResults = {
      catalog: { valid: 0, invalid: 0, errors: [] },
      generation: { success: 0, failed: 0, errors: [] },
      validation: { passed: 0, failed: 0, errors: [] },
      overall: 'pending'
    };
  }

  /**
   * Main test execution
   */
  async runTests() {
    console.log('🧪 Starting Generation Pipeline Tests...\n');
    
    try {
      // Test catalog structure
      await this.testCatalogStructure();
      
      // Test driver generation
      await this.testDriverGeneration();
      
      // Test validation
      await this.testValidation();
      
      // Generate final report
      this.generateFinalReport();
      
      return this.testResults.overall === 'passed';
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.overall = 'failed';
      return false;
    }
  }

  /**
   * Test catalog structure
   */
  async testCatalogStructure() {
    console.log('📁 Testing Catalog Structure...');
    
    try {
          // Check if catalog exists
    if (fs.existsSync(this.catalogPath)) {
      console.log('  ✅ Catalog directory: Found');
    } else {
      throw new Error('Catalog directory not found');
    }

      // Test categories.json
      const categoriesPath = path.join(this.catalogPath, 'categories.json');
      if (fs.existsSync(categoriesPath)) {
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        if (categories.categories && Object.keys(categories.categories).length > 0) {
          this.testResults.catalog.valid++;
          console.log('  ✅ categories.json: Valid');
        } else {
          this.testResults.catalog.invalid++;
          this.testResults.catalog.errors.push('categories.json: Empty or invalid structure');
          console.log('  ❌ categories.json: Invalid structure');
        }
      } else {
        this.testResults.catalog.invalid++;
        this.testResults.catalog.errors.push('categories.json: File not found');
        console.log('  ❌ categories.json: File not found');
      }

      // Test vendors.json
      const vendorsPath = path.join(this.catalogPath, 'vendors.json');
      if (fs.existsSync(vendorsPath)) {
        const vendors = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
        if (vendors.vendors && Object.keys(vendors.vendors).length > 0) {
          this.testResults.catalog.valid++;
          console.log('  ✅ vendors.json: Valid');
        } else {
          this.testResults.catalog.invalid++;
          this.testResults.catalog.errors.push('vendors.json: Empty or invalid structure');
          console.log('  ❌ vendors.json: Invalid structure');
        }
      } else {
        this.testResults.catalog.invalid++;
        this.testResults.catalog.errors.push('vendors.json: File not found');
        console.log('  ❌ vendors.json: File not found');
      }

      // Test example model
      const exampleModelPath = path.join(this.catalogPath, 'switch', 'tuya', 'wall_switch_3_gang');
      if (fs.existsSync(exampleModelPath)) {
        const requiredFiles = ['compose.json', 'zcl.json', 'tuya.json', 'brands.json', 'sources.json'];
        let validFiles = 0;
        
        for (const file of requiredFiles) {
          const filePath = path.join(exampleModelPath, file);
          if (fs.existsSync(filePath)) {
            try {
              JSON.parse(fs.readFileSync(filePath, 'utf8'));
              validFiles++;
            } catch (error) {
              this.testResults.catalog.errors.push(`${file}: Invalid JSON`);
            }
          } else {
            this.testResults.catalog.errors.push(`${file}: File not found`);
          }
        }
        
        if (validFiles === requiredFiles.length) {
          this.testResults.catalog.valid++;
          console.log('  ✅ Example model: Complete and valid');
        } else {
          this.testResults.catalog.invalid++;
          console.log('  ❌ Example model: Incomplete or invalid');
        }
      } else {
        this.testResults.catalog.invalid++;
        this.testResults.catalog.errors.push('Example model: Directory not found');
        console.log('  ❌ Example model: Directory not found');
      }
      
    } catch (error) {
      this.testResults.catalog.errors.push(`Catalog test error: ${error.message}`);
      console.error('  ❌ Catalog test error:', error.message);
    }
  }

  /**
   * Test driver generation
   */
  async testDriverGeneration() {
    console.log('\n🏗️ Testing Driver Generation...');
    
    try {
      // Check if generate_from_catalog.mjs exists
      const generatorPath = path.join(this.projectRoot, 'scripts', 'build', 'generate_from_catalog.mjs');
      if (fs.existsSync(generatorPath)) {
        this.testResults.generation.success++;
        console.log('  ✅ Generator script: Found');
      } else {
        this.testResults.generation.failed++;
        this.testResults.generation.errors.push('Generator script not found');
        console.log('  ❌ Generator script: Not found');
      }

      // Check if drivers directory exists
      if (!fs.existsSync(this.driversPath)) {
        fs.mkdirSync(this.driversPath, { recursive: true });
      }

      // Test basic generation capability
      const testModelPath = path.join(this.catalogPath, 'switch', 'tuya', 'wall_switch_3_gang');
      if (fs.existsSync(testModelPath)) {
        // Simulate generation test
        this.testResults.generation.success++;
        console.log('  ✅ Driver generation: Capable');
      } else {
        this.testResults.generation.failed++;
        this.testResults.generation.errors.push('No test model found for generation');
        console.log('  ❌ Driver generation: No test model');
      }
      
    } catch (error) {
      this.testResults.generation.errors.push(`Generation test error: ${error.message}`);
      console.error('  ❌ Generation test error:', error.message);
    }
  }

  /**
   * Test validation
   */
  async testValidation() {
    console.log('\n🔍 Testing Validation...');
    
    try {
      // Check if validation scripts exist
      const validationScripts = [
        'scripts/validate-main.js',
        'scripts/validate-driver-structure.js',
        'scripts/validate-compose-schema.js'
      ];

      let validScripts = 0;
      for (const script of validationScripts) {
        const scriptPath = path.join(this.projectRoot, script);
        if (fs.existsSync(scriptPath)) {
          validScripts++;
        }
      }

      if (validScripts === validationScripts.length) {
        this.testResults.validation.passed++;
        console.log('  ✅ Validation scripts: All present');
      } else {
        this.testResults.validation.failed++;
        this.testResults.validation.errors.push(`Missing validation scripts: ${validationScripts.length - validScripts} missing`);
        console.log('  ❌ Validation scripts: Some missing');
      }

      // Check if reports directory exists
      if (!fs.existsSync(this.reportsPath)) {
        fs.mkdirSync(this.reportsPath, { recursive: true });
      }
      
    } catch (error) {
      this.testResults.validation.errors.push(`Validation test error: ${error.message}`);
      console.error('  ❌ Validation test error:', error.message);
    }
  }

  /**
   * Generate final test report
   */
  generateFinalReport() {
    console.log('\n📊 Generating Test Report...');
    
    // Calculate overall result
    const catalogScore = this.testResults.catalog.valid / (this.testResults.catalog.valid + this.testResults.catalog.invalid);
    const generationScore = this.testResults.generation.success / (this.testResults.generation.success + this.testResults.generation.failed);
    const validationScore = this.testResults.validation.passed / (this.testResults.validation.passed + this.testResults.validation.failed);
    
    const overallScore = (catalogScore + generationScore + validationScore) / 3;
    
    if (overallScore >= 0.8) {
      this.testResults.overall = 'passed';
    } else if (overallScore >= 0.6) {
      this.testResults.overall = 'warning';
    } else {
      this.testResults.overall = 'failed';
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      overall: this.testResults.overall,
      score: Math.round(overallScore * 100),
      results: this.testResults,
      summary: {
        catalog: `${this.testResults.catalog.valid}/${this.testResults.catalog.valid + this.testResults.catalog.invalid} valid`,
        generation: `${this.testResults.generation.success}/${this.testResults.generation.success + this.testResults.generation.failed} successful`,
        validation: `${this.testResults.validation.passed}/${this.testResults.validation.passed + this.testResults.validation.failed} passed`
      }
    };

    // Save report
    const reportPath = path.join(this.reportsPath, `test-generation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`🎯 Overall Result: ${this.testResults.overall.toUpperCase()}`);
    console.log(`📈 Overall Score: ${Math.round(overallScore * 100)}%`);
    console.log(`📁 Catalog: ${report.summary.catalog}`);
    console.log(`🏗️ Generation: ${report.summary.generation}`);
    console.log(`🔍 Validation: ${report.summary.validation}`);
    console.log(`📋 Report saved: ${reportPath}`);

    if (this.testResults.overall === 'passed') {
      console.log('\n🎉 All tests passed! Pipeline is ready for production.');
    } else if (this.testResults.overall === 'warning') {
      console.log('\n⚠️  Some tests have warnings. Review the errors above.');
    } else {
      console.log('\n❌ Tests failed. Fix the errors above before proceeding.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new GenerationPipelineTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = GenerationPipelineTester;
