const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'drivers', 'climate_sensor_presence_hybrid', 'device.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix pattern 1
content = content.replace(
  /const mfrLower = manufacturerName\.toLowerCase\(\);\s*\n\s*\n\s*\/\/ Match TZE284\/TZE204 iadro9bf variants \(presence inversion needed\)\s*\n\s*if \(mfrLower\.includes\('iadro9bf'\) \|\| mfrLower\.includes\('qasjif9e'\) \|\|\s*\n\s*mfrLower\.includes\('ztqnh5cg'\) \|\| mfrLower\.includes\('sbyx0lm6'\)\) \{/g,
  `// Match TZE284/TZE204 iadro9bf variants (presence inversion needed)
    if (CI.containsCI(manufacturerName, 'iadro9bf') || 
        CI.containsCI(manufacturerName, 'qasjif9e') ||
        CI.containsCI(manufacturerName, 'ztqnh5cg') || 
        CI.containsCI(manufacturerName, 'sbyx0lm6')) {`
);

// Fix pattern 2 (line 380-384)
content = content.replace(
  /const mfrLower = \(manufacturerName \|\| ''\)\.toLowerCase\(\);\s*\n\s*const isZYM100Series = mfrLower\.includes\('iadro9bf'\) \|\|\s*\n\s*mfrLower\.includes\('gkfbdvyx'\) \|\|\s*\n\s*mfrLower\.includes\('qasjif9e'\) \|\|\s*\n\s*mfrLower\.includes\('sxm7l9xa'\);/g,
  `const isZYM100Series = CI.containsCI(manufacturerName, 'iadro9bf') ||
    CI.containsCI(manufacturerName, 'gkfbdvyx') ||
    CI.containsCI(manufacturerName, 'qasjif9e') ||
    CI.containsCI(manufacturerName, 'sxm7l9xa');`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed climate_sensor_presence_hybrid/device.js');
