module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
    }],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-transform-runtime',
  ],
  ignore: [
    'node_modules',
    'coverage',
    'dist',
    'build',
    '**/*.test.js',
    '**/__tests__',
    '**/__mocks__',
  ],
};
