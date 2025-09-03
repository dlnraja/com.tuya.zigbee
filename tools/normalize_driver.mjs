import fs from 'fs/promises';
import path from 'path';

async function normalizeDriver(driverPath) {
  const driverJsPath = path.join(driverPath, 'driver.js');
  let content = await fs.readFile(driverJsPath, 'utf8');
  
  // Replace the require statement
  content = content.replace(/const Homey = require\('homey'\);/g, "const BaseDriver = require('../../drivers/base/base_driver.js');");
  
  // Change the class extension
  content = content.replace(/extends Homey\.Driver/g, 'extends BaseDriver');
  
  await fs.writeFile(driverJsPath, content, 'utf8');
  console.log(`Normalized driver at ${driverPath}`);
}

const driverPath = process.argv[2];
if (!driverPath) {
  console.error('Usage: node normalize_driver.mjs <driver-path>');
  process.exit(1);
}

normalizeDriver(driverPath).catch(err => {
  console.error(err);
  process.exit(1);
});
