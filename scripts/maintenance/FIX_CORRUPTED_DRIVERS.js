#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log('--- STARTING GLOBAL RECOVERY ---');

const PATTERN = /try\s*{\s*\(\(\)\s*=>\s*{\s*try\s*{\s*return\s*;\s*}\s*catch\s*\(e\)\s*{\s*return\s*null;\s*}\s*}\)\(\);\s*}\s*catch\s*\(e\)\s*{\s*return\s*null;\s*}\s*}\)\(\);/g;

walk(ROOT, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (PATTERN.test(content)) {
    console.log(`Fixing corrupted file: ${path.relative(ROOT, file)}`);
    // Remove the insane nested try-catch blocks and leave a cleaner structure or just remove the line if it's empty return
    // Most of these seem to be empty returns anyway.
    let newContent = content.replace(PATTERN, '// Removed corrupted nested block');
    
    // Also fix the case where it ends with extra parenthesis
    newContent = newContent.replace(/\s*}\s*catch\s*\(e\)\s*{\s*}\s*\)\(\);\s*}\s*catch\s*\(e\)\s*{\s*}/g, ' } catch (e) {}');
    
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
    }
  }
});

console.log('--- GLOBAL RECOVERY COMPLETE ---');
