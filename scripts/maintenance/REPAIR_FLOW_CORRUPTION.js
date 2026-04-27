const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function walk(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log('--- STARTING SURGICAL FLOW REPAIR V2 ---');

walk(DRIVERS_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Pattern 1: The corrupted card assignment
  // const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); ...
  const corruptedCardRegex = /const\s+card\s*=\s*\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*;\s*\}[\s\S]*?\}\)\(\);\s*(?:\}\s*catch\s*\(e\)\s*\{\s*return\s+null;\s*\}\s*\)\(\);\s*)+/g;

  // We need to find the ID which is usually a few lines down in the catch block
  // So we split the file into blocks or use a very broad regex
  
  const blockRegex = /try\s*\{\s*(const\s+card\s*=\s*\(\(\)\s*=>[\s\S]*?)(if\s*\(card\)\s*\{[\s\S]*?\})\s*\}\s*catch\s*\(err\)\s*\{\s*this\.error\(`(Action|Condition|Trigger)\s+([^:]+):/g;

  content = content.replace(blockRegex, (match, corruptedLine, ifBlock, type, id) => {
    modified = true;
    console.log(`  [FIX] Found corrupted ${type} in ${path.relative(DRIVERS_DIR, file)}: ${id}`);
    
    let method = 'getTriggerCard';
    if (type === 'Action') method = 'getActionCard';
    if (type === 'Condition') method = 'getConditionCard';

    return `try {
      const card = this.homey.flow.${method}('${id}');
      ${ifBlock}
    } catch (err) { this.error(\`${type} ${id}:`;
  });

  if (modified) {
    fs.writeFileSync(file, content);
  }
});

console.log('--- REPAIR COMPLETE ---');
