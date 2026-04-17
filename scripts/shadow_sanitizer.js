'use strict';

/**
 * SHADOW SANITIZER v1.0.0
 * 
 * Recursive sanitizer to strip non-printable characters (invisible characters, BOM, null bytes)
 * from all .js and .json files in the repository.
 * 
 * Prevents "Unexpected token" errors caused by copy-pasting code from forums/IMAP.
 */

const fs = require('fs');
const path = require('path');

const excludeDirs = ['.git', 'node_modules', '.homeybuild', '.homeycompose', 'assets'];
const includeExts = ['.js', '.json', '.md'];

function sanitizeFile(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    
    // Pattern: Strip all non-ASCII printable chars except \n, \r, \t, and extended ASCII (latin)
    // Specifically targets: \u200B (Zero Width Space), \uFEFF (BOM), \0 (Null), etc.
    // Range: \x20-\x7E (Standard Printable), \x0A\x0D\x09 (CR/LF/Tab)
    // We allow \xA0-\xFF for latin characters commonly found in locales
    const sanitizedContent = originalContent.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, '');

    if (originalContent !== sanitizedContent) {
      console.log(`[SANITIZER] 🧹 Cleaned: ${filePath}`);
      fs.writeFileSync(filePath, sanitizedContent, 'utf8');
      return true;
    }
  } catch (err) {
    console.error(`[SANITIZER] ❌ Failed to process ${filePath}:`, err.message);
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        walkDir(fullPath);
      }
    } else {
      if (includeExts.includes(path.extname(file))) {
        sanitizeFile(fullPath);
      }
    }
  });
}

const targetDir = path.join(__dirname, '..');
console.log(`[SANITIZER] 🚀 Starting recursion in: ${targetDir}`);
walkDir(targetDir);
console.log('[SANITIZER] ✅ Done.');
