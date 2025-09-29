module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Chemins des fichiers de test
  roots: [
    '<rootDir>/drivers',
    '<rootDir>/scripts',
    '<rootDir>/tests'
  ],
  
  // Fichiers de test à inclure
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/test/**/*.test.js',
    '**/tests/**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.homey*/**',
    '!**/.github/**',
    '!**/mocks/**'
  ],
  
  // Configuration des modules
  moduleNameMapper: {
    '^homey$': '<rootDir>/tests/mocks/homey.js',
    '^homey-zigbeedriver$': '<rootDir>/tests/mocks/homey-zigbeedriver.js',
    '^zigbee-clusters$': '<rootDir>/tests/mocks/zigbee-clusters.js',
    '^fs-extra$': '<rootDir>/tests/mocks/fs-extra.js',
    '^homey-log$': '<rootDir>/tests/mocks/homey-log.js'
  },
  
  // Configuration de la couverture de code
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'drivers/**/*.js',
    'scripts/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/tests/**',
    '!**/mocks/**',
    '!**/coverage/**',
    '!**/.homey*/**',
    '!**/.github/**',
    '!**/docs/**',
    '!**/examples/**',
    '!**/templates/**',
    '!**/types/**',
    '!**/webpack.config.js',
    '!**/jest.config.js',
    '!**/babel.config.js',
    '!**/eslintrc.js',
    '!**/prettierrc.js'
  ],
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './drivers/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './scripts/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Configuration des rapports de couverture
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover',
    'text-summary',
    'cobertura'
  ],
  
  // Configuration des tests
  testTimeout: 15000, // 15 secondes
  verbose: true,
  bail: false,
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  
  // Setup et teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Transformation des fichiers
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignorer les dossiers
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/.homey*/',
    '<rootDir>/.github/'
  ]
};
