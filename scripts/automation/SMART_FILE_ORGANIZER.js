#!/usr/bin/env node
/**
 * SMART FILE ORGANIZER - Intelligent & Autonomous
 * Organizes files while preserving essential root files
 */

const fs = require('fs');
const path = require('path');

class SmartFileOrganizer {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    
    // Files that MUST stay at root
    this.preservedRootFiles = [
      'README.md',
      'README.txt',
      'LICENSE',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      '.gitignore',
      '.gitattributes',
      '.homeyignore',
      '.homeychangelog.json',
      '.prettierrc',
      '.prettierignore',
      'app.json',
      'app.js',
      'package.json',
      'package-lock.json',
      'jest.config.js',
      'validation_output.txt'
    ];

    // Organization rules
    this.organizationRules = {
      // Archive old/backup files
      archive: {
        patterns: [
          /\.backup$/,
          /\.old$/,
          /\.bak$/,
          /backup-/i,
          /\.archive$/,
          /\d{13,}\.js$/ // Timestamp files
        ],
        destination: '.archive'
      },

      // Move documentation
      documentation: {
        patterns: [
          /^[A-Z_]+\.md$/,
          /^[A-Z_]+\.txt$/,
          /GUIDE/i,
          /MANUAL/i,
          /TUTORIAL/i
        ],
        destination: 'docs',
        exclude: ['README.md', 'README.txt', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md']
      },

      // Move reports
      reports: {
        patterns: [
          /REPORT/i,
          /ANALYSIS/i,
          /DIAGNOSTIC/i,
          /_SUMMARY/i
        ],
        destination: 'reports',
        exclude: []
      },

      // Move temp/test files
      temporary: {
        patterns: [
          /^temp_/i,
          /^test_/i,
          /\.temp$/,
          /\.tmp$/,
          /_temp\./i,
          /_test\./i
        ],
        destination: '.temp',
        exclude: []
      },

      // Move scripts to proper folders
      scripts: {
        patterns: [
          /^[A-Z_]+\d*\.js$/,
          /^[A-Z_]+\d*\.ps1$/,
          /SCRIPT/i
        ],
        destination: 'scripts/organized',
        exclude: []
      }
    };

    this.stats = {
      scanned: 0,
      moved: 0,
      preserved: 0,
      errors: 0
    };
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  /**
   * Check if file should be preserved at root
   */
  shouldPreserve(filename) {
    return this.preservedRootFiles.includes(filename);
  }

  /**
   * Get organization destination for file
   */
  getDestination(filename, filepath) {
    // Check each rule
    for (const [ruleName, rule] of Object.entries(this.organizationRules)) {
      // Skip if in exclude list
      if (rule.exclude && rule.exclude.includes(filename)) continue;

      // Check patterns
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          if (pattern.test(filename)) {
            return rule.destination;
          }
        }
      }
    }

    return null;
  }

  /**
   * Move file safely
   */
  moveFile(sourcePath, destFolder) {
    try {
      const filename = path.basename(sourcePath);
      const destPath = path.join(this.rootPath, destFolder);
      
      // Create destination folder
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      const finalPath = path.join(destPath, filename);

      // Check if destination exists
      if (fs.existsSync(finalPath)) {
        // Add timestamp to avoid collision
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        const timestamp = Date.now();
        const newFilename = `${base}_${timestamp}${ext}`;
        const newFinalPath = path.join(destPath, newFilename);
        
        fs.renameSync(sourcePath, newFinalPath);
        this.log(`  → ${destFolder}/${newFilename}`, 'info');
      } else {
        fs.renameSync(sourcePath, finalPath);
        this.log(`  → ${destFolder}/${filename}`, 'info');
      }

      this.stats.moved++;
      return true;

    } catch (err) {
      this.log(`  ❌ Error moving: ${err.message}`, 'error');
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Scan and organize root files
   */
  organizeRootFiles() {
    this.log('\n📂 Organizing root files...', 'info');

    const files = fs.readdirSync(this.rootPath);

    files.forEach(filename => {
      const filepath = path.join(this.rootPath, filename);

      // Skip directories
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) return;

      this.stats.scanned++;

      // Check if should preserve
      if (this.shouldPreserve(filename)) {
        this.stats.preserved++;
        return;
      }

      // Get destination
      const destination = this.getDestination(filename, filepath);

      if (destination) {
        this.log(`\n📄 ${filename}`, 'info');
        this.moveFile(filepath, destination);
      }
    });
  }

  /**
   * Clean empty directories
   */
  cleanEmptyDirs(dir = this.rootPath, level = 0) {
    if (level > 3) return; // Max depth

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filepath = path.join(dir, file);
      
      if (fs.statSync(filepath).isDirectory()) {
        // Skip protected directories
        const protectedDirs = ['drivers', 'lib', 'flow', 'locales', 'assets', 'scripts', 'node_modules', '.git'];
        if (protectedDirs.includes(file)) return;

        // Recursive clean
        this.cleanEmptyDirs(filepath, level + 1);

        // Remove if empty
        try {
          const contents = fs.readdirSync(filepath);
          if (contents.length === 0) {
            fs.rmdirSync(filepath);
            this.log(`  🗑️  Removed empty: ${file}`, 'warning');
          }
        } catch (err) {
          // Ignore
        }
      }
    });
  }

  /**
   * Main execution
   */
  async run() {
    this.log('\n🧹 SMART FILE ORGANIZER - Starting...', 'info');
    this.log('='.repeat(80), 'info');

    // Organize files
    this.organizeRootFiles();

    // Clean empty directories
    this.cleanEmptyDirs();

    // Summary
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📊 ORGANIZATION SUMMARY', 'info');
    this.log('='.repeat(80) + '\n', 'info');
    
    console.log(`   Files scanned: ${this.stats.scanned}`);
    console.log(`   Files moved: ${this.stats.moved}`);
    console.log(`   Files preserved: ${this.stats.preserved}`);
    console.log(`   Errors: ${this.stats.errors}`);

    if (this.stats.moved > 0) {
      this.log('\n✅ Organization completed!', 'success');
    } else {
      this.log('\n✅ All files already organized!', 'success');
    }

    this.log('='.repeat(80) + '\n', 'info');
  }
}

// Run
if (require.main === module) {
  const organizer = new SmartFileOrganizer();
  organizer.run().catch(console.error);
}

module.exports = SmartFileOrganizer;
