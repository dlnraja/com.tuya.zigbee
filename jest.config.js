module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js', '**/tests/**/*.test.js'],
  moduleNameMapper: {
    '^homey-zigbeedriver$': '<rootDir>/tests/mocks/homey-zigbeedriver.js'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000
};
