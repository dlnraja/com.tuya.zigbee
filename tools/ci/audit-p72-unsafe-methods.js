#!/usr/bin/env node
/**
 * P72 — Audit for unsafe method calls in driver.js files.
 * Looks for:
 *   - this._method()  (where _method might not be defined)
 *   - this.method()    (where method might not be defined)
 * Reports files that don't guard with `typeof` checks before calling.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

const PATTERNS = [
  // Look for unsafe calls — method invocations without a guard in same scope
  { name: 'this._sendCommand', regex: /\bthis\._sendCommand\s*\(/ },
  { name: 'this._tuyaCommand', regex: /\bthis\._tuyaCommand\s*\(/ },
  { name: 'this._getClusterAttribute', regex: /\bthis\._getClusterAttribute\s*\(/ },
  { name: 'this._setCapabilityValue', regex: /\bthis\._setCapabilityValue\s*\(/ },
  { name: 'this._handleCluster57346Attr', regex: /\bthis\._handleCluster57346Attr\s*\(/ },
  { name: 'this._handleTuyaResponse', regex: /\bthis\._handleTuyaResponse\s*\(/ },
  { name: 'this._handleTuyaDatapoint', regex: /\bthis\._handleTuyaDatapoint\s*\(/ },
  { name: 'this._sendTuyaDP', regex: /\bthis\._sendTuyaDP\s*\(/ },
  { name: 'this._setTemperature', regex: /\bthis\._setTemperature\s*\(/ },
  { name: 'this._setHumidity', regex: /\bthis\._setHumidity\s*\(/ },
];

let found = [];

function checkGuard(content, regex, idx) {
  // Look in 30 lines before for `typeof this.<name> === 'function'` or `if (this.<name>)`
  const start = Math.max(0, idx - 30);
  const before = content.split('\n').slice(start, idx).join('\n');
  const name = regex.source.match(/\\\bthis\\\.(_\w+)\\\s/)?.[1];
  if (!name) return true;
  const guardRegex = new RegExp(`typeof\\s+this\\.${name}\\s*===?\\s*['"]function['"]|if\\s*\\(\\s*this\\.${name}\\b|typeof\\s+this\\.${name}\\s*===?\\s*['"]object['"]|\\bthis\\.${name}\\s*=\\s*\\{`);
  return guardRegex.test(before);
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(full);
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pat of PATTERNS) {
          if (pat.regex.test(line)) {
            if (!checkGuard(content, pat.regex, i)) {
              found.push({ file: full.replace(ROOT + '\\', ''), line: i + 1, pattern: pat.name, content: line.trim() });
            }
          }
        }
      }
    }
  }
}

walk(DRIVERS);

console.log(`FOUND ${found.length} potentially unsafe method calls (no guard):`);
for (const f of found.slice(0, 50)) {
  console.log(`  ${f.file}:${f.line}  ${f.pattern}  -> ${f.content.slice(0, 100)}`);
}
if (found.length > 50) console.log(`  ... and ${found.length - 50} more`);
