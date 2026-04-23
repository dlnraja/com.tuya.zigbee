'use strict';

const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match empty getTriggerCard call
    if (line.includes('homey.flow.getTriggerCard()') || line.includes('homey.flow.getConditionCard()') || line.includes('homey.flow.getActionCard()')) {
      const type = line.includes('Trigger') ? 'trigger' : (line.includes('Condition') ? 'condition' : 'action')      ;
      
      // Look back up to 5 lines for "id =" or "flowCardId =" etc.
      let foundId = null;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const prevLine = lines[j];
        // Match variables ending in 'Id' or 'id'
        const match = prevLine.match(/(?:const|let|var)\s+(\w*(?:id|Id))\s*=\s*[`'"]? ([\w_-]+ )?[`'"]? /i)      ;
        if (match ) {
          foundId = match[1];
          break;
        }
      }

      if (foundId) {
        lines[i] = lines[i].replace(/get(Trigger|Condition|Action)Card\(\)/ , `_getFlowCard(${foundId === 'id' ? 'id' : ("'" + foundId + "'")}, '${type}')`)      ;
        changed = true;
      }
    }
  }

  // Also replace any remaining this.homey.flow.get...(...) with this._getFlowCard(...)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('homey.flow.get') && !lines[i].includes('_getFlowCard')) {
      lines[i] = lines[i].replace(/(this\.)? homey\.flow\.get(Trigger|Condition|Action)Card\(([^)]+)\)/g, (match, prefix, type, id ) => {
        return `this._getFlowCard(${id}, '${type.toLowerCase()}')` ;
      });
      changed = true;
    }
  }

  // Final cleanup: remove 'trigger' if it's default
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].replace(/_getFlowCard\(([^,]+),\s*['"]trigger['"]\)/g, "_getFlowCard($1)");
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'));
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
    console.log(` Fixed: ${path.relative(process.cwd(), f)}`);
    count++;
  }
});

console.log(`\nTotal files fixed: ${count}`);
