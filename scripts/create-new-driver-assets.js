#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const drivers = [
  'dehumidifier_hybrid',
  'air_conditioner_hybrid'
];

const rootDir = path.resolve(__dirname, '..');

drivers.forEach(driver => {
  const assetsPath = path.join(rootDir, 'drivers', driver, 'assets', 'images');
  fs.mkdirSync(assetsPath, { recursive: true });
  console.log(`✅ Created: ${assetsPath}`);
});

console.log('\n✅ All asset directories created!');
