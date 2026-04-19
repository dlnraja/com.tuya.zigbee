const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

console.log('Pass 4: Fixing corrupted try/catch blocks in drivers...');

walk(DRIVERS_DIR, (file) => {
  if (!file.endsWith('driver.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Find "if (card) { ... }" blocks that are followed by another "try" or "//" without a closing catch
  // This is hard with regex. Let's look for specific missing catch blocks.
  
  const blocks = content.split('// ACTION:');
  if (blocks.length > 1) {
      // It's a partitioned driver. Let's look at each section.
  }

  // Practical fix: If we see "if (card) {" but no "} catch" before the next block, add it.
  // Actually, let's just use a more surgical replacement for what I broke.
  
  const brokenBlocks = content.split('try {');
  let newContent = brokenBlocks[0];
  
  for (let i = 1; i < brokenBlocks.length; i++) {
     let block = brokenBlocks[i];
     if (block.includes('if (card) {') && !block.includes('} catch')) {
         // It's likely missing the closing braces and catch
         // We find the last closing brace of the if(card) block
         const lastBraceIndex = block.lastIndexOf('}');
         if (lastBraceIndex !== -1) {
             const before = block.substring(0, lastBraceIndex + 1);
             const after = block.substring(lastBraceIndex + 1);
             block = before + '\n    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }' + after;
             changed = true;
         }
     }
     newContent += 'try {' + block;
  }

  if (changed) {
    fs.writeFileSync(file, newContent);
    console.log(`Fixed try/catch braces in ${file}`);
  }
});
