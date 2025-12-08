'use strict';
const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log('=== CHECKING DRIVER IMAGES ===\n');

const missing = [];
const complete = [];

drivers.forEach(driverName => {
  const imagesDir = path.join(driversDir, driverName, 'assets', 'images');
  const smallPath = path.join(imagesDir, 'small.png');
  const largePath = path.join(imagesDir, 'large.png');

  const hasSmall = fs.existsSync(smallPath);
  const hasLarge = fs.existsSync(largePath);

  if (!hasSmall || !hasLarge) {
    missing.push({
      name: driverName,
      small: hasSmall,
      large: hasLarge
    });
  } else {
    complete.push(driverName);
  }
});

if (missing.length > 0) {
  console.log('❌ DRIVERS WITH MISSING IMAGES:');
  missing.forEach(m => {
    console.log(`  - ${m.name}: small=${m.small} large=${m.large}`);
  });
  console.log(`\nTotal missing: ${missing.length}`);
} else {
  console.log('✅ All drivers have images!');
}

console.log(`\n✅ Complete drivers: ${complete.length}`);
console.log(`📊 Total drivers: ${drivers.length}`);
