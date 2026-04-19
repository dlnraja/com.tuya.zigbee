const fs = require('fs');

const file = 'drivers/switch_3gang/device.js';
let content = fs.readFileSync(file, 'utf8');

// Add _TZ3000_v4l4b0lp to ZCL_ONLY_MANUFACTURERS_3G
const oldArray = `const ZCL_ONLY_MANUFACTURERS_3G = [
  '_TZ3000_qkixdnon', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
];`;

const newArray = `const ZCL_ONLY_MANUFACTURERS_3G = [
  '_TZ3000_qkixdnon', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt',
  '_TZ3000_v4l4b0lp'  // Issue #170 - Flow cards broken for multi-gang
];`;

if (content.includes('_TZ3000_v4l4b0lp')) {
  console.log('Already contains _TZ3000_v4l4b0lp');
} else {
  content = content.replace(oldArray, newArray);
  fs.writeFileSync(file, content);
  console.log(' Added _TZ3000_v4l4b0lp to ZCL_ONLY_MANUFACTURERS_3G');
}
