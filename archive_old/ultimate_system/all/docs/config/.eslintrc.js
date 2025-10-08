module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
    jest: true,
    browser: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'plugin:security/recommended',
    'plugin:sonarjs/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      modules: true
    },
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'import',
    'security',
    'unicorn',
    'promise',
    'sonarjs',
    'deprecation',
    'jsdoc'
  ],
  settings: {
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts']
      },
      alias: {
        map: [
          ['@app', './src/app'],
          ['@drivers', './src/drivers'],
          ['@common', './src/common'],
          ['@lib', './src/lib'],
          ['@utils', './src/utils'],
          ['@test', './test']
        ],
        extensions: ['.ts', '.js', '.json']
      }
    },
    react: {
      version: 'detect'
    }
  },
  rules: {
    // Base rules
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'no-console': 'warn',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-multi-spaces': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    'comma-dangle': ['error', 'only-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'array-bracket-newline': ['error', 'consistent'],
    'object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
    'array-element-newline': ['error', 'consistent'],

    // Best practices
    'array-callback-return': ['error', { allowImplicit: true }],
    'block-scoped-var': 'error',
    'class-methods-use-this': ['warn', { exceptMethods: [] }],
    'consistent-return': ['error', { treatUndefinedAsUnspecified: false }],
    'default-case': ['error', { commentPattern: '^no default$' }],
    'default-case-last': 'error',
    'default-param-last': 'error',
    'dot-location': ['error', 'property'],
    'dot-notation': ['error', { allowKeywords: true, allowPattern: '^[a-z]+(_[a-z]+)+$' }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'grouped-accessor-pairs': ['error', 'getBeforeSet'],
    'no-alert': 'warn',
    'no-caller': 'error',
    'no-else-return': 'error',
    'no-empty-function': ['error', { allow: ['arrowFunctions', 'functions', 'methods'] }],
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': 'error',
    'no-implied-eval': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-str': 'error',
    'no-new': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'error',
    'no-proto': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'prefer-named-capture-group': 'warn',
    'prefer-promise-reject-errors': 'error',
    'prefer-regex-literals': 'error',
    radix: 'error',
    'require-await': 'error',
    'require-unicode-regexp': 'warn',
    'vars-on-top': 'error',
    yoda: 'error',

    // Variables
    'no-shadow': 'error',
    'no-shadow-restricted-names': 'error',
    'no-undef-init': 'error',
    'no-undefined': 'off',
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

    // Stylistic Issues
    'array-bracket-newline': ['error', 'consistent'],
    'array-element-newline': ['error', 'consistent'],
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'comma-spacing': ['error', { before: false, after: true }],
    'comma-style': ['error', 'last'],
    'computed-property-spacing': ['error', 'never'],
    'eol-last': ['error', 'always'],
    'func-call-spacing': ['error', 'never'],
    'function-call-argument-newline': ['error', 'consistent'],
    'function-paren-newline': ['error', 'consistent'],
    'implicit-arrow-linebreak': ['error', 'beside'],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'keyword-spacing': ['error', { before: true, after: true }],
    'lines-around-comment': [
      'error',
      { beforeBlockComment: true, afterBlockComment: false, beforeLineComment: true, afterLineComment: false }
    ],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'max-len': [
      'error',
      {
        code: 120,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreComments: false,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }
    ],
    'max-statements-per-line': ['error', { max: 2 }],
    'multiline-ternary': ['error', 'always-multiline'],
    'new-cap': ['error', { newIsCap: true, capIsNew: false, properties: true }],
    'new-parens': 'error',
    'newline-per-chained-call': ['error', { ignoreChainWithDepth: 3 }],
    'no-array-constructor': 'error',
    'no-bitwise': 'error',
    'no-lonely-if': 'error',
    'no-mixed-operators': 'error',
    'no-multi-assign': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    'no-nested-ternary': 'error',
    'no-new-object': 'error',
    'no-plusplus': 'off',
    'no-tabs': 'error',
    'no-underscore-dangle': 'off',
    'no-unneeded-ternary': 'error',
    'no-whitespace-before-property': 'error',
    'nonblock-statement-body-position': ['error', 'beside'],
    'object-curly-newline': ['error', { consistent: true }],
    'object-curly-spacing': ['error', 'always'],
    'one-var': ['error', 'never'],
    'one-var-declaration-per-line': ['error', 'initializations'],
    'operator-assignment': ['error', 'always'],
    'operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
    'padded-blocks': ['error', 'never'],
    'prefer-object-spread': 'error',
    'quote-props': ['error', 'as-needed'],
    'semi-spacing': 'error',
    'semi-style': ['error', 'last'],
    'space-before-blocks': 'error',
    'space-before-function-paren': [
      'error',
      { anonymous: 'always', named: 'never', asyncArrow: 'always' }
    ],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': ['error', { words: true, nonwords: false }],
    'spaced-comment': ['error', 'always', { line: { markers: ['/'] } }],
    'switch-colon-spacing': 'error',
    'template-tag-spacing': 'error',
    'unicode-bom': 'error',
    'wrap-regex': 'error',

    // ECMAScript 6
    'arrow-body-style': ['error', 'as-needed'],
    'arrow-parens': ['error', 'as-needed'],
    'arrow-spacing': 'error',
    'constructor-super': 'error',
    'generator-star-spacing': ['error', { before: false, after: true }],
    'no-class-assign': 'error',
    'no-confusing-arrow': 'error',
    'no-const-assign': 'error',
    'no-dupe-class-members': 'error',
    'no-duplicate-imports': 'error',
    'no-new-symbol': 'error',
    'no-this-before-super': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': ['error', { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false }],
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    'prefer-numeric-literals': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'require-yield': 'error',
    'rest-spread-spacing': ['error', 'never'],
    'sort-imports': [
      'warn',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
      }
    ],
    'symbol-description': 'error',
    'template-curly-spacing': ['error', 'never'],
    'yield-star-spacing': ['error', { before: false, after: true }]
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
      env: {
        mocha: true,
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off',
        'no-magic-numbers': 'off'
      }
    },
    {
      files: ['**/*.jsx'],
      rules: {
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error'
      }
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint'
      ],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.nyc_output/',
    '*.min.js',
    '*.min.js.map',
    '*.d.ts',
    '!.eslintrc.js',
    '!.prettierrc.js',
    '!.babelrc.js',
    '!.storybook',
    'docs/',
    'temp/'
  ]
};
