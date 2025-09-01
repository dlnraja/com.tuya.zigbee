#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  ROOT_DIR: path.join(__dirname, '..'),
  LIGHT_DIR: path.join(__dirname, '..', 'tuya-light-release'),
  DRIVERS_DIR: path.join(__dirname, '..', 'drivers'),
  EXCLUDE_PATTERNS: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.github/**',
    '**/scripts/**',
    '**/templates/**',
    '**/tests/**',
    '**/.*',
    '**/*.md',
    '**/package*.json',
    '**/yarn.lock',
    '**/tsconfig.json',
    '**/.eslintrc*',
    '**/.prettierrc*'
  ],
  DRIVER_FILES: [
    'driver.compose.json',
    'device.js',
    'assets/**',
    'drivers/**',
    'app.json',
    'app.js',
    'LICENSE',
    'README.md'
  ]
};

/**
 * Create directory if it doesn't exist
 */
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy files from source to destination with pattern matching
 */
function copyFiles(source, destination, patterns) {
  patterns.forEach(pattern => {
    const srcPattern = path.join(source, pattern);
    const destDir = path.join(destination, path.dirname(pattern));
    
    ensureDirectory(destDir);
    
    try {
      execSync(`xcopy "${srcPattern}" "${destDir}\" /E /I /Y /Q`, { stdio: 'inherit' });
    } catch (error) {
      console.warn(`Warning: Failed to copy ${pattern}:`, error.message);
    }
  });
}

/**
 * Clean the destination directory
 */
function cleanDestination() {
  console.log('Cleaning destination directory...');
  
  // Keep .git directory if it exists
  const gitDir = path.join(CONFIG.LIGHT_DIR, '.git');
  const tempGit = path.join(CONFIG.ROOT_DIR, '.git_temp');
  
  if (fs.existsSync(gitDir)) {
    fs.renameSync(gitDir, tempGit);
  }
  
  // Remove existing files
  fs.readdirSync(CONFIG.LIGHT_DIR).forEach(file => {
    const filePath = path.join(CONFIG.LIGHT_DIR, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  });
  
  // Restore .git directory
  if (fs.existsSync(tempGit)) {
    fs.renameSync(tempGit, gitDir);
  }
}

/**
 * Update package.json for the light version
 */
function updatePackageJson() {
  const packagePath = path.join(CONFIG.ROOT_DIR, 'package.json');
  const packageLightPath = path.join(CONFIG.LIGHT_DIR, 'package.json');
  
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Remove devDependencies and scripts not needed for the light version
    delete pkg.devDependencies;
    
    // Update scripts
    pkg.scripts = {
      start: 'homey:run',
      build: 'homey:build',
      test: 'echo \"No tests in light version\" && exit 0'
    };
    
    // Update description
    pkg.description = 'Light version of Tuya Zigbee Universal - Drivers only';
    
    // Save the modified package.json
    fs.writeFileSync(packageLightPath, JSON.stringify(pkg, null, 2));
  }
}

/**
 * Create a commit with the changes
 */
function createCommit() {
  const commitMessage = `chore: sync with main repository (${new Date().toISOString()})`;
  
  try {
    process.chdir(CONFIG.LIGHT_DIR);
    
    // Check if there are changes
    const status = execSync('git status --porcelain').toString().trim();
    
    if (status) {
      console.log('Creating commit with changes...');
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      // Push changes if there's a remote
      try {
        execSync('git push', { stdio: 'inherit' });
      } catch (error) {
        console.warn('Warning: Failed to push changes to remote:', error.message);
      }
    } else {
      console.log('No changes to commit.');
    }
  } catch (error) {
    console.error('Error creating commit:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('Starting sync with tuya-light...');
  
  try {
    // Ensure light directory exists
    ensureDirectory(CONFIG.LIGHT_DIR);
    
    // Clean destination
    cleanDestination();
    
    // Copy required files
    console.log('Copying files...');
    copyFiles(CONFIG.ROOT_DIR, CONFIG.LIGHT_DIR, CONFIG.DRIVER_FILES);
    
    // Update package.json
    updatePackageJson();
    
    // Create commit
    createCommit();
    
    console.log('\n✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    process.exit(1);
  }
}

// Run the sync
main();
