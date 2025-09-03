const fs = require('fs');
const path = require('path');

const driversRoot = path.join(__dirname, '..', 'drivers');
const registryPath = path.join(__dirname, '..', 'driver-registry.json');

// Find all driver.compose.json files
const composeFiles = [];
function findComposeFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      findComposeFiles(fullPath);
    } else if (file.name === 'driver.compose.json') {
      composeFiles.push(fullPath);
    }
  }
}

findComposeFiles(driversRoot);

const registry = [];
for (const composeFile of composeFiles) {
  const content = fs.readFileSync(composeFile, 'utf8');
  let driverInfo;
  try {
    driverInfo = JSON.parse(content);
  } catch (e) {
    console.error(`Error parsing ${composeFile}:`, e.message);
    continue;
  }

  const driverDir = path.dirname(composeFile);
  const relativeDriverDir = path.relative(path.join(__dirname, '..'), driverDir);

  registry.push({
    id: driverInfo.id,
    name: driverInfo.name,
    version: driverInfo.version,
    path: relativeDriverDir,
    // We don't have the category in the compose file, so we leave it empty for now.
    category: '',
  });
}

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`Driver registry generated at ${registryPath} with ${registry.length} entries.`);
