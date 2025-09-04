#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.cwd();
const homeyComposeDir = path.join(repoRoot, '.homeycompose');
const errors = [];

// Validate app.json
const appJsonPath = path.join(homeyComposeDir, 'app.json');
if (!fs.existsSync(appJsonPath)) {
  errors.push({ file: appJsonPath, error: 'File does not exist' });
} else {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    // Basic checks: id and version
    if (!appJson.id) errors.push({ file: appJsonPath, error: 'Missing id' });
    if (!appJson.version) errors.push({ file: appJsonPath, error: 'Missing version' });
  } catch (e) {
    errors.push({ file: appJsonPath, error: e.message });
  }
}

// Validate drivers
const driversDir = path.join(homeyComposeDir, 'drivers');
if (fs.existsSync(driversDir)) {
  const driverDirs = fs.readdirSync(driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'templates')
    .map(dirent => dirent.name);

  for (const driverId of driverDirs) {
    const driverComposePath = path.join(driversDir, driverId, 'driver.compose.json');
    if (!fs.existsSync(driverComposePath)) {
      errors.push({ driver: driverId, error: 'driver.compose.json does not exist' });
    } else {
      try {
        const driverCompose = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
        if (driverCompose.id !== driverId) {
          errors.push({ driver: driverId, error: `Driver id mismatch: expected ${driverId}, got ${driverCompose.id}` });
        }
        // Check for required fields: class, capabilities
        if (!driverCompose.class) errors.push({ driver: driverId, error: 'Missing class' });
        if (!driverCompose.capabilities || !Array.isArray(driverCompose.capabilities) || driverCompose.capabilities.length === 0) {
          errors.push({ driver: driverId, error: 'Missing or empty capabilities array' });
        }
      } catch (e) {
        errors.push({ driver: driverId, error: e.message });
      }
    }
  }
}

// Write errors to file
const outputPath = path.join(repoRoot, 'analysis', 'compose_errors.json');
fs.writeFileSync(outputPath, JSON.stringify(errors, null, 2));

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} errors. See ${outputPath}`);
  process.exit(1);
} else {
  console.log('Validation passed');
  process.exit(0);
}
