// scripts/automation/apply-antigravity.js
const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

function getFunctionBody(content, functionName) {
  const regex = new RegExp(`async\\s+${functionName}\\s*\\(([^)]*)\\)\\s*{`, 'm');
  const match = content.match(regex);
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  let count = 1;
  let endIdx = startIdx;

  while (count > 0 && endIdx < content.length) {
    if (content[endIdx] === '{') count++;
    else if (content[endIdx] === '}') count--;
    endIdx++;
  }

  if (count === 0) {
    return {
      params: match[1],
      body: content.substring(startIdx, endIdx - 1),
      fullMatch: content.substring(match.index, endIdx)
    };
  }
  return null;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const nodeInit = getFunctionBody(content, 'onNodeInit');
  if (nodeInit) {
    let body = nodeInit.body.trim();
    
    // 1. CLEANUP: Detect and fix malformed previous attempts
    if (body.includes("_safeInvoke") && (body.includes("'onNodeInit')") || body.includes('"onNodeInit"'))) {
        // Remove existing safeInvoke wrapper to re-apply it correctly to the WHOLE body
        body = body.replace(/await\s+this\._safeInvoke\s*\(async\s*\(\)\s*=>\s*\{/g, '');
        body = body.replace(/\s*\}\s*,\s*['"]onNodeInit['"]\s*\);/g, '');
        // Fix messed up super calls
        body = body.replace(/await\s+super\.onNodeInit\s*\(\{\s*zclNode\s*\n\}/g, 'await super.onNodeInit({ zclNode })');
        body = body.replace(/await\s+super\.onNodeInit\s*\(\{\s*zclNode\s*\}\s*,\s*['"]onNodeInit['"]\s*\)/g, 'await super.onNodeInit({ zclNode })');
    }

    body = body.trim();

    // 2. Ensure super.onNodeInit exists
    if (!/await\s+super\.onNodeInit/.test(body)) {
      body = `await super.onNodeInit({ zclNode });\n    ${body}`;
    }

    // 3. WRAP: Re-apply _safeInvoke to the WHOLE body
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const wrappedBody = `\n    await this._safeInvoke(async () => {\n      ${lines.join('\n      ')}\n    }, 'onNodeInit');\n  `;
    const newFunc = `async onNodeInit(${nodeInit.params}) {${wrappedBody}}`;
    
    if (content.replace(nodeInit.fullMatch, newFunc) !== content) {
        content = content.replace(nodeInit.fullMatch, newFunc);
        changed = true;
    }
  }

  // 4. Wrap capability listeners
  const listenerRegex = /this\.registerCapabilityListener\(['"]([^'"]+)['"],\s*async\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}\);/g;
  const newContent = content.replace(listenerRegex, (full, cap, args, body) => {
    if (body.includes('_safeInvoke')) return full;
    changed = true;
    const innerBody = body.trim().split('\n').map(line => '      ' + line.trim()).join('\n');
    return `this.registerCapabilityListener('${cap}', async (${args}) => {
    await this._safeInvoke(async () => {
${innerBody}
    }, '${cap}Listener');
  });`;
  });

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[ANTIGRAVITY] Normalized: ${path.relative(driversDir, filePath)}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name === 'device.js') {
      try {
        processFile(fullPath);
      } catch (err) {
        console.error(`[ERROR] Processing ${fullPath}: ${err.message}`);
      }
    }
  }
}

console.log('Starting Antigravity fleet normalization...');
walk(driversDir);
console.log('Normalization complete.');
