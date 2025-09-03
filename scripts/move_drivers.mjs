import fs from 'fs';
import path from 'path';

const RELEASE_DRIVERS_PATH = 'release/drivers';
const DRIVERS_PATH = 'drivers';

// Create drivers directory if not exists
if (!fs.existsSync(DRIVERS_PATH)) {
  fs.mkdirSync(DRIVERS_PATH, { recursive: true });
}

// Get all driver directories in release/drivers
const driverDirs = fs.readdirSync(RELEASE_DRIVERS_PATH).filter(dir => {
  return fs.statSync(path.join(RELEASE_DRIVERS_PATH, dir)).isDirectory();
});

// Move each driver directory to drivers/
driverDirs.forEach(dir => {
  const src = path.join(RELEASE_DRIVERS_PATH, dir);
  const dest = path.join(DRIVERS_PATH, dir);
  fs.renameSync(src, dest);
});
