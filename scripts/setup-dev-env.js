#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify fs methods
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

// Configuration
const CONFIG = {
  requiredNodeVersion: '>=16.0.0',
  requiredNpmVersion: '>=7.0.0',
  devDependencies: [
    'jest@^29.0.0',
    'eslint@^8.0.0',
    'prettier@^3.0.0',
    'husky@^8.0.0',
    'lint-staged@^13.0.0',
    'cross-env@^7.0.0',
    'nodemon@^3.0.0',
    'nyc@^15.0.0',
    'supertest@^6.0.0',
    'nock@^13.0.0',
    'faker@^6.0.0',
    'uuid@^9.0.0',
    'winston@^3.0.0',
    'winston-daily-rotate-file@^4.0.0',
    'commander@^10.0.0',
    'chalk@^5.0.0',
    'inquirer@^9.0.0',
    'ora@^6.0.0',
    'figlet@^1.0.0',
    'yaml@^2.0.0',
    'dotenv@^16.0.0',
    'debug@^4.0.0',
    'cross-spawn@^7.0.0',
    'semver@^7.0.0',
    'simple-git@^3.0.0',
    'glob@^8.0.0',
    'rimraf@^4.0.0',
    'mkdirp@^1.0.0',
    'fs-extra@^10.0.0',
    'json5@^2.0.0',
    'js-yaml@^4.0.0',
    'ajv@^8.0.0',
    'ajv-formats@^3.0.0',
    'ajv-keywords@^5.0.0',
    'ajv-errors@^3.0.0',
    'eslint-plugin-jest',
    'eslint-plugin-prettier',
    'eslint-plugin-node',
    'eslint-plugin-import',
    'eslint-plugin-jsdoc',
    'eslint-plugin-promise',
    'eslint-config-prettier',
    'eslint-config-standard',
    'eslint-plugin-standard',
    'eslint-plugin-security',
    'eslint-plugin-sonarjs',
    'eslint-plugin-unicorn',
    'eslint-plugin-you-dont-need-lodash-underscore',
    'prettier-plugin-jsdoc',
    'prettier-plugin-packagejson',
    'prettier-plugin-sh',
    'prettier-plugin-sort-json',
    'prettier-plugin-sql',
    'prettier-plugin-toml',
    'prettier-plugin-xml',
    'prettier-plugin-yaml'
  ],
  projectStructure: {
    dirs: [
      'src',
      'src/services',
      'src/drivers',
      'src/utils',
      'src/config',
      'test',
      'test/unit',
      'test/integration',
      'test/e2e',
      'test/fixtures',
      'test/mocks',
      'scripts',
      'docs',
      'docs/api',
      'docs/guides',
      'docs/images',
      '.github',
      '.github/workflows',
      '.vscode'
    ],
    files: [
      '.editorconfig',
      '.eslintrc.js',
      '.eslintignore',
      '.prettierrc',
      '.prettierignore',
      '.gitignore',
      '.gitattributes',
      '.nvmrc',
      '.npmrc',
      'jest.config.js',
      'jsconfig.json',
      'tsconfig.json',
      'README.md',
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md',
      'CHANGELOG.md',
      'LICENSE',
      '.env.example',
      '.env.test'
    ]
  },
  vscodeSettings: {
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': true
    },
    'eslint.validate': ['javascript', 'javascriptreact'],
    'files.autoSave': 'onFocusChange',
    'files.exclude': {
      '**/.git': true,
      '**/.DS_Store': true,
      '**/node_modules': true,
      '**/dist': true,
      '**/coverage': true
    },
    'search.exclude': {
      '**/node_modules': true,
      '**/dist': true,
      '**/coverage': true
    },
    'javascript.updateImportsOnFileMove.enabled': 'always',
    'typescript.updateImportsOnFileMove.enabled': 'always',
    'editor.tabSize': 2,
    'editor.detectIndentation': false,
    'editor.insertSpaces': true,
    'files.trimTrailingWhitespace': true,
    'files.insertFinalNewline': true,
    'files.trimFinalNewlines': true
  }
};

// Utility functions
const exec = (command, options = {}) => {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    process.exit(1);
  }
};

const checkNodeVersion = () => {
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  
  const semver = require('semver');
  if (!semver.satisfies(nodeVersion, CONFIG.requiredNodeVersion)) {
    console.error(`Error: This project requires Node.js ${CONFIG.requiredNodeVersion}`);
    process.exit(1);
  }
};

const checkNpmVersion = () => {
  try {
    const npmVersion = exec('npm -v', { stdio: 'pipe' }).toString().trim();
    console.log(`npm version: ${npmVersion}`);
    
    const semver = require('semver');
    if (!semver.satisfies(npmVersion, CONFIG.requiredNpmVersion)) {
      console.warn(`Warning: This project works best with npm ${CONFIG.requiredNpmVersion}`);
    }
  } catch (error) {
    console.warn('Warning: Could not determine npm version');
  }
};

