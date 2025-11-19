#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const baseDir = path.join(__dirname, '..');

async function fixOrphanBraces(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Pattern 1: Closing brace alone on a line before an async method
    // Matches:
    //   }
    //   async methodName
    // Where the } is extra because the previous method was already closed

    const lines = content.split('\n');
    const fixedLines = [];
    let previousLineClosed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Simple heuristic:
      // If we see a line that is just "}" (maybe with comments)
      // And the NEXT line starts a new method "async method(" or "method("
      // AND the PREVIOUS code block seemed to be closed...
      // It's risky to just delete "}".

      // Let's try specific pattern matching from the error reports
      // Pattern: } followed by async ... (where context suggests double closure)

      // The errors showed:
      // 53: }
      // 54:
      // 55: /** ... */
      // 58: }  <-- EXTRA
      // 59: async detectButtonCount

      // So we look for:
      // 1. A closing brace
      // 2. Optional whitespace/comments
      // 3. Another closing brace
      // 4. Followed by async method definition

      // Actually, let's use the exact pattern we saw:
      // A closing brace line, followed by comments/whitespace, followed by ANOTHER closing brace line, followed by method start.

      // Wait, looking at the file view:
      // 257: }
      // ... comments ...
      // 260: }
      // 261: async trigger...

      // So we want to remove the } that immediately precedes the async method, if there was already a } earlier.
      // This is hard to parse with regex safely globally.

      // Safer approach: The specific files and lines are known or follow a very specific structure inserted by the bad refactor.
      // The bad refactor inserted `}` before `async` methods in some cases.

      // Let's look for `}\s*async` where indentation matches.

      // In the example:
      //   }
      //   async triggerCapabilityFlow

      // If we delete the `}` at line 260, we rely on 257 being the real closer.
    }

    // Regex replacement for the specific corruption pattern:
    // "  }\n  async " -> "  async "
    // But only if preceded by another } closely? No, let's assume the syntax error check found them.

    // Better Regex:
    // Look for a } that is clearly extra.
    // `^\s*}\s*$` line, followed by `^\s*async \w+\(`

    // Let's just try to remove lines that are exactly "  }" or "}" if they cause syntax errors.
    // But we can't check syntax errors easily in node without parsing.

    // Let's target the specific files with parsing errors first.

    // Pattern found in read_file:
    //   }
    //   async functionName

    // Replacing `\n\s*}\s*\n(\s*async\s+\w+)` with `\n$1`

    content = content.replace(/\n\s*\}\s*\n(\s*(?:\/\*[\s\S]*?\*\/|\/\/.*?\n\s*)*async\s+\w+\()/g, '\n$1');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error fixing ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🔧 FIXING ORPHAN BRACES\n');

  // Files identified with Parsing errors
  const filesToFix = [
    'drivers/switch_1gang/device.js',
    'drivers/switch_2gang/device.js',
    'drivers/switch_3gang/device.js',
    'drivers/switch_4gang/device.js',
    'drivers/button_wireless/device.js',
    'drivers/climate_monitor/device.js',
    'drivers/doorbell_button/device.js',
    'drivers/switch_basic_2gang_usb/device.js',
    'drivers/switch_generic_3gang/device.js'
    // Add others from lint report if pattern matches
  ];

  let fixed = 0;

  for (const file of filesToFix) {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      const wasFixed = await fixOrphanBraces(filePath);
      if (wasFixed) {
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  No change: ${file}`);
      }
    }
  }

  console.log(`\nFixed ${fixed} files.`);
}

main().catch(console.error);
