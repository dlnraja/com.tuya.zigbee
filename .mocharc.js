module.exports = {
  require: ['ts-node/register', 'tsconfig-paths/register'],
  extension: ['ts', 'js'],
  recursive: true,
  timeout: 10000,
  exit: true,
  color: true,
  spec: [
    'test/unit/**/*.test.{js,ts}',
    'test/integration/**/*.test.{js,ts}'
  ],
  ignore: [
    'node_modules/**',
    '**/node_modules/**',
    '**/test/e2e/**',
    '**/test/tests/**' // Ignorer l'ancienne structure de tests
  ]
};
