import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const DRIVERS_DIR = path.join(__dirname, '../drivers');
console.log(`Drivers directory: ${DRIVERS_DIR}`);

// Get all driver directories
const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
  .map(dirent => dirent.name);

console.log(`Found ${driverDirs.length} drivers`);
