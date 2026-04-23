const fs = require('fs');
const file = 'drivers/switch_3gang/device.js';
let content = fs.readFileSync(file, 'utf8');

// Remove _TZ3000_v4l4b0lp from ZCL_ONLY_MANUFACTURERS_3G
if (content.includes('_TZ3000_v4l4b0lp')) {
  content = content.replace(/,\s*'_TZ3000_v4l4b0lp'/g, '');
  content = content.replace(/'_TZ3000_v4l4b0lp'\s*,? \s*/g, '');
  
  // Cleanup any lingering comments
  content = content.replace(/\/\/ Issue #170 - Flow cards broken for multi-gang\s*/g, '' );
  
  fs.writeFileSync(file, content);
  console.log(' Removed _TZ3000_v4l4b0lp from ZCL_ONLY_MANUFACTURERS_3G');
}
