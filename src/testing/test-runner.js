const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }
  
  addTest(testName, testFunction) {
    this.tests.push({ name: testName, fn: testFunction });
  }
  
  async runTests() {
    console.log('🧪 Démarrage des tests...');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.push({ name: test.name, status: 'PASSED' });
        console.log(`✅ ${test.name} - PASSED`);
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAILED', error: error.message });
        console.log(`❌ ${test.name} - FAILED: ${error.message}`);
      }
    }
    
    this.generateReport();
  }
  
  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    
    console.log(`\n📊 RAPPORT DES TESTS`);
    console.log(`========================`);
    console.log(`✅ Tests réussis: ${passed}`);
    console.log(`❌ Tests échoués: ${failed}`);
    console.log(`📈 Taux de succès: ${((passed / this.tests.length) * 100).toFixed(2)}%`);
  }
}

module.exports = TestRunner;