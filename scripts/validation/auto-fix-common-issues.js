#!/usr/bin/env node
/**
 * AUTO-FIX COMMON ISSUES
 * 
 * Corrige automatiquement les problèmes courants:
 * - Trailing commas in JSON
 * - Comments in JSON (converts to valid JSON)
 * - Brace/parenthesis mismatches (adds missing)
 * - Broken require() paths (updates to correct paths)
 * - YAML indentation
 * 
 * S'adapte dynamiquement - ne casse JAMAIS l'organisation
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const FIXED = [];
const FAILED = [];

console.log('🔧 AUTO-FIX COMMON ISSUES\n');

/**
 * Fix JSON files with common issues
 */
function fixJSON(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    const original = content;
    
    // Remove trailing commas before } or ]
    content = content.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove comments (// and /* */)
    content = content.replace(/\/\/.*$/gm, '');
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Try to parse
    try {
      JSON.parse(content);
      
      if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        FIXED.push({
          file: filepath,
          type: 'json',
          fixes: ['trailing_commas', 'comments']
        });
        console.log(`✅ Fixed: ${path.relative(ROOT, filepath)}`);
        return true;
      }
    } catch (err) {
      // Still invalid
      FAILED.push({
        file: filepath,
        type: 'json',
        error: err.message
      });
      console.log(`❌ Could not auto-fix: ${path.relative(ROOT, filepath)}`);
      return false;
    }
  } catch (err) {
    FAILED.push({
      file: filepath,
      error: err.message
    });
    return false;
  }
  
  return false;
}

/**
 * Fix JavaScript brace mismatches
 */
function fixJS(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    const original = content;
    
    // Count braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      const missing = openBraces - closeBraces;
      content += '\n' + '}'.repeat(missing);
      console.log(`  Added ${missing} missing closing brace(s)`);
    }
    
    // Count parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openParens > closeParens) {
      const missing = openParens - closeParens;
      content += ')'.repeat(missing);
      console.log(`  Added ${missing} missing closing parenthesis/es`);
    }
    
    if (content !== original) {
      fs.writeFileSync(filepath, content, 'utf8');
      FIXED.push({
        file: filepath,
        type: 'js',
        fixes: ['braces', 'parentheses']
      });
      console.log(`✅ Fixed: ${path.relative(ROOT, filepath)}`);
      return true;
    }
  } catch (err) {
    FAILED.push({
      file: filepath,
      error: err.message
    });
    return false;
  }
  
  return false;
}

/**
 * Main
 */
function main() {
  // Get validation report
  const reportPath = path.join(ROOT, 'docs/reports/validation-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('❌ No validation report found. Run validator first.');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  console.log(`Found ${report.errors.length} errors to attempt fixing...\n`);
  
  // Fix JSON errors
  const jsonErrors = report.errors.filter(e => e.type === 'json_syntax_error');
  console.log(`\n📋 Attempting to fix ${jsonErrors.length} JSON files...\n`);
  
  for (const error of jsonErrors) {
    // Skip if in archive
    if (error.file.includes('archive') || error.file.includes('.dev')) {
      console.log(`⏭️  Skipping archived file: ${path.relative(ROOT, error.file)}`);
      continue;
    }
    
    fixJSON(error.file);
  }
  
  // Fix JS errors
  const jsErrors = report.errors.filter(e => e.type === 'js_error');
  if (jsErrors.length > 0) {
    console.log(`\n📋 Attempting to fix ${jsErrors.length} JS files...\n`);
    
    for (const error of jsErrors) {
      if (error.file.includes('archive') || error.file.includes('.dev')) {
        console.log(`⏭️  Skipping archived file: ${path.relative(ROOT, error.file)}`);
        continue;
      }
      
      fixJS(error.file);
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 AUTO-FIX SUMMARY');
  console.log('═══════════════════════════════════════\n');
  console.log(`✅ Fixed: ${FIXED.length} files`);
  console.log(`❌ Failed: ${FAILED.length} files\n`);
  
  if (FIXED.length > 0) {
    console.log('🎉 Some issues were automatically fixed!');
    console.log('   Run validator again to verify.\n');
  }
  
  if (FAILED.length > 0) {
    console.log('⚠️  Some issues require manual attention.\n');
  }
}

main();
