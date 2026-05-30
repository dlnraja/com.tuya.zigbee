'use strict';
const fs = require('fs');

// Fix VirtualButtonMixin imports: add .js extension
const drivers = ['button_wireless_fingerbot', 'button_wireless_switch', 'remote_button_wireless_fingerbot'];
for (const d of drivers) {
  const f = `drivers/${d}/device.js`;
  if (!fs.existsSync(f)) { console.log('SKIP: ' + f); continue; }
  let src = fs.readFileSync(f, 'utf8');
  const before = src;
  src = src.replace(
    "require('../../lib/mixins/VirtualButtonMixin')",
    "require('../../lib/mixins/VirtualButtonMixin.js')"
  ).replace(
    'require("../../lib/mixins/VirtualButtonMixin")',
    'require("../../lib/mixins/VirtualButtonMixin.js")'
  );
  if (src !== before) {
    fs.writeFileSync(f, src, 'utf8');
    console.log('FIXED: ' + d);
  } else {
    console.log('NO CHANGE: ' + d);
  }
  // Verify
  const verify = fs.readFileSync(f, 'utf8');
  const lines = verify.split('\n').filter(l => l.includes('VirtualButtonMixin'));
  lines.forEach(l => console.log('  ' + l.trim()));
}
