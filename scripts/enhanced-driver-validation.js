const fs = require('fs-extra');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { execSync } = require('child_process');

// Configuration
const DRIVERS_DIR = path.join(__dirname, '../drivers');
const REQUIRED_FILES = ['driver.js', 'device.js', 'driver.compose.json'];
const SUPPORTED_LANGUAGES = ['en', 'fr', 'nl', 'ta'];

// Stats
const stats = {
  totalDrivers: 0,
  validDrivers: 0,
  errors: 0,
  warnings: 0,
  fixed: 0
};

class ValidationError extends Error {
  constructor(message, fix = null) {
    super(message);
    this.fix = fix;
    this.isValidationError = true;
  }
}

async function validateDriverCompose(driverPath, fix = false) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  const errors = [];
  const warnings = [];
  let fixed = 0;

  try {
    const content = await fs.readFile(composePath, 'utf8');
    let compose;
    
    try {
      compose = JSON.parse(content);
    } catch (e) {
      throw new ValidationError(`Invalid JSON: ${e.message}`, () => {
        // Try to fix common JSON issues
        const fixedContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
          .replace(/,[\s\r\n]+\}/g, '}') // Trailing commas
          .replace(/,[\s\r\n]+\]/g, ']');
        return { fixed: true, content: fixedContent };
      });
    }

    // Validate required fields
    if (!compose.id) {
      errors.push('Missing required field: id');
    }

    if (!compose.name) {
      errors.push('Missing required field: name');
    } else {
      // Check multilingual support
      for (const lang of SUPPORTED_LANGUAGES) {
        if (!compose.name[lang]) {
          warnings.push(`Missing ${lang} translation for name`);
          if (fix && compose.name.en) {
            compose.name[lang] = compose.name.en;
            fixed++;
          }
        }
      }
    }

    // Check capabilities
    if (!compose.capabilities || !Array.isArray(compose.capabilities) || compose.capabilities.length === 0) {
      warnings.push('No capabilities defined');
    }

    // Check images
    if (!compose.images || !compose.images.small || !compose.images.large) {
      warnings.push('Missing required images (small and/or large)');
    }

    // Save fixed content if needed
    if (fix && fixed > 0) {
      await fs.writeFile(composePath, JSON.stringify(compose, null, 2) + '\n');
    }

    return { errors, warnings, fixed };
  } catch (error) {
    if (error.isValidationError && fix && error.fix) {
      try {
        const result = error.fix();
        if (result.fixed) {
          await fs.writeFile(composePath, result.content);
          return { errors: [], warnings: [`Fixed JSON: ${error.message}`], fixed: 1 };
        }
      } catch (fixError) {
        // If fix fails, return original error
      }
    }
    return { errors: [error.message], warnings: [], fixed: 0 };
  }
}

async function validateDriverFiles(driverPath) {
  const errors = [];
  const warnings = [];
  const missingFiles = [];

  for (const file of REQUIRED_FILES) {
    if (!(await fs.pathExists(path.join(driverPath, file)))) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    errors.push(`Missing required files: ${missingFiles.join(', ')}`);
  }

  // Check for deprecated files
  const deprecatedFiles = ['device.json', 'driver.json'];
  for (const file of deprecatedFiles) {
    if (await fs.pathExists(path.join(driverPath, file))) {
      warnings.push(`Deprecated file found: ${file} - consider removing`);
    }
  }

  return { errors, warnings };
}

async function validateDriver(driver, options = {}) {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const errors = [];
  const warnings = [];
  let fixed = 0;

  stats.totalDrivers++;

  // Validate driver files
  const fileValidation = await validateDriverFiles(driverPath);
  errors.push(...fileValidation.errors);
  warnings.push(...fileValidation.warnings);

  // Validate driver.compose.json
  if (await fs.pathExists(path.join(driverPath, 'driver.compose.json'))) {
    const composeValidation = await validateDriverCompose(driverPath, options.fix);
    errors.push(...composeValidation.errors);
    warnings.push(...composeValidation.warnings);
    fixed += composeValidation.fixed;
  }

  // Update stats
  if (errors.length === 0) {
    stats.validDrivers++;
  }
  stats.errors += errors.length;
  stats.warnings += warnings.length;
  stats.fixed += fixed;

  return { driver, errors, warnings, fixed };
}

function printResults(results) {
  let output = '';
  let hasErrors = false;
  let hasWarnings = false;

  for (const result of results) {
    if (result.errors.length > 0 || result.warnings.length > 0) {
      output += `\n${chalk.bold(result.driver)}`;
      
      if (result.fixed > 0) {
        output += ` ${chalk.green(`[${result.fixed} fixed]`)}`;
      }
      output += '\n';

      if (result.errors.length > 0) {
        hasErrors = true;
        output += '  ' + chalk.red('Errors:') + '\n';
        for (const error of result.errors) {
          output += `  - ${error}\n`;
        }
      }

      if (result.warnings.length > 0) {
        hasWarnings = true;
        output += '  ' + chalk.yellow('Warnings:') + '\n';
        for (const warning of result.warnings) {
          output += `  - ${warning}\n`;
        }
      }
    }
  }

  // Print summary
  output += '\n' + '='.repeat(80) + '\n';
  output += chalk.bold('Validation Summary:\n');
  output += `- Total drivers: ${stats.totalDrivers}\n`;
  output += `- Valid drivers: ${chalk.green(stats.validDrivers)}\n`;
  output += `- Drivers with errors: ${hasErrors ? chalk.red(stats.errors) : '0'}\n`;
  output += `- Warnings: ${hasWarnings ? chalk.yellow(stats.warnings) : '0'}\n`;
  if (stats.fixed > 0) {
    output += `- Fixed issues: ${chalk.green(stats.fixed)}\n`;
  }
  output += '='.repeat(80) + '\n';

  console.log(output);
  return hasErrors ? 1 : 0;
}

async function main() {
  program
    .option('--fix', 'Attempt to fix common issues', false)
    .option('--driver <name>', 'Validate a specific driver')
    .parse(process.argv);

  const options = program.opts();
  let drivers;

  if (options.driver) {
    drivers = [options.driver];
  } else {
    const dirs = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
    drivers = dirs
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
  }

  console.log(`Validating ${drivers.length} drivers...\n`);

  const results = [];
  for (const driver of drivers) {
    results.push(await validateDriver(driver, options));
  }

  const exitCode = printResults(results);
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateDriver,
  validateDriverCompose,
  validateDriverFiles
};
