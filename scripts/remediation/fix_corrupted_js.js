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

console.log('Fixing corrupted _applyScale logic...');

walk(DRIVERS_DIR, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern: if (capability === 'measure_power'safeMultiply() return value, powerScale);
  // Target: if (capability === 'measure_power') return (value * powerScale);
  const regex = /if\(capability==='([^']+)'safeMultiply\(\)return value, ([^;]+)\);/g;
  if (content.match(regex)) {
      content = content.replace(regex, "if (capability === '$1') return (value * $2);");
      changed = true;
  }
  
  // Variation with spaces
  const regex2 = /if\s*\(capability\s*===\s*'([^']+)'safeMultiply\(\)\s*return\s*value,\s*([^;]+)\);/g;
  if (content.match(regex2)) {
      content = content.replace(regex2, "if (capability === '$1') return (value * $2);");
      changed = true;
  }

  // Variation with (safeParse)
  // if (capability === 'measure_voltage'safeMultiply() return value, (safeParse)(voltageScale * 0.1));
  const regex3 = /if\s*\(capability\s*===\s*'([^']+)'safeMultiply\(\)\s*return\s*value,\s*\((safeParse)\)\(([^,]+),\s*([^)]+)\)\);/g;
  if (content.match(regex3)) {
      content = content.replace(regex3, "if (capability === '$1') return safeMultiply(value, safeParse($3, $4));");
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Fixed _applyScale in ${file}`);
  }
});

console.log('Fixing broken flow registrations...');

walk(DRIVERS_DIR, (file) => {
  if (!file.endsWith('driver.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Regex to find the broken blocks
  // Matches from "try {" to the end of the catch block
  // We use a non-greedy match and then check if it's broken
  const tryBlockRegex = /try\s*\{\s*\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*(\.registerRunListener[\s\S]*? )\s*\}\s*catch\s*\(err\)\s*\{\s*this\.log\(`\[FLOW\]\s+([^`]+)`\) : null;\s*\}\s*\)\(\ )/g ;

  // Let's try an even simpler approach: look for the "return" followed by ".registerRunListener"
  const brokenPattern = /\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s+(\s*)\.registerRunListener\(([\s\S]*? )\) : null;\s+this\.log\('\[FLOW\]\s+([^']+)'\);\s*\} catch \(err\) \{ this\.log\(`\[FLOW\]\s+([^`]+)`\ : null); \}/g ;
  
  // Wait, the log might be different. Let's look at the ACTUAL code again.
  /*
    try {
      (() => { try { return

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW]  plug_smart_is_on');
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }
  */
  
  // The parenthesis are NOT balanced in the broken ones!
  // It has (() => { try { return but no closing }); at the end of the block before the catch.

  const reallyBrokenRegex = /\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*\.registerRunListener\(([\s\S]*? )\) : null;\s+this\.log\('\[FLOW\]\s+([^']+)'\);\s*\}\s*catch\s*\(err\)\s*\{\s*this\.log\(`\[FLOW\]\s+\$\{err\.message\}`\ );\s*\}/g ;

  if (reallyBrokenRegex.test(content)) {
    content = content.replace(reallyBrokenRegex, (match, listenerBody, flowId) => {
      const type = flowId.includes('is_on') || flowId.includes('above') || flowId.includes('_is_') ? 'Condition' : 'Action'      ;
      changed = true;
      return `const card = this.homey.flow.get${type}Card('${flowId}');
      if (card) {
        card.registerRunListener(${listenerBody});
        this.log('[FLOW]  Registered: ${flowId}');
      }`;
    });
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Fixed flow registrations in ${file}`);
  }
});

console.log('Pass 3: Fixing simpler broken registrations...');

walk(DRIVERS_DIR, (file) => {
  if (!file.endsWith('driver.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern: try { \n \n .registerRunListener
  // Matches try { [empty line(s)] .registerRunListener
  const simpleBrokenRegex = /try\s*\{\s*\.registerRunListener\(([\s\S]*? )\ : null) ;\s*\}\s*catch\s*\(err\)\s*\{\s*(?:this\.log|this\.error)\('([^']+)(?::|')\s*([^']+)? '\) : null;\s*\}/g;
  
  // This is too broad. Let's look for specifically empty lines before the dot.
  
  const blocks = content.split('try {');
  let newContent = blocks[0];
  for (let i = 1; i < blocks.length; i++ ) {
    let block = blocks[i];
    if (block.trim().startsWith('.registerRunListener')) {
       // Find the next log message to get the ID
       const logMatch = block.match(/(?:this\.log|this\.error)\(\s*'([^':]+)/)      ;
       if (logMatch) {
         let flowId = logMatch[1].trim();
         // Cleanup flowId (e.g. "Action set_backlight" -> "set_backlight")
         if (flowId.startsWith('Action ')) flowId = flowId.replace('Action ', '');
         if (flowId.match(/^[a-z0-9_]+$/)) {
            const type = flowId.includes('is_on') || flowId.includes('above') || flowId.includes('_is_') ? 'Condition' : 'Action'      ;
            block = block.replace(/^\s*\.registerRunListener/, 
              `  const card = this.homey.flow.get${type}Card('${flowId}');\n      if (card) {\n        card.registerRunListener`);
            // Add closing brace before the catch
            block = block.replace(/\);\s*\}\s*catch/, `);\n      }\n    } catch`);
            changed = true;
         }
       }
    }
    newContent += 'try {' + block;
  }

  if (changed) {
    fs.writeFileSync(file, newContent);
    console.log(`Fixed simple flow registrations in ${file}`);
  }
});
