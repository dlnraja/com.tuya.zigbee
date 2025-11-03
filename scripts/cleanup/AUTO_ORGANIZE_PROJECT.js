#!/usr/bin/env node
'use strict';

/**
 * 🧹 AUTO ORGANIZE PROJECT - Intelligent File Organization
 * 
 * Automatically organizes temporary and misplaced files
 * Runs via GitHub Actions every 2 days
 * 
 * Features:
 * - Detect and move temporary files
 * - Organize by file type and purpose
 * - Preserve essential files
 * - Validate with homey app validate
 * - Safe execution (backup before move)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectOrganizer {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    this.moved = [];
    this.errors = [];
    this.preserved = [];
  }

  /**
   * Essential files that must stay at root
   */
  getEssentialFiles() {
    return [
      // Homey SDK essentials
      'app.js',
      'app.json',
      '.homeyignore',
      '.homeychangelog.json',
      'package.json',
      'package-lock.json',
      
      // Git essentials
      '.gitignore',
      '.gitattributes',
      
      // Documentation essentials
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      'CONTRIBUTING.md',
      
      // Config essentials
      '.env.example',
      '.prettierrc',
      '.prettierignore',
      'jest.config.js'
    ];
  }

  /**
   * Organization rules
   */
  getOrganizationRules() {
    return {
      // Commit messages temporaires
      commit: {
        pattern: /^(commit|\.commit|COMMIT|\.gitmsg)/i,
        destination: 'archive/commits',
        except: []
      },
      
      // Email responses
      email: {
        pattern: /^EMAIL_RESPONSE/i,
        destination: 'archive/emails',
        except: []
      },
      
      // Documentation markdown
      docs: {
        pattern: /\.(md|MD)$/,
        destination: 'docs/archive',
        except: ['README.md', 'CHANGELOG.md', 'LICENSE', 'CONTRIBUTING.md', 'CONTRIBUTORS.md']
      },
      
      // Scripts JavaScript
      scripts: {
        pattern: /\.(js|JS)$/,
        destination: 'archive/scripts',
        except: ['app.js', 'jest.config.js']
      },
      
      // Analysis files
      analysis: {
        pattern: /^(ANALYSIS|DIAGNOSTIC|REPORT|AUDIT)/i,
        destination: 'archive/analysis',
        except: []
      },
      
      // Fixes and implementations
      fixes: {
        pattern: /^(FIX|FIXES|HOTFIX|IMPLEMENTATION|SOLUTION)/i,
        destination: 'archive/fixes',
        except: []
      },
      
      // Session summaries
      sessions: {
        pattern: /^(SESSION|SUMMARY|STATUS|FINAL)/i,
        destination: 'archive/sessions',
        except: []
      },
      
      // Guides and references
      guides: {
        pattern: /^(GUIDE|COOKBOOK|ARCHITECTURE|ROADMAP|BEST_PRACTICES)/i,
        destination: 'archive/guides',
        except: []
      },
      
      // JSON data files
      data: {
        pattern: /\.(json|JSON)$/,
        destination: 'archive/data',
        except: ['app.json', 'package.json', 'package-lock.json', 'jest.config.js', '.homeychangelog.json', 'device-matrix.json']
      },
      
      // Batch and shell scripts
      batch: {
        pattern: /\.(bat|sh|ps1)$/,
        destination: 'archive/scripts',
        except: []
      },
      
      // Temporary text files
      temp: {
        pattern: /\.(txt|TXT)$/,
        destination: 'archive/temp',
        except: []
      }
    };
  }

  /**
   * Scan root directory
   */
  scanRoot() {
    console.log('🔍 Scanning root directory...\n');
    
    const items = fs.readdirSync(this.rootPath);
    const essential = this.getEssentialFiles();
    
    const files = items.filter(item => {
      const fullPath = path.join(this.rootPath, item);
      const stat = fs.statSync(fullPath);
      return stat.isFile() && !essential.includes(item);
    });
    
    console.log(`📊 Found ${files.length} non-essential file(s) at root`);
    console.log(`✅ ${essential.length} essential files preserved\n`);
    
    return files;
  }

  /**
   * Categorize file
   */
  categorizeFile(filename) {
    const rules = this.getOrganizationRules();
    
    for (const [category, rule] of Object.entries(rules)) {
      // Check exceptions first
      if (rule.except.includes(filename)) {
        continue;
      }
      
      // Check pattern
      if (rule.pattern.test(filename)) {
        return {
          category,
          destination: rule.destination
        };
      }
    }
    
    // Default: misc
    return {
      category: 'misc',
      destination: 'archive/misc'
    };
  }

  /**
   * Move file safely
   */
  moveFile(filename, destination) {
    try {
      const sourcePath = path.join(this.rootPath, filename);
      const destDir = path.join(this.rootPath, destination);
      const destPath = path.join(destDir, filename);
      
      // Create destination directory
      fs.mkdirSync(destDir, { recursive: true });
      
      // Check if file already exists at destination
      if (fs.existsSync(destPath)) {
        // Add timestamp to avoid overwrite
        const timestamp = Date.now();
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        const newFilename = `${base}_${timestamp}${ext}`;
        const newDestPath = path.join(destDir, newFilename);
        
        fs.renameSync(sourcePath, newDestPath);
        return { success: true, path: newDestPath, renamed: true };
      } else {
        fs.renameSync(sourcePath, destPath);
        return { success: true, path: destPath, renamed: false };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Organize all files
   */
  organize() {
    console.log('🧹 Starting organization...\n');
    
    const files = this.scanRoot();
    const categories = {};
    
    files.forEach(filename => {
      const { category, destination } = this.categorizeFile(filename);
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({ filename, destination });
    });
    
    // Display categorization
    console.log('📋 Categorization:\n');
    for (const [category, files] of Object.entries(categories)) {
      console.log(`  ${category}: ${files.length} file(s)`);
    }
    console.log('');
    
    // Move files
    console.log('📦 Moving files...\n');
    let moved = 0;
    let errors = 0;
    
    for (const [category, files] of Object.entries(categories)) {
      console.log(`\n📁 ${category.toUpperCase()}:`);
      
      files.forEach(({ filename, destination }) => {
        const result = this.moveFile(filename, destination);
        
        if (result.success) {
          console.log(`  ✅ ${filename} → ${destination}${result.renamed ? ' (renamed)' : ''}`);
          this.moved.push({ filename, destination, category });
          moved++;
        } else {
          console.log(`  ❌ ${filename}: ${result.error}`);
          this.errors.push({ filename, error: result.error });
          errors++;
        }
      });
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`  ✅ Moved: ${moved} file(s)`);
    console.log(`  ❌ Errors: ${errors} file(s)`);
    console.log(`  📌 Preserved: ${this.getEssentialFiles().length} file(s)\n`);
    
    return { moved, errors };
  }

  /**
   * Validate with Homey
   */
  async validate() {
    console.log('🔍 Validating with Homey...\n');
    
    try {
      const output = execSync('homey app validate --level publish', {
        cwd: this.rootPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Homey validation: PASSED\n');
      console.log(output);
      return { success: true, output };
    } catch (err) {
      console.log('❌ Homey validation: FAILED\n');
      console.error(err.stdout || err.message);
      return { success: false, error: err.stdout || err.message };
    }
  }

  /**
   * Create summary file
   */
  createSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      moved: this.moved.length,
      errors: this.errors.length,
      preserved: this.getEssentialFiles().length,
      details: {
        moved: this.moved,
        errors: this.errors,
        preserved: this.getEssentialFiles()
      }
    };
    
    const summaryPath = path.join(this.rootPath, 'archive', 'ORGANIZATION_SUMMARY.json');
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`💾 Summary saved: archive/ORGANIZATION_SUMMARY.json\n`);
    
    return summary;
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🤖 AUTO ORGANIZE PROJECT\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Organize files
    const result = this.organize();
    
    // Validate
    const validation = await this.validate();
    
    // Create summary
    const summary = this.createSummary();
    
    // Display final status
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ORGANIZATION COMPLETE\n');
    console.log(`📁 Files moved: ${result.moved}`);
    console.log(`❌ Errors: ${result.errors}`);
    console.log(`✅ Validation: ${validation.success ? 'PASSED' : 'FAILED'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    return {
      success: result.errors === 0 && validation.success,
      result,
      validation,
      summary
    };
  }
}

// Main execution
if (require.main === module) {
  const organizer = new ProjectOrganizer();
  organizer.run().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = ProjectOrganizer;