const createProjectStructure = async () => {
  console.log('\nCreating project structure...');
  
  // Create directories
  for (const dir of CONFIG.projectStructure.dirs) {
    try {
      await mkdir(path.resolve(process.cwd(), dir), { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }
  
  // Create empty files
  for (const file of CONFIG.projectStructure.files) {
    try {
      await writeFile(path.resolve(process.cwd(), file), '');
      console.log(`Created file: ${file}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`Error creating file ${file}:`, error);
      }
    }
  }
};

const installDependencies = async () => {
  console.log('\nInstalling development dependencies...');
  exec(`npm install --save-dev ${CONFIG.devDependencies.join(' ')}`);
  console.log('\nDevelopment dependencies installed successfully!');
};

const setupHusky = () => {
  console.log('\nSetting up Git hooks with Husky...');
  
  // Initialize Git if not already initialized
  try {
    exec('git rev-parse --git-dir');
  } catch (error) {
    console.log('Initializing Git repository...');
    exec('git init');
  }
  
  // Install Husky hooks
  exec('npx husky install');
  
  // Add pre-commit hook
  const preCommitHook = '#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Lint and format staged files
npx lint-staged';
  
  fs.writeFileSync(path.join(process.cwd(), '.husky', 'pre-commit'), preCommitHook);
  fs.chmodSync(path.join(process.cwd(), '.husky', 'pre-commit'), '755');
  
  console.log('Git hooks configured with Husky!');
};

const setupLintStaged = async () => {
  console.log('\nConfiguring lint-staged...');
  
  const lintStagedConfig = {
    '*.{js,jsx,ts,tsx}': [
      'eslint --fix',
      'prettier --write'
    ],
    '*.{json,md,yml,yaml}': [
      'prettier --write'
    ]
  };
  
  // Update package.json with lint-staged configuration
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  let packageJson = {};
  
  try {
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    // If package.json doesn't exist, create a basic one
    packageJson = {
      name: 'tuya-zigbee-driver',
      version: '1.0.0',
      description: 'Tuya Zigbee Driver for Homey',
      main: 'src/index.js',
      scripts: {
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        format: 'prettier --write .',
        prepare: 'husky install',
        'prepare:ci': 'npm install --no-package-lock --no-save',
        validate: 'npm run lint && npm test'
      },
      keywords: ['homey', 'tuya', 'zigbee', 'driver'],
      author: '',
      license: 'MIT',
      devDependencies: {},
      dependencies: {}
    };
  }
  
  // Add lint-staged configuration
  packageJson['lint-staged'] = lintStagedConfig;
  
  // Add scripts if they don't exist
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  const requiredScripts = {
    test: 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    format: 'prettier --write .',
    prepare: 'husky install',
    'prepare:ci': 'npm install --no-package-lock --no-save',
    validate: 'npm run lint && npm test'
  };
  
  Object.entries(requiredScripts).forEach(([key, value]) => {
    if (!packageJson.scripts[key]) {
      packageJson.scripts[key] = value;
    }
  });
  
  // Write updated package.json
  await writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  );
  
  console.log('lint-staged configured successfully!');
};

const setupVSCodeSettings = async () => {
  console.log('\nConfiguring VSCode settings...');
  
  const vscodeDir = path.join(process.cwd(), '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');
  
  try {
    await mkdir(vscodeDir, { recursive: true });
    await writeFile(settingsPath, JSON.stringify(CONFIG.vscodeSettings, null, 2) + '\n');
    console.log('VSCode settings configured successfully!');
  } catch (error) {
    console.error('Error configuring VSCode settings:', error);
  }
};

// Main function
const main = async () => {
  console.log('🚀 Setting up Tuya Zigbee Driver development environment...\n');
  
  // Check Node.js and npm versions
  checkNodeVersion();
  checkNpmVersion();
  
  // Create project structure
  await createProjectStructure();
  
  // Install dependencies
  await installDependencies();
  
  // Set up Git hooks
  setupHusky();
  
  // Configure lint-staged
  await setupLintStaged();
  
  // Configure VSCode settings
  await setupVSCodeSettings();
  
  console.log('\n🎉 Development environment setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Review and update the package.json file with your project details');
  console.log('2. Run `npm run lint` to check for any linting errors');
  console.log('3. Run `npm test` to run the test suite');
  console.log('4. Start developing your Tuya Zigbee Driver!\n');
};

// Run the setup
main().catch(error => {
  console.error('Error during setup:', error);
  process.exit(1);
});
