const fs = require('fs');
const p = 'drivers/rain_sensor/device.js';
let content = fs.readFileSync(p, 'utf8');

const target = `  get dpMappings() {
    return {
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true }, // Rain detected
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'measure_luminance', divisor: 1 },
      105: { capability: 'measure_voltage.rain', divisor: 1000 }
    };
  }`;

const replacement = `  get dpMappings() {
    const mfr = typeof this.getSetting === 'function' ? (this.getSetting('zb_manufacturer_name') || '') : '';
    const mfrLower = mfr.toLowerCase();
    
    if (mfrLower.includes('u6x1zyv2') || mfrLower.includes('jsaqgakf') || mfrLower.includes('2pddnnrk')) {
      return {
        1: { capability: 'alarm_water', transform: (v) => v === 1 || v === '1' || v === true || v === 'true' },
        102: { capability: 'measure_luminance', divisor: 1 },
        104: { capability: 'measure_battery', divisor: 1 }
      };
    }

    return {
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true }, // Rain detected
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'measure_luminance', divisor: 1 },
      105: { capability: 'measure_voltage.rain', divisor: 1000 }
    };
  }`;

if (content.includes(target)) {
  fs.writeFileSync(p, content.replace(target, replacement));
  console.log('Replaced exact match (LF)');
} else if (content.includes(target.replace(/\n/g, '\r\n'))) {
  fs.writeFileSync(p, content.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n')));
  console.log('Replaced exact match (CRLF)');
} else {
  console.log('Could not find target block!');
}
