module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['lib/tuya-engine/**/*.js'],
  modulePathIgnorePatterns: [
    '<rootDir>/tmp/',
    '<rootDir>/data/temp_desktop_cleanup/',
    '<rootDir>/.homeybuild/',
    '<rootDir>/.github/pages-build/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/critical/manufacturerResolver.test.js',
  ],
};

