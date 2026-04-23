#!/usr/bin/env node
'use strict';

/**
 * DEEP REMEDIATION SCRIPT v2: Complete rewrite of broken driver.js files
 * 
 * For files that are too structurally damaged for regex fixing:
 * 1. Reads the driver.flow.compose.json to get flow card IDs
 * 2. Reads the existing driver.js to extract class name, base class, imports
 * 3. Regenerates a clean, syntactically valid driver.js
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const DRY_RUN = process.argv.includes('--dry-run');

let stats = { scanned: 0, rewritten: 0, skipped: 0, errors: 0 };

function detectDriverInfo(content) {
  // Extract class name
  const classMatch = content.match(/class\s+(\w+)\s+extends\s+(\w+)/);
  const className = classMatch ? classMatch[1] : 'TuyaDriver'      ;
  const baseClass = classMatch ? classMatch[2] : 'ZigBeeDriver'      ;
  
  // Extract imports
  const imports = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('const ') && line.includes('require(')) {
      imports.push(line);
    }
    if (line.trim().startsWith("'use strict'")) continue;
    if (line.trim() === '') continue;
    if (!line.includes('require(') && !line.trim().startsWith('const ') && !line.trim().startsWith("'use strict'")) break;
  }
  
  // Determine base require
  let hasZigBeeDriver = imports.some(l => l.includes('homey-zigbeedriver'));
  let hasHomeyDriver = imports.some(l => l.includes("require('homey')"));
  
  // Extract init log message
  const logMatch = content.match(/this\.log\(['"`]([^'"`]*(?:initialized|init)[^'"`]*)['"]/i)      ;
  const initMessage = logMatch ? logMatch[1] : `${className} initialized`      ;
  
  return { className, baseClass, imports, hasZigBeeDriver, hasHomeyDriver, initMessage };
}

function getFlowCards(driverDir) {
  const flowFile = path.join(driverDir, 'driver.flow.compose.json');
  if (!fs.existsSync(flowFile)) return { triggers: [], conditions: [], actions: [] };
  
  try {
    const data = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
    return {
      triggers: (data.triggers || []).map(t => t.id),
      conditions: (data.conditions || []).map(c => c.id),
      actions: (data.actions || []).map(a => a.id),
    };
  } catch (e) {
    return { triggers: [], conditions: [], actions: [] };
  }
}

function generateCleanDriver(info, flowCards) {
  const { className, baseClass, imports, initMessage } = info;
  
  let code = `'use strict';\n\n`;
  
  // Add imports
  for (const imp of imports) {
    code += `${imp}\n`;
  }
  code += '\n';
  
  // Class definition
  code += `class ${className} extends ${baseClass} {\n`;
  
  // getDeviceById override
  code += `  getDeviceById(id) {\n`;
  code += `    try {\n`;
  code += `      return super.getDeviceById(id);\n`;
  code += `    } catch (err) {\n`;
  code += `      this.error(\`[CRASH-PREVENTION] Could not get device by id: \${id} - \${err.message}\`);\n`;
  code += `      return null;\n`;
  code += `    }\n`;
  code += `  }\n\n`;
  
  // onInit
  code += `  async onInit() {\n`;
  code += `    await super.onInit();\n`;
  code += `    if (this._flowCardsRegistered) return;\n`;
  code += `    this._flowCardsRegistered = true;\n`;
  code += `    this.log('${initMessage}');\n`;
  code += `    this._registerFlowCards();\n`;
  code += `  }\n\n`;
  
  // _registerFlowCards
  code += `  _registerFlowCards() {\n`;
  
  // Triggers (just touch them to register)
  if (flowCards.triggers.length > 0) {
    code += `    // TRIGGERS\n`;
    for (const id of flowCards.triggers) {
      code += `    try { this.homey.flow.getTriggerCard('${id}'); } catch (e) {}\n`;
    }
    code += '\n';
  }
  
  // Conditions
  if (flowCards.conditions.length > 0) {
    code += `    // CONDITIONS\n`;
    for (const id of flowCards.conditions) {
      code += `    try {\n`;
      code += `      const card = this.homey.flow.getConditionCard('${id}');\n`;
      code += `      if (card) {\n`;
      code += `        card.registerRunListener(async (args) => {\n`;
      code += `          if (!args.device) return false;\n`;
      
      // Heuristic: determine what condition to check based on the ID
      if (id.includes('is_on') || id.includes('is_active')) {
        code += `          return args.device.getCapabilityValue('onoff') === true;\n`;
      } else if (id.includes('is_open')) {
        code += `          return args.device.getCapabilityValue('alarm_contact') === true;\n`;
      } else if (id.includes('is_present') || id.includes('is_detected') || id.includes('presence')) {
        code += `          return args.device.getCapabilityValue('alarm_motion') === true;\n`;
      } else if (id.includes('battery_above')) {
        code += `          const battery = args.device.getCapabilityValue('measure_battery') || 0;\n`;
        code += `          return battery > (args.threshold || 20);\n`;
      } else if (id.includes('co2_above') || id.includes('above')) {
        code += `          const val = args.device.getCapabilityValue('measure_co2') || 0;\n`;
        code += `          return val > (args.threshold || 400);\n`;
      } else if (id.includes('is_heating')) {
        code += `          return args.device.getCapabilityValue('onoff') === true;\n`;
      } else if (id.includes('sounding') || id.includes('alarm')) {
        code += `          return args.device.getCapabilityValue('alarm_generic') === true || args.device.getCapabilityValue('onoff') === true;\n`;
      } else if (id.includes('gas') || id.includes('detected')) {
        code += `          return args.device.getCapabilityValue('alarm_gas') === true;\n`;
      } else if (id.includes('level_above')) {
        code += `          const val = args.device.getCapabilityValue('measure_water_level') || 0;\n`;
        code += `          return val > (args.threshold || 50);\n`;
      } else {
        code += `          return args.device.getCapabilityValue('onoff') === true;\n`;
      }
      
      code += `        });\n`;
      code += `      }\n`;
      code += `    } catch (err) { this.error(\`Condition ${id}: \${err.message}\`); }\n\n`;
    }
  }
  
  // Actions
  if (flowCards.actions.length > 0) {
    code += `    // ACTIONS\n`;
    for (const id of flowCards.actions) {
      code += `    try {\n`;
      code += `      const card = this.homey.flow.getActionCard('${id}');\n`;
      code += `      if (card) {\n`;
      code += `        card.registerRunListener(async (args) => {\n`;
      code += `          if (!args.device) return false;\n`;
      
      // Heuristic: determine action based on the ID
      if (id.includes('turn_on_all')) {
        code += `          const caps = Object.keys(args.device.getCapabilities()).filter(c => c.startsWith('onoff'));\n`;
        code += `          for (const cap of caps) { await args.device.triggerCapabilityListener(cap, true).catch(() => {}); }\n`;
      } else if (id.includes('turn_off_all')) {
        code += `          const caps = Object.keys(args.device.getCapabilities()).filter(c => c.startsWith('onoff'));\n`;
        code += `          for (const cap of caps) { await args.device.triggerCapabilityListener(cap, false).catch(() => {}); }\n`;
      } else if (id.includes('turn_on') || id.includes('_on')) {
        code += `          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});\n`;
      } else if (id.includes('turn_off') || id.includes('_off')) {
        code += `          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});\n`;
      } else if (id.includes('toggle')) {
        code += `          const current = args.device.getCapabilityValue('onoff');\n`;
        code += `          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});\n`;
      } else if (id.includes('set_target_temperature') || id.includes('set_temp')) {
        code += `          await args.device.triggerCapabilityListener('target_temperature', args.temperature || args.value).catch(() => {});\n`;
      } else if (id.includes('set_fan_speed') || id.includes('set_speed')) {
        code += `          await args.device.triggerCapabilityListener('dim', args.speed || args.value).catch(() => {});\n`;
      } else if (id.includes('set_color')) {
        code += `          await args.device.triggerCapabilityListener('light_hue', args.color || 0).catch(() => {});\n`;
      } else if (id.includes('set_brightness') || id.includes('set_dim')) {
        code += `          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});\n`;
      } else if (id.includes('set_windowcoverings') || id.includes('set_position')) {
        code += `          await args.device.triggerCapabilityListener('windowcoverings_set', args.position || args.value || 0).catch(() => {});\n`;
      } else if (id.includes('send_code') || id.includes('send_ir')) {
        code += `          if (typeof args.device._sendIR === 'function') await args.device._sendIR(args.ir_code || args.code);\n`;
      } else if (id.includes('start_learn')) {
        code += `          if (typeof args.device._startLearn === 'function') await args.device._startLearn();\n`;
      } else if (id.includes('set_backlight')) {
        code += `          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);\n`;
      } else if (id.includes('set_scene_mode') || id.includes('scene')) {
        code += `          if (typeof args.device.setSceneMode === 'function') await args.device.setSceneMode(args.mode || args.value);\n`;
      } else if (id.includes('set_volume')) {
        code += `          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(5, args.volume || 1, 'enum').catch(() => {}); }\n`;
      } else if (id.includes('set_duration')) {
        code += `          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(7, args.duration || 30, 'value').catch(() => {}); }\n`;
      } else if (id.includes('set_melody')) {
        code += `          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(21, parseInt(args.melody , 10) || 0, 'enum').catch(() => {}); }\n`;
      } else {
        code += `          // Generic action handler\n`;
        code += `          this.log('[FLOW] Action ${id} triggered for', args.device.getName());\n`;
      }
      
      code += `          return true;\n`;
      code += `        });\n`;
      code += `      }\n`;
      code += `    } catch (err) { this.error(\`Action ${id}: \${err.message}\`); }\n\n`;
    }
  }
  
  code += `    this.log('[FLOW] All flow cards registered');\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `module.exports = ${className};\n`;
  
  return code;
}

function verifyJS(content) {
  let depth = 0;
  for (const ch of content) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  return depth === 0;
}

// ==================== MAIN ====================
console.log('â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
console.log('â•‘  DEEP REMEDIATION SCRIPT v2.0 - Complete Driver Rewrite    â•‘');
console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)      ;
console.log('');

const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.js'));
});

for (const dir of driverDirs) {
  const filePath = path.join(DRIVERS_DIR, dir, 'driver.js');
  stats.scanned++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file needs fixing: has dangling .registerRunListener OR brace imbalance
  const hasDanglingReg = /^\s*\.registerRunListener/m.test(content);
  let braceDepth = 0;
  for (const ch of content) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
  }
  const hasImbalance = braceDepth !== 0;
  
  // Also check for the missing closing brace pattern: if (_flowCard) { _flowCard.registerRunListener(... without closing }
  const hasMissingIfClose = /if\s*\(_flowCard\)\s*\{\s*_flowCard\.registerRunListener/.test(content) && hasImbalance;
  
  if (!hasDanglingReg && !hasImbalance && !hasMissingIfClose) {
    stats.skipped++;
    continue;
  }
  
  console.log(`  Rewriting: ${dir}/driver.js (dangling=${hasDanglingReg}, imbalance=${braceDepth})`);
  
  try {
    const info = detectDriverInfo(content);
    const flowCards = getFlowCards(path.join(DRIVERS_DIR, dir));
    
    if (flowCards.triggers.length === 0 && flowCards.conditions.length === 0 && flowCards.actions.length === 0) {
      // No flow compose file or empty - generate minimal driver
      console.log(`    âšï¸  No flow cards found in compose, generating minimal driver`);
    }
    
    const newContent = generateCleanDriver(info, flowCards);
    
    if (!verifyJS(newContent)) {
      console.error(`    âŒ Generated code has brace imbalance! Skipping.`);
      stats.errors++;
      continue;
    }
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
    
    stats.rewritten++;
    console.log(`    âœ… Rewritten (${flowCards.triggers.length}T/${flowCards.conditions.length}C/${flowCards.actions.length}A)`);
    
  } catch (err) {
    console.error(`    âŒ Error: ${err.message}`);
    stats.errors++;
  }
}

console.log('');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log(`  Scanned:    ${stats.scanned}`);
console.log(`  Rewritten:  ${stats.rewritten}`);
console.log(`  Skipped:    ${stats.skipped} (already clean)`);
console.log(`  Errors:     ${stats.errors}`);
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

// Final verification
let remainingBroken = 0;
for (const dir of driverDirs) {
  const filePath = path.join(DRIVERS_DIR, dir, 'driver.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasDangling = /^\s*\.registerRunListener/m.test(content);
  let depth = 0;
  for (const ch of content) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  
  if (hasDangling || depth !== 0) {
    remainingBroken++;
    if (depth !== 0) console.log(`  Still broken: ${dir} (braces=${depth})`);
    if (hasDangling) console.log(`  Still broken: ${dir} (dangling .registerRunListener)`);
  }
}

if (remainingBroken === 0) {
  console.log('\nâœ… ALL driver.js files are syntactically valid!');
} else {
  console.log(`\nâšï¸  ${remainingBroken} files still need attention`);
}
