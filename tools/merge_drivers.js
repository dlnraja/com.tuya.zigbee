const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const tuyaDir = path.join(driversDir, 'tuya');
const zigbeeDir = path.join(driversDir, 'zigbee');

// Function to merge directories
function mergeDirs(source, target) {
  if (!fs.existsSync(source)) {
    console.log(`Source directory ${source} does not exist`);
    return;
  }
  
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const items = fs.readdirSync(source, { withFileTypes: true });
  
  for (const item of items) {
    const sourcePath = path.join(source, item.name);
    const targetPath = path.join(target, item.name);
    
    if (item.isDirectory()) {
      // If the directory exists in target, merge recursively
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        mergeDirs(sourcePath, targetPath);
      } else {
        // Otherwise, move the directory
        fs.renameSync(sourcePath, targetPath);
      }
    } else {
      // Move the file
      fs.renameSync(sourcePath, targetPath);
    }
  }
  
  // Remove the now-empty source directory
  fs.rmdirSync(source);
}

// Merge tuya drivers
if (fs.existsSync(tuyaDir)) {
  mergeDirs(tuyaDir, driversDir);
}

// Merge zigbee drivers
if (fs.existsSync(zigbeeDir)) {
  mergeDirs(zigbeeDir, driversDir);
}

console.log('Driver reorganization completed');
