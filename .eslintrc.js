module.exports = {
  extends: ['@athombv/eslint-config-homey', 'prettier'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'no-unused-vars': ['error', { args: 'none' }],
    'require-await': 'error',
    'no-await-in-loop': 'error',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-promise-executor-return': 'error',
    'no-unsafe-optional-chaining': 'error',
    'require-atomic-updates': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
  },
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
};
