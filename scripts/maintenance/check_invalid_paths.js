#!/usr/bin/env node
/**
 * Maintenance Script: Check Invalid Paths
 * 
 * Detects paths with invalid spaces (e.g., './lib / module' instead of './lib/module')
 * These spaces cause SyntaxError crashes on Homey/Node.js
 * 
 * @author Universal Tuya Zigbee App
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Patterns that indicate invalid spaces in require/import paths
const INVALID_PATTERNS = [
  { regex: /require\s*\(\s*['"][^'"]*\s+\/[^*]/g, desc: 'require with space before /' },
  { regex: /import\s+.*? from\s+['"][^'"]*\s+\/[^*]/g , desc: 'import with space before /' },
  { regex: /require\s*\(\s*['"][^'"]*\/\s+[^*]/g, desc: 'require with space after /' },
  { regex: /import\s+.*? from\s+['"][^'"]*\/\s+[^*]/g , desc: 'import with space after /' },
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.json', '.ts'];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', '.homey', 'dist', 'build'];

const SAFE_PATTERNS = [
  /http:\/\//,
  /https:\/\//,
  /data:/,
  /base64:/,
  /\/ $/,  // trailing space after / is valid in some contexts
  /console\.log.*lib \/ /,  // examples in console.log/demo output
  /âœ— require/,  // demo examples showing incorrect patterns
];

function shouldExclude(filePath) {
  return EXCLUDE_DIRS.some(dir => filePath.includes(dir));
}

function scanFile(filePath, issues) {
  const ext = path.extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNum) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      
      INVALID_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(line)) {
          // Check if it's a safe pattern
          const isSafe = SAFE_PATTERNS.some(sp => sp.test(line));
          
          if (!isSafe) {
            issues.push({
              file: filePath,
              line: lineNum + 1,
              content: line.trim().substring(0, 100),
              pattern: pattern.desc
            });
          }
        }
      });
    });
  } catch (err) {
    console.warn(`âšï¸  Could not read ${filePath}: ${err.message}`);
  }
}

function scanDirectory(dirPath, issues) {
  if (shouldExclude(dirPath)) return;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, issues);
      } else if (entry.isFile()) {
        scanFile(fullPath, issues);
      }
    }
  } catch (err) {
    console.warn(`âšï¸  Could not scan ${dirPath}: ${err.message}`);
  }
}

function main() {
  console.log('ðŸ” Running Invalid Path Scanner...');
  console.log('');
  
  const rootDir = path.resolve(__dirname, '..');
  const issues = [];
  
  // Scan the entire project
  scanDirectory(rootDir, issues);
  
  // Report results
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ“Š SCAN RESULTS');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('');
  
  if (issues.length === 0) {
    console.log('âœ… No invalid paths found!');
    console.log('');
    console.log('All require/import paths are properly formatted.');
    process.exit(0);
  }
  
  console.log(`âŒ Found ${issues.length} invalid path(s):`);
  console.log('');
  
  // Group by file
  const byFile = {};
  issues.forEach(issue => {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  });
  
  // Display issues
  Object.keys(byFile).forEach(file => {
    console.log(`ðŸ“„ ${file}`);
    byFile[file].forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.pattern}`);
      console.log(`   â†’ ${issue.content}`);
    });
    console.log('');
  });
  
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ”§ FIX INSTRUCTIONS');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('');
  console.log('Replace patterns like:');
  console.log('  âœ— require("./lib / module")');
  console.log('  âœ— require("./lib /shims / color-space-shim")');
  console.log('');
  console.log('With correct paths:');
  console.log('  âœ“ require("./lib/module")');
  console.log('  âœ“ require("./lib/shims/color-space-shim")');
  console.log('');
  
  // Exit with error for CI/CD
  process.exit(1);
}

main();
