#!/usr/bin/env node
/**
 * 🌌 INTELLIGENT_ENGINE_STABILIZER.js - v1.1.0
 * The definitive, self-validating stabilization engine for Universal Tuya Zigbee.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const TMP_FILE = path.join(ROOT, '.stabilizer_temp.js');

function log(msg) { console.log(`[STABILIZER] ${msg}`); }
function warn(msg) { console.warn(`[WARN] ${msg}`); }
function error(msg) { console.error(`[ERROR] ${msg}`); }

function validateSyntax(content) {
  try {
    fs.writeFileSync(TMP_FILE, content);
    const result = spawnSync('node', ['-c', TMP_FILE]);
    fs.unlinkSync(TMP_FILE);
    return result.status === 0;
  } catch (e) {
    if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE);
    return false;
  }
}

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'quarantine'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
      callback(fullPath);
    }
  }
}

const RULES = [
  // --- 🛡️ ANTI-CORRUPTION (Fixing Bot/Regex Mistakes) ---
  {
    id: 'ANTI_DOUBLE_CONST',
    desc: 'Remove double const declarations like const card = const card =',
    ext: '.js',
    fix: (code) => code.replace(/const\s+(\w+)\s*=\s*const\s+\1\s*=/g, 'const $1 =')
  },
  {
    id: 'ANTI_BROKEN_MATH_PARENS',
    desc: 'Fix missing closing parentheses in nested Math calls',
    ext: '.js',
    fix: (code) => {
      // Math.max(A, Math.min(B, C); -> Math.max(A, Math.min(B, C));
      return code.replace(/(Math\.(?:max|min)\([^;]+?\([^;]+?\))\s*;/g, (match, p1) => {
          // Count open and close parens in p1
          const open = (p1.match(/\(/g) || []).length;
          const close = (p1.match(/\)/g) || []).length;
          if (open > close) {
              return p1 + ')'.repeat(open - close) + ';';
          }
          return match;
      });
    }
  },
  {
    id: 'ANTI_BROKEN_CALLBACK_PARENS',
    desc: 'Fix missing outer parens in arrow function one-liners with catch',
    ext: '.js',
    fix: (code) => code.replace(/=>\s*(this\.setCapabilityValue\([^)]+\)\.catch\(\(\)\s*=>\s*{\s*}\s*\))\s*;/g, '=> $1);')
  },
  {
    id: 'ANTI_MALFORMED_OBJECT',
    desc: 'Fix { 1, 2 } style malformed objects',
    ext: '.js',
    fix: (code) => code.replace(/\{\s*(\d+)\s*,\s*(\d+)\s*\}/g, '{ $1: null, $2: null }')
  },

  // --- 🏗️ ARCHITECTURAL RULES (v7.2.0) ---
  {
    id: 'R3_DUPLICATE_CORRELATION',
    desc: 'Inject duplicate correlation check in capability listeners',
    ext: '.js',
    fix: (code) => {
      if ((code.includes('BaseHybridDevice') || code.includes('HybridSensorBase')) && 
          code.includes('registerCapabilityListener') && 
          !code.includes('_isDuplicateCorrelation')) {
          return code.replace(/(registerCapabilityListener\(['"][^'"]+['"],\s*async\s*\(v\)\s*=>\s*\{)/g, 
            '$1\n      if (this._isDuplicateCorrelation(v)) return;');
      }
      return code;
    }
  },

  // --- ⚡ SDK3 & PERFORMANCE RULES ---
  {
    id: 'SDK3_PHANTOM_METHODS',
    desc: 'Normalize getDevice*Card to get*Card',
    ext: '.js',
    fix: (code) => code.replace(/\.getDevice(Condition|Action|Trigger)Card\s*\(/g, '.get$1Card(')
  },
  {
    id: 'THIS_PREFIX_SAFETY',
    desc: 'Ensure SDK methods are prefixed with this.',
    ext: '.js',
    fix: (code) => {
      const methods = ['setCapabilityValue', 'getCapabilityValue', 'hasCapability', 'setSettings', 'getSettings'];
      methods.forEach(m => {
        const regex = new RegExp(`(^|[^a-zA-Z0-9_.$])(?<!this\\.|super\\.|device\\.|node\\.)(${m})\\s*\\(`, 'g');
        code = code.replace(regex, '$1this.$2(');
      });
      return code;
    }
  },
  {
    id: 'ENERGY_BATTERIES',
    desc: 'Ensure energy.batteries exists if measure_battery is used',
    ext: '.json',
    fix: (code, filePath) => {
      if (!filePath.endsWith('driver.compose.json')) return code;
      try {
        const json = JSON.parse(code);
        if (json.capabilities && (json.capabilities.includes('measure_battery') || json.capabilities.includes('alarm_battery'))) {
          if (!json.energy || !json.energy.batteries) {
            json.energy = json.energy || {};
            json.energy.batteries = ['CR2450'];
            return JSON.stringify(json, null, 2) + '\n';
          }
        }
      } catch (e) {}
      return code;
    }
  },
  {
    id: 'PUNYCODE_DEPRECATION',
    desc: 'Replace internal punycode with userland punycode/',
    ext: '.js',
    fix: (code) => code.replace(/require\s*\(\s*['"]punycode['"]\s*\)/g, "require('punycode/')")
  },
/*
  {
    id: 'UNWRAP_NESTED_FLOW_WRAPPERS',
    desc: 'Unwrap recursively nested try-catch flow wrappers',
    ext: '.js',
    fix: (code) => {
      // Matches: (() => { try { return (() => { try { return ... } catch (e) { return null; } })() } catch (e) { return null; } })()
      // We want to simplify it back to a single wrapper
      let previousCode;
      do {
        previousCode = code;
        code = code.replace(/\(\(\)\s*=>\s*{\s*try\s*{\s*return\s+\(\(\)\s*=>\s*{\s*try\s*{\s*return\s+([^;]+);\s*}\s*catch\s*\(e\)\s*{\s*return\s+null;\s*}\s*}\)\(\);\s*}\s*catch\s*\(e\)\s*{\s*return\s+null;\s*}\s*}\)\(\)/g, '(() => { try { return $1; } catch (e) { return null; } })()');
      } while (code !== previousCode);
      return code;
    }
  },
*/
/*
  {
    id: 'SAFE_FLOW_LOOKUP',
    desc: 'Wrap Flow card lookups in try-catch wrapper',
    ext: '.js',
    fix: (code) => {
      if (!code.includes('this.homey.flow')) return code;
      const methods = ['getTriggerCard', 'getActionCard', 'getConditionCard', 'getDeviceTriggerCard', 'getDeviceActionCard', 'getDeviceConditionCard'];
      methods.forEach(m => {
        // Updated regex to avoid matching already-wrapped calls
        const regex = new RegExp(`(?<!try\\s*{\\s*return\\s+)this\\.homey\\.flow\\.${m}\\s*\\(([^)]+)\\)`, 'g');
        code = code.replace(regex, (match, args) => {
          if (code.includes('_getFlowCard')) return `this._getFlowCard(${args}, '${m.toLowerCase().includes('trigger') ? 'trigger' : m.toLowerCase().includes('action') ? 'action' : 'condition'}')`;
          return `(() => { try { return ${match}; } catch (e) { return null; } })()`;
        });
      });
      return code;
    }
  },
*/
  {
    id: 'FIX_INVALID_RETURN_TERNARY',
    desc: 'Fix "return x : y" which should be "return x ? x : y"',
    ext: '.js',
    fix: (code) => {
      return code.replace(/return\s+([a-zA-Z0-9_$.?()\[\]]+)\s*:\s*([^;]+);/g, (match, p1, p2) => {
        if (!p1.includes('?') && !p1.includes('{')) {
          return `return ${p1.trim()} ? ${p1.trim()} : ${p2.trim()};`;
        }
        return match;
      });
    }
  },
  {
    id: 'FIX_MISSING_TERNARY_COLON',
    desc: 'Fix "return x ? y ;" which should be "return x ? y;"',
    ext: '.js',
    fix: (code) => {
      // Regex updated to avoid matching optional chaining ?.
      return code.replace(/return\s+([^?;. \t]+)\s*\?\s+(?!\.)([^?;]+);/g, (match, p1, p2) => {
        if (!p2.includes(':')) {
           return `return ${p1.trim()} ? ${p2.trim()};`;
        }
        return match;
      });
    }
  },
