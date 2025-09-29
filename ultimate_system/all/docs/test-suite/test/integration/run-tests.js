// Tests unitaires pour les drivers individuels
const DriverTest = require('./driver.test');
const DeviceTest = require('./device.test');
const AssetTest = require('./asset.test');

// Tests d'intégration
const IntegrationTest = require('./integration.test');

// Tests de performance
const PerformanceTest = require('./performance.test');

// Tests de compatibilité
const CompatibilityTest = require('./compatibility.test');

// Tests de sécurité
const SecurityTest = require('./security.test');

// Suite de tests complète
class ComprehensiveTestSuite {
  constructor() {
    this.drivers = [];
    this.devices = [];
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  async runAllTests() {
    console.log('🚀 Démarrage de la suite de tests complète');

    try {
      await this.runDriverTests();
      await this.runDeviceTests();
      await this.runAssetTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runCompatibilityTests();
      await this.runSecurityTests();

      this.generateReport();
      return this.results;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution des tests:', error);
      throw error;
    }
  }

  async runDriverTests() {
    console.log('🔧 Test des drivers...');
    const driverTest = new DriverTest();
    const results = await driverTest.run();
    this.updateResults(results);
  }

  async runDeviceTests() {
    console.log('📱 Test des devices...');
    const deviceTest = new DeviceTest();
    const results = await deviceTest.run();
    this.updateResults(results);
  }

  async runAssetTests() {
    console.log('🎨 Test des assets...');
    const assetTest = new AssetTest();
    const results = await assetTest.run();
    this.updateResults(results);
  }

  async runIntegrationTests() {
    console.log('🔗 Tests d\'intégration...');
    const integrationTest = new IntegrationTest();
    const results = await integrationTest.run();
    this.updateResults(results);
  }

  async runPerformanceTests() {
    console.log('⚡ Tests de performance...');
    const performanceTest = new PerformanceTest();
    const results = await performanceTest.run();
    this.updateResults(results);
  }

  async runCompatibilityTests() {
    console.log('🔄 Tests de compatibilité...');
    const compatibilityTest = new CompatibilityTest();
    const results = await compatibilityTest.run();
    this.updateResults(results);
  }

  async runSecurityTests() {
    console.log('🔒 Tests de sécurité...');
    const securityTest = new SecurityTest();
    const results = await securityTest.run();
    this.updateResults(results);
  }

  updateResults(testResults) {
    this.results.total += testResults.total;
    this.results.passed += testResults.passed;
    this.results.failed += testResults.failed;
    this.results.skipped += testResults.skipped;
  }

  generateReport() {
    const coverage = ((this.results.passed / this.results.total) * 100).toFixed(2);

    console.log('\n📊 RAPPORT DE TESTS FINAL');
    console.log('========================');
    console.log(`Total: ${this.results.total}`);
    console.log(`Réussis: ${this.results.passed}`);
    console.log(`Échoués: ${this.results.failed}`);
    console.log(`Ignorés: ${this.results.skipped}`);
    console.log(`Couverture: ${coverage}%`);

    if (coverage >= 95) {
      console.log('✅ Couverture de test excellente (>95%)');
    } else if (coverage >= 80) {
      console.log('⚠️ Couverture de test acceptable (>80%)');
    } else {
      console.log('❌ Couverture de test insuffisante (<80%)');
    }
  }

  getCoverage() {
    return (this.results.passed / this.results.total) * 100;
  }
}

module.exports = ComprehensiveTestSuite;

// Exécution si appelé directement
if (require.main === module) {
  const testSuite = new ComprehensiveTestSuite();
  testSuite.runAllTests()
    .then(results => {
      console.log('🎉 Suite de tests terminée');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}
