const fs = require('fs');
const path = require('path');
const driversDir = './drivers';
let fixed = 0;
const dirs = fs.readdirSync(driversDir);

// Hex cluster mappings
const hexToDecimal = {
  '"0x0000"': '0',
  '"0x0001"': '1',
  '"0x0002"': '2',
  '"0x0003"': '3',
  '"0x0004"': '4',
  '"0x0005"': '5',
  '"0x0006"': '6',
  '"0x0008"': '8',
  '"0x0009"': '9',
  '"0x000A"': '10',
  '"0x000B"': '11',
  '"0x0020"': '32',
  '"0x0300"': '768',
  '"0x0400"': '1024',
  '"0x0402"': '1026',
  '"0x0403"': '1027',
  '"0x0404"': '1028',
  '"0x0405"': '1029',
  '"0x0406"': '1030',
  '"0x0500"': '1280',
  '"0x0501"': '1281',
  '"0x0502"': '1282',
  '"0x0702"': '1794',
  '"0x0B04"': '2820',
  '"0x0b04"': '2820',
  '"0x1000"': '4096',
  '"0xEF00"': '61184',
  '"0xef00"': '61184',
  '"0xFC00"': '64512',
  '"0xFC01"': '64513',
  '"0xFC02"': '64514',
  '"0xFCC0"': '64704',
  '"0xfcc0"': '64704'
};

for (const dir of dirs) {
  const filePath = path.join(driversDir, dir, 'driver.compose.json');
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix hex clusters
  for (const [hex, decimal] of Object.entries(hexToDecimal)) {
    if (content.includes(hex)) {
      content = content.replace(new RegExp(hex, 'g'), decimal);
      changed = true;
    }
  }

  // Fix numeric capabilities (6 in capabilities array)
  // Pattern: inside capabilities array, replace standalone 6 with nothing or "onoff"
  content = content.replace(/"capabilities":\s*\[([\s\S]*?)\]/g, (match, inner) => {
    let newInner = inner;
    // Remove standalone numeric values that are not strings
    newInner = newInner.replace(/,\s*6\s*(?=[\],])/g, '');
    newInner = newInner.replace(/6,\s*(?=")/g, '');
    newInner = newInner.replace(/\[\s*6\s*,/g, '[');
    // Clean up trailing commas
    newInner = newInner.replace(/,\s*]/g, ']');
    newInner = newInner.replace(/,\s*$/g, '');
    if (newInner !== inner) {
      changed = true;
      return '"capabilities": [' + newInner + ']';
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixed++;
    console.log('Fixed:', dir);
  }
}

console.log('Total fixed:', fixed);
