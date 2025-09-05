const ComprehensiveTestSuite = require('./run-tests');

describe('Ultimate Zigbee Homey Integration - Complete Test Suite', () => {
  let testSuite;

  before(() => {
    testSuite = new ComprehensiveTestSuite();
  });

  it('should run complete test suite', async function() {
    this.timeout(60000); // 60 seconds timeout

    const results = await testSuite.runAllTests();

    // Assertions
    expect(results).to.be.an('object');
    expect(results).to.have.property('total');
    expect(results).to.have.property('passed');
    expect(results).to.have.property('failed');
    expect(results).to.have.property('skipped');

    // Coverage check
    const coverage = testSuite.getCoverage();
    expect(coverage).to.be.at.least(80); // Minimum 80% coverage
  });

  it('should have high test coverage', () => {
    const coverage = testSuite.getCoverage();
    expect(coverage).to.be.at.least(90); // Target 90% coverage
  });

  it('should have no critical failures', async () => {
    const results = await testSuite.runAllTests();
    expect(results.failed).to.equal(0); // No failures allowed
  });
});
