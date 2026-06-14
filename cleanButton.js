const fs = require('fs');
const file = 'lib/devices/ButtonDevice.js';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const methodsToRemove = [
  '_universalSceneModeSwitch', 
  '_registerButtonCapabilityListeners', 
  '_switchToSceneMode', 
  '_scheduleSceneModeRecovery', 
  '_reapplySceneModeOnWake', 
  'setupButtonDetection', 
  'handleButtonCommand', 
  'triggerButtonPress', 
  '_tryCard', 
  '_triggerHoldRelease'
];

let out = [];
let inRemoveBlock = false;
let braceLevel = 0;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  let startMethod = false;

  if (!inRemoveBlock && braceLevel === 1) {
    for (const m of methodsToRemove) {
      if (l.match(new RegExp('^  (async )?_?' + m + '\\('))) {
        inRemoveBlock = true;
        startMethod = true;
        break;
      }
    }
  }

  if (inRemoveBlock) {
    if (l.includes('{')) braceLevel += (l.match(/\{/g) || []).length;
    if (l.includes('}')) braceLevel -= (l.match(/\}/g) || []).length;
    
    if (braceLevel === 1 && !startMethod && l.includes('}')) {
      inRemoveBlock = false;
    }
    continue;
  }

  if (l.includes('{')) braceLevel += (l.match(/\{/g) || []).length;
  if (l.includes('}')) braceLevel -= (l.match(/\}/g) || []).length;
  
  out.push(l);
}

fs.writeFileSync(file, out.join('\n'));
console.log('Removed legacy methods successfully.');
