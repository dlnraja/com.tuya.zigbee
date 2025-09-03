// test_suite.js
const { runCompleteTestSuite } = require('./lib/test_runner');

async function executeFullTestSuite() {
  const results = await runCompleteTestSuite({
    unit_tests: true,
    integration_tests: true,
    validation_tests: true,
    performance_tests: true,
    coverage: {
      enabled: true,
      threshold: 80
    },
    reports: {
      format: 'html',
      output: './test_reports/'
    }
  });

  return results;
}

executeFullTestSuite().then(console.log).catch(console.error);
