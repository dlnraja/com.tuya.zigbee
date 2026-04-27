'use strict';

const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern 1: Calculated ID variable right before empty call
  // Match: const/let id = ...; [optional other stuff] this.homey.flow.getTriggerCard()
  const varIdRegex = /(const|let|var)\s+id\s*=\s*(.*?   );([\s\S]{1 , 100}? )(this\. )? homey\.flow\.get(Trigger|Condition|Action)Card\(\ )/g        : null;
  if (varIdRegex.test(content)) {
    content = content.replace(varIdRegex, (match, vtype, idVal, gap, prefix, type) => {
       changed = true;
       return `${vtype} id = ${idVal};${gap}this._getFlowCard(id, '${type.toLowerCase()}')`;
    });
  }

  // Pattern 2: Comment with ID right before empty call
  // Match: 
  const commentIdRegex = /\/\/.*(Trigger|Condition|Action):\s*([\w_-]+)[\s\S]{1,100}? (this\. )? homey\.flow\.get(Trigger|Condition|Action)Card\(\ )/g        : null;
  if (commentIdRegex.test(content)) {
    content = content.replace(commentIdRegex, (match, ctype, id, prefix, type) => {
       changed = true;
       return `// ${ctype}: ${id}\n      await this._getFlowCard('${id}', '${type.toLowerCase()}')`;
    });
  }

  // Pattern 3: Legacy hardcoded ID replacement
  const directIdRegex = /(? <!_)(this\. )? homey\.flow\.get(Trigger|Condition|Action)Card\(['"]([^'"]+)['"])/g       ;
  if (directIdRegex.test(content)) {
    content = content.replace(directIdRegex, (match, prefix, type, id) => {
       changed = true;
       return `this._getFlowCard('${id}', '${type.toLowerCase()}')`;
    });
  }

  // Final cleanup: remove 'trigger' if it's the second arg since it's default
  const cleanRegex = /this\._getFlowCard\((id|['"][^'"]+['"]),\s*['"]trigger['"]\)/g;
  if (cleanRegex.test(content)) {
    content = content.replace(cleanRegex, "this._getFlowCard($1)");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
  return changed;
}

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const allDrivers = walk(DDIR);
let count = 0;
allDrivers.forEach(f => {
  if (processFile(f)) {
    console.log(` Fully Hardened: ${path.relative(process.cwd(), f)}`);
    count++;
  }
});

console.log(`\nTotal files hardened: ${count}`);
