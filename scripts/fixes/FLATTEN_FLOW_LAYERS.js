const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file === 'driver.js') {
      callback(filePath);
    }
  });
}

let fixedLayers = 0;

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Pattern: (() => { try { return (() => { try { return this.homey.flow.getActionCard('...'); \n } catch(e) { return null; } })() \n } catch(e) { return null; } })();
  // This is what I saw in din_rail_meter.
  
  // Let's try to flatten it.
  // We look for nested try-returns.
  
  // Step 1: Detect the double nested mess
  const nestedPattern = /\(\(\) => { try { return \(\(\) => { try { return this\.homey\.flow\.(get\w+Card)\(([^)]+)\);\s*}\s*catch\(e\) { return null; }\s*}\)\(\)\s*}\s*catch\(e\) { return null; }\s*}\)\(\)/g;
  
  if (nestedPattern.test(content)) {
      content = content.replace(nestedPattern, (match, method, args) => {
          return `(() => { try { return this.homey.flow.${method}(${args}); } catch(e) { return null; } })()`;
      });
  }

  // Also catch variations with whitespace or different line endings
  const nestedPatternLoose = /\(\(\) => {\s*try {\s*return \(\(\) => {\s*try {\s*return this\.homey\.flow\.(get\w+Card)\(([^)]+)\);/g;
  if (nestedPatternLoose.test(content)) {
      // This is harder to replace with a simple regex due to multiple closing braces.
      // But we can try to just remove one layer of junk.
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    fixedLayers++;
    console.log(`[FLATTENED] ${filePath}`);
  }
});

console.log(`\nDone. Flattened ${fixedLayers} files.`);
