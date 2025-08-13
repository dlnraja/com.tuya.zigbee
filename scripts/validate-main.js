#!/usr/bin/env node

/**
 * Universal Tuya Zigbee - Main Validation Script
 * Script principal de validation pour le projet
 * 
 * @author dlnraja
 * @version 3.3.0
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  driversPath: 'drivers/tuya_zigbee/models',
  libPath: 'lib',
  scriptsPath: 'scripts',
  docsPath: 'docs',
  assetsPath: 'assets',
  requiredFiles: [
    'app.js',
    'app.json',
    'package.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md'
  ],
  requiredDirs: [
    'drivers',
    'lib',
    'scripts',
    'assets',
    'locales'
  ]
};

// Classes de validation
class FileValidator {
  static validateFile(filePath) {
    try {
      const fullPath = path.join(CONFIG.projectRoot, filePath);
      if (!fs.existsSync(fullPath)) {
        return { valid: false, error: `File not found: ${filePath}` };
      }
      
      const stats = fs.statSync(fullPath);
      if (stats.size === 0) {
        return { valid: false, error: `File is empty: ${filePath}` };
      }
      
      return { valid: true, size: stats.size };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  static validateJsonFile(filePath) {
    const fileCheck = this.validateFile(filePath);
    if (!fileCheck.valid) return fileCheck;
    
    try {
      const fullPath = path.join(CONFIG.projectRoot, filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      JSON.parse(content);
      return { valid: true, size: fileCheck.size };
    } catch (error) {
      return { valid: false, error: `Invalid JSON: ${error.message}` };
    }
  }
}

class DirectoryValidator {
  static validateDirectory(dirPath) {
    try {
      const fullPath = path.join(CONFIG.projectRoot, dirPath);
      if (!fs.existsSync(fullPath)) {
        return { valid: false, error: `Directory not found: ${dirPath}` };
      }
      
      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        return { valid: false, error: `Path is not a directory: ${dirPath}` };
      }
      
      const contents = fs.readdirSync(fullPath);
      return { valid: true, contents: contents, count: contents.length };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  static validateDriverStructure() {
    const driversDir = this.validateDirectory(CONFIG.driversPath);
    if (!driversDir.valid) return driversDir;
    
    const drivers = [];
    const errors = [];
    
    for (const item of driversDir.contents) {
      const driverPath = path.join(CONFIG.driversPath, item);
      const driverDir = this.validateDirectory(driverPath);
      
      if (driverDir.valid) {
        const driverFiles = this.validateDriverFiles(driverPath);
        drivers.push({
          name: item,
          path: driverPath,
          files: driverFiles
        });
      } else {
        errors.push(`Driver ${item}: ${driverDir.error}`);
      }
    }
    
    return { valid: true, drivers, errors, count: drivers.length };
  }
  
  static validateDriverFiles(driverPath) {
    const requiredFiles = [
      'driver.compose.json',
      'driver.js',
      'assets/icon.svg'
    ];
    
    const files = {};
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      files[file] = FileValidator.validateFile(filePath);
    }
    
    return files;
  }
}

class ProjectValidator {
  constructor() {
    this.results = {
      files: {},
      directories: {},
      drivers: {},
      overall: { valid: true, errors: [], warnings: [] }
    };
  }
  
  async validateAll() {
    console.log(chalk.blue.bold('🔍 Universal Tuya Zigbee - Project Validation\n'));
    
    // Validate required files
    await this.validateRequiredFiles();
    
    // Validate required directories
    await this.validateRequiredDirectories();
    
    // Validate driver structure
    await this.validateDriverStructure();
    
    // Validate package.json
    await this.validatePackageJson();
    
    // Generate summary
    this.generateSummary();
    
    return this.results;
  }
  
  async validateRequiredFiles() {
    const spinner = ora('Validating required files...').start();
    
    for (const file of CONFIG.requiredFiles) {
      const result = FileValidator.validateFile(file);
      this.results.files[file] = result;
      
      if (!result.valid) {
        this.results.overall.valid = false;
        this.results.overall.errors.push(`File validation failed: ${file} - ${result.error}`);
      }
    }
    
    spinner.succeed(`Validated ${CONFIG.requiredFiles.length} required files`);
  }
  
  async validateRequiredDirectories() {
    const spinner = ora('Validating required directories...').start();
    
    for (const dir of CONFIG.requiredDirs) {
      const result = DirectoryValidator.validateDirectory(dir);
      this.results.directories[dir] = result;
      
      if (!result.valid) {
        this.results.overall.valid = false;
        this.results.overall.errors.push(`Directory validation failed: ${dir} - ${result.error}`);
      }
    }
    
    spinner.succeed(`Validated ${CONFIG.requiredDirs.length} required directories`);
  }
  
  async validateDriverStructure() {
    const spinner = ora('Validating driver structure...').start();
    
    const result = DirectoryValidator.validateDriverStructure();
    this.results.drivers = result;
    
    if (!result.valid) {
      this.results.overall.valid = false;
      this.results.overall.errors.push(`Driver structure validation failed: ${result.error}`);
    } else {
      // Check for common issues
      for (const driver of result.drivers) {
        const missingFiles = [];
        for (const [file, fileResult] of Object.entries(driver.files)) {
          if (!fileResult.valid) {
            missingFiles.push(file);
          }
        }
        
        if (missingFiles.length > 0) {
          this.results.overall.warnings.push(`Driver ${driver.name} missing files: ${missingFiles.join(', ')}`);
        }
      }
    }
    
    spinner.succeed(`Validated ${result.count} drivers`);
  }
  
  async validatePackageJson() {
    const spinner = ora('Validating package.json...').start();
    
    const result = FileValidator.validateJsonFile('package.json');
    this.results.packageJson = result;
    
    if (result.valid) {
      try {
        const packagePath = path.join(CONFIG.projectRoot, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Validate required fields
        const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
        for (const field of requiredFields) {
          if (!packageData[field]) {
            this.results.overall.warnings.push(`package.json missing field: ${field}`);
          }
        }
        
        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(packageData.version)) {
          this.results.overall.warnings.push(`Invalid version format: ${packageData.version}`);
        }
        
        spinner.succeed('package.json validation completed');
      } catch (error) {
        spinner.fail(`package.json validation failed: ${error.message}`);
        this.results.overall.errors.push(`package.json parsing failed: ${error.message}`);
      }
    } else {
      spinner.fail(`package.json validation failed: ${result.error}`);
      this.results.overall.errors.push(`package.json validation failed: ${result.error}`);
    }
  }
  
  generateSummary() {
    console.log('\n' + chalk.blue.bold('📊 Validation Summary\n'));
    
    // Overall status
    const status = this.results.overall.valid ? 
      chalk.green('✅ VALID') : 
      chalk.red('❌ INVALID');
    
    console.log(`Overall Status: ${status}\n`);
    
    // File validation results
    console.log(chalk.yellow.bold('📁 Files:'));
    for (const [file, result] of Object.entries(this.results.files)) {
      const status = result.valid ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${status} ${file}`);
    }
    
    // Directory validation results
    console.log(chalk.yellow.bold('\n📂 Directories:'));
    for (const [dir, result] of Object.entries(this.results.directories)) {
      const status = result.valid ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${status} ${dir} (${result.count || 0} items)`);
    }
    
    // Driver validation results
    if (this.results.drivers.valid) {
      console.log(chalk.yellow.bold('\n🚗 Drivers:'));
      console.log(`  ✅ ${this.results.drivers.count} drivers validated`);
      
      if (this.results.drivers.errors.length > 0) {
        console.log(chalk.red(`  ❌ ${this.results.drivers.errors.length} driver errors`));
      }
    }
    
    // Errors and warnings
    if (this.results.overall.errors.length > 0) {
      console.log(chalk.red.bold('\n❌ Errors:'));
      for (const error of this.results.overall.errors) {
        console.log(`  • ${error}`);
      }
    }
    
    if (this.results.overall.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Warnings:'));
      for (const warning of this.results.overall.warnings) {
        console.log(`  • ${warning}`);
      }
    }
    
    // Final status
    console.log('\n' + chalk.blue.bold('='.repeat(50)));
    if (this.results.overall.valid) {
      console.log(chalk.green.bold('🎉 Project validation completed successfully!'));
    } else {
      console.log(chalk.red.bold('🚨 Project validation failed. Please fix the errors above.'));
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  try {
    const validator = new ProjectValidator();
    await validator.validateAll();
  } catch (error) {
    console.error(chalk.red('❌ Validation failed with error:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ProjectValidator, FileValidator, DirectoryValidator };
