const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('drivers/+(switch_*gang|wall_switch_*)/driver.js');

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace turn_on
  let rxOn = /this\.homey\.flow\.getActionCard\(`([^`]+_turn_on_\$\{gang\})`\)\s*\.registerRunListener\(async\s*\(\s*args\s*\)\s*=>\s*\{[\s\S]*?await\s*args\.device\._setGangOnOff\([^)]*\).*?\n(?:.*await\s*args\.device\.setCapabilityValue\([^)]*\).*?\n)?.*return\s*true;\s*\}\);/g;
  if (rxOn.test(text)) {
    text = text.replace(rxOn, (match, cardId) => {
      return `this.homey.flow.getActionCard(\`${cardId}\`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : \`onoff.gang\${idx + 1}\`;
            try { await args.device.triggerCapabilityListener(cap, true); } catch(e) {}
            return true;
          });`;
    });
    changed = true;
  }

  // Replace turn_off
  let rxOff = /this\.homey\.flow\.getActionCard\(`([^`]+_turn_off_\$\{gang\})`\)\s*\.registerRunListener\(async\s*\(\s*args\s*\)\s*=>\s*\{[\s\S]*?await\s*args\.device\._setGangOnOff\([^)]*\).*?\n(?:.*await\s*args\.device\.setCapabilityValue\([^)]*\).*?\n)?.*return\s*true;\s*\}\);/g;
  if (rxOff.test(text)) {
    text = text.replace(rxOff, (match, cardId) => {
      return `this.homey.flow.getActionCard(\`${cardId}\`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : \`onoff.gang\${idx + 1}\`;
            try { await args.device.triggerCapabilityListener(cap, false); } catch(e) {}
            return true;
          });`;
    });
    changed = true;
  }

  // Replace toggle per gang
  let rxToggle = /this\.homey\.flow\.getActionCard\(`([^`]+_toggle_\$\{gang\})`\)\s*\.registerRunListener\(async\s*\(\s*args\s*\)\s*=>\s*\{[\s\S]*?await\s*args\.device\._setGangOnOff\([^)]*\).*?\n(?:.*await\s*args\.device\.setCapabilityValue\([^)]*\).*?\n)?.*return\s*true;\s*\}\);/g;
  if (rxToggle.test(text)) {
    text = text.replace(rxToggle, (match, cardId) => {
      return `this.homey.flow.getActionCard(\`${cardId}\`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : \`onoff.gang\${idx + 1}\`;
            const v = args.device.getCapabilityValue(cap);
            try { await args.device.triggerCapabilityListener(cap, !v); } catch(e) {}
            return true;
          });`;
    });
    changed = true;
  }

  // Replace ALL ON
  let rxAllOn = /this\.homey\.flow\.getActionCard\((['"])([^'"]+_turn_on_all)['"]\)\s*\.registerRunListener\(async\s*\(\s*args\s*\)\s*=>\s*\{[\s\S]*?for\s*\([^)]+\)\s*\{[\s\S]*?await\s*args\.device\._setGangOnOff\([^)]+\).*?\n[\s\S]*?\}\s*return\s*true;\s*\}\);/g;
  if (rxAllOn.test(text)) {
    text = text.replace(rxAllOn, (match, quote, cardId) => {
      // Find gang count from the class or file name
      const m = file.match(/(\d+)gang/);
      const gc = m ? m[1] : 3;
      return `this.homey.flow.getActionCard('${cardId}')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (let i = 1; i <= ${gc}; i++) {
            const cap = i === 1 ? 'onoff' : \`onoff.gang\${i}\`;
            if (args.device.hasCapability(cap)) {
               try { await args.device.triggerCapabilityListener(cap, true); } catch(e) {}
            }
          }
          return true;
        });`;
    });
    changed = true;
  }

  // Replace ALL OFF
  let rxAllOff = /this\.homey\.flow\.getActionCard\((['"])([^'"]+_turn_off_all)['"]\)\s*\.registerRunListener\(async\s*\(\s*args\s*\)\s*=>\s*\{[\s\S]*?for\s*\([^)]+\)\s*\{[\s\S]*?await\s*args\.device\._setGangOnOff\([^)]+\).*?\n[\s\S]*?\}\s*return\s*true;\s*\}\);/g;
  if (rxAllOff.test(text)) {
    text = text.replace(rxAllOff, (match, quote, cardId) => {
      // Find gang count from the class or file name
      const m = file.match(/(\d+)gang/);
      const gc = m ? m[1] : 3;
      return `this.homey.flow.getActionCard('${cardId}')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (let i = 1; i <= ${gc}; i++) {
            const cap = i === 1 ? 'onoff' : \`onoff.gang\${i}\`;
            if (args.device.hasCapability(cap)) {
               try { await args.device.triggerCapabilityListener(cap, false); } catch(e) {}
            }
          }
          return true;
        });`;
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, text);
    console.log('Fixed flow actions in: ' + file);
  }
}
