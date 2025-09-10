#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

async function updatePackageJson() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  // Add or update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "validate:drivers": "node scripts/enhanced-driver-validation.js",
    "validate:fix": "node scripts/enhanced-driver-validation.js --fix",
    "docs": "node scripts/generate-documentation.js",
    "precommit": "npm run lint && npm run validate:drivers",
    "prepare": "husky install"
  };

  // Add devDependencies if not present
  const devDependencies = {
    ...packageJson.devDependencies,
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0"
  };

  // Add lint-staged configuration
  packageJson['lint-staged'] = {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  };

  // Write updated package.json
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  console.log('Updated package.json with new scripts and configurations');
}

updatePackageJson().catch(console.error);
