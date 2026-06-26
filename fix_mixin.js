const fs = require('fs');
const file = 'lib/mixins/PhysicalButtonMixin.js';
let content = fs.readFileSync(file, 'utf8');

// Replace all calls
content = content.replace(/this\._triggerPhysicalFlow\(/g, 'this._dispatchPhysicalButton(');

// Restore the definition of _triggerPhysicalFlow
content = content.replace(
  /_dispatchPhysicalButton\(gang, pressType, tokens = \{\}\) \{/,
  '_triggerPhysicalFlow(gang, pressType, tokens = {}) {'
);

// Inject _dispatchPhysicalButton
const triggerDef = '  _triggerPhysicalFlow(gang, pressType, tokens = {}) {';
const dispatchDef =   _dispatchPhysicalButton(gang, pressAction, tokens = {}) {
    if (typeof this.triggerButtonPress === 'function') {
      const clicks = tokens.clicks || (pressAction === 'double' ? 2 : pressAction === 'triple' ? 3 : 1);
      let normType = pressAction;
      if (normType === 'long_press') normType = 'long';
      
      // Prevent infinite loop since ButtonDevice might call _triggerPhysicalFlow
      this.triggerButtonPress(gang, normType, clicks, { source: 'physical' });
    } else {
      this._triggerPhysicalFlow(gang, pressAction, tokens);
    }
  }

   + triggerDef;

content = content.replace(triggerDef, dispatchDef);
fs.writeFileSync(file, content);
console.log('Fixed');
