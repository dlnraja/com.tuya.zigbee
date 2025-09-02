const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Paths
const WORKFLOWS_DIR = path.join(__dirname, '../.github/workflows');
const KEEP_FILES = [
  'unified-pipeline.yml',
  'CODEOWNERS',
  'dependabot.yml'
];

async function cleanupWorkflows() {
  try {
    console.log(chalk.blue('🔧 Cleaning up CI/CD workflows...'));
    
    // Ensure workflows directory exists
    if (!(await fs.pathExists(WORKFLOWS_DIR))) {
      console.log(chalk.yellow('ℹ️  No workflows directory found. Creating one...'));
      await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
      return;
    }

    // List all workflow files
    const files = await fs.readdir(WORKFLOWS_DIR);
    
    // Remove old workflow files
    let removedCount = 0;
    for (const file of files) {
      if (!KEEP_FILES.includes(file)) {
        const filePath = path.join(WORKFLOWS_DIR, file);
        await fs.remove(filePath);
        console.log(chalk.yellow(`  - Removed: ${file}`));
        removedCount++;
      }
    }

    // Copy unified-pipeline.yml if it doesn't exist
    const unifiedPipelineSrc = path.join(__dirname, '../.github/workflows/unified-pipeline.yml');
    if (!(await fs.pathExists(unifiedPipelineSrc))) {
      console.log(chalk.yellow('ℹ️  Unified pipeline not found. Creating...'));
      const defaultPipeline = `name: Unified CI/CD Pipeline

on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main, develop]
  schedule:
    - cron: '0 0 1 * *'  # Monthly run
  workflow_dispatch:

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  validate:
    name: Driver Validation
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
      - run: npm ci
      - run: npm run validate:drivers

  build:
    name: Build
    needs: [test, validate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
      - run: npm ci
      - run: npm run build
      - name: Archive production artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/
            app.json

  deploy:
    name: Deploy
    needs: [build]
    if: github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
      - run: npm run deploy
`;
      await fs.writeFile(unifiedPipelineSrc, defaultPipeline);
      console.log(chalk.green('✅ Created unified-pipeline.yml'));
    }

    console.log(chalk.green(`\n✅ Cleanup complete! Removed ${removedCount} old workflow files.`));
    console.log(chalk.blue('\nNext steps:'));
    console.log('1. Review the unified-pipeline.yml configuration');
    console.log('2. Commit and push the changes to your repository');
    console.log('3. The new CI/CD pipeline will run on the next push\n');

  } catch (error) {
    console.error(chalk.red('❌ Error cleaning up workflows:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupWorkflows();
}

module.exports = { cleanupWorkflows };
