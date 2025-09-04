const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🚀 Starting Tuya Zigbee Project Setup...\n'));

// Utility function to run commands
function runCommand(command, description) {
  console.log(chalk.cyan(`⏳ ${description}...`));
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${description} completed successfully!`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Error during ${description.toLowerCase()}:`), error);
    return false;
  }
}

// Main setup function
async function setupProject() {
  try {
    // 1. Install dependencies
    runCommand('npm install', 'Installing npm dependencies');

    // 2. Update package.json with new scripts and configs
    console.log(chalk.cyan('\n🔄 Updating package.json...'));
    const updatePackageJson = require('./scripts/update-package-json');
    await updatePackageJson();
    console.log(chalk.green('✅ package.json updated successfully!'));

    // 3. Install updated dependencies
    runCommand('npm install', 'Installing updated dependencies');

    // 4. Set up Git hooks
    console.log(chalk.cyan('\n🔧 Setting up Git hooks...'));
    const { setupHusky } = require('./scripts/setup-git-hooks');
    await setupHusky();

    // 5. Generate initial documentation
    console.log(chalk.cyan('\n📝 Generating documentation...'));
    const { generateAllDocumentation } = require('./scripts/generate-documentation');
    await generateAllDocumentation();

    // 6. Validate drivers
    console.log(chalk.cyan('\n🔍 Validating drivers...'));
    runCommand('npm run validate:drivers', 'Validating drivers');

    // 7. Run initial build
    runCommand('npm run build', 'Running initial build');

    console.log(chalk.green('\n✨ Project setup completed successfully! ✨\n'));
    console.log(chalk.bold('Next steps:'));
    console.log('1. Review the generated documentation in the docs/ directory');
    console.log('2. Check the driver validation output for any issues');
    console.log('3. Start developing with `npm run dev`');
    console.log('4. Run tests with `npm test`');
    console.log('\nHappy coding! 🚀');

  } catch (error) {
    console.error(chalk.red('\n❌ Error during project setup:'), error);
    process.exit(1);
  }
}

// Run setup
setupProject();
