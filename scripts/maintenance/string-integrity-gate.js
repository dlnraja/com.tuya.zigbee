'use strict';

/**
 * 
 *               STRING INTEGRITY GATE v1.0.0 - SHADOW MODE                      
 * 
 *                                                                               
 *   Purpose: Purge invisible Unicode characters (Zero-Width Space, LTR/RTL      
 *   Overrides) that corrupt drivers and manifests during copy-paste from       
 *   forums and PDFs.                                                            
 *                                                                               
 *   Standard: Zero-Tolerance for non-printing control characters.               
 *                                                                               
 * 
 */

const fs = require('fs');
const path = require('path');

// Regex for invisible characters:
// \u200B: Zero Width Space
// \u200C: Zero Width Non-Joiner
// \u200D: Zero Width Joiner
// \u202D: Left-to-Right Override
// \u202C: Pop Directional Formatting
// \u202E: Right-to-Left Override
// \uFEFF: Byte Order Mark (BOM)
const INVISIBLE_CHARS_REGEX = /[\u200B\u200C\u200D\u202D\u202C\u202E\uFEFF]/g;

const rootDir = process.cwd();
const targetExtensions = ['.js', '.json', '.txt', '.md', '.yml'];
const excludeDirs = ['node_modules', '.git', '.gemini', '.antigravity'];

let filesProcessed = 0;
let filesCleaned = 0;
let totalCharsRemoved = 0;

/**
 * Scan directory recursively
 */
function scanDir(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        scanDir(fullPath);
      }
    } else {
      const ext = path.extname(item);
      if (targetExtensions.includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  filesProcessed++;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(INVISIBLE_CHARS_REGEX);

    if (matches) {
      const cleanedContent = content.replace(INVISIBLE_CHARS_REGEX, '');
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      
      filesCleaned++;
      totalCharsRemoved += matches.length;
      console.log(`[CLEAN] ${path.relative(rootDir, filePath)}: Removed ${matches.length} characters.`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed to process ${filePath}: ${err.message}`);
  }
}

console.log(' Starting String Integrity Gate (Zero-Width Purge)...');
scanDir(rootDir);

console.log('\n Sanitization Summary:');
console.log(`- Files Processed: ${filesProcessed}`);
console.log(`- Files Cleaned:   ${filesCleaned}`);
console.log(`- Total Chars Removed: ${totalCharsRemoved}`);
console.log(' Integrity Audit Complete.');