/*
  {
    id: 'DEEP_PAREN_BALANCER',
    desc: 'Fix unclosed/overclosed parentheses at end of lines',
    ext: '.js',
    fix: (code) => {
      return code.split('\n').map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return line;
        
        // Skip lines that already look like balanced one-liners or complex structures
        if (trimmed.includes('(() => { try { return')) return line;

        // Target lines that look like method calls or assignments and end with ; or )
        if (trimmed.includes('(') && (trimmed.endsWith(';') || trimmed.endsWith(')'))) {
          let open = (line.match(/\(/g) || []).length;
          let close = (line.match(/\)/g) || []).length;
          
          if (open > close) {
            let suffix = ')'.repeat(open - close);
            if (line.endsWith(';')) return line.slice(0, -1).trimEnd() + suffix + ';';
            return line.trimEnd() + suffix;
          }
          
          if (close > open && trimmed.endsWith(');')) {
            let newLine = line;
            let tempClose = close;
            // Only remove trailing parentheses if they are actually redundant
            while (tempClose > open && newLine.trim().endsWith('));')) {
              let lastParen = newLine.lastIndexOf(')');
              if (lastParen === -1) break;
              newLine = newLine.substring(0, lastParen) + newLine.substring(lastParen + 1);
              tempClose--;
            }
            return newLine;
          }
        }
        return line;
      }).join('\n');
    }
  },
*/
  {
    id: 'FIX_INVALID_METHOD_DECLARATION',
    desc: 'Fix "async this.method(" which should be "async method("',
    ext: '.js',
    fix: (code) => code.replace(/async\s+this\.(\w+)\s*\(/g, 'async $1(')
  },
  {
    id: 'DEFENSIVE_GET_DEVICE',
    desc: 'Inject defensive getDeviceById override',
    ext: '.js',
    fix: (code) => {
      if (code.includes('extends ZigBeeDriver') && !code.includes('getDeviceById')) {
        const injection = `\n  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(\`[CRASH-PREVENTION] Could not get device by id: \${id} - \${err.message}\`); return null; } }\n`;
        return code.replace(/(class\s+\w+\s+extends\s+ZigBeeDriver\s*\{)/, `$1${injection}`);
      }
      return code;
    }
  }


];

async function main() {
  log('Starting Intelligent Engine Stabilizer (v1.1.0)...');
  let stats = { processed: 0, fixed: 0, skipped: 0 };

  const targetDirs = [DRIVERS_DIR, LIB_DIR];
  targetDirs.forEach(dir => {
    walk(dir, (filePath) => {
      let originalContent = fs.readFileSync(filePath, 'utf8');
      let currentContent = originalContent;
      let appliedRules = [];

      RULES.filter(r => filePath.endsWith(r.ext)).forEach(rule => {
        let newContent = rule.fix(currentContent, filePath);
        if (newContent !== currentContent) {
          currentContent = newContent;
          appliedRules.push(rule.id);
        }
      });

      if (appliedRules.length > 0) {
        // Validation check
        let isValid = false;
        if (filePath.endsWith('.js')) {
          isValid = validateSyntax(currentContent);
        } else if (filePath.endsWith('.json')) {
          try {
            JSON.parse(currentContent);
            isValid = true;
          } catch (e) {
            isValid = false;
          }
        }

        if (isValid) {
          fs.writeFileSync(filePath, currentContent);
          stats.fixed++;
          log(`  [OK] ${appliedRules.join(', ')} -> ${path.relative(ROOT, filePath)}`);
        } else {
          stats.skipped++;
          warn(`  [FAIL] ${appliedRules.join(', ')} rejected (Final state invalid) for ${path.relative(ROOT, filePath)}`);
          // Detailed log for debugging
          fs.writeFileSync(TMP_FILE, currentContent);
          const result = spawnSync('node', ['-c', TMP_FILE]);
          if (result.stderr) {
            console.error(result.stderr.toString());
          }
          fs.unlinkSync(TMP_FILE);
        }
      }
      stats.processed++;
    });
  });

  log(`Stabilization complete.`);
  log(`Summary: Processed: ${stats.processed} | Fixed: ${stats.fixed} | Skipped: ${stats.skipped}`);
}

main().catch(e => {
  error(`Fatal: ${e.message}`);
  process.exit(1);
});
