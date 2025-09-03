import fs from 'fs';
import path from 'path';

const DRIVERS_PATH = 'drivers';

const driverDirs = fs.readdirSync(DRIVERS_PATH).filter(dir => {
  return fs.statSync(path.join(DRIVERS_PATH, dir)).isDirectory();
});

driverDirs.forEach(dir => {
  const manifestPath = path.join(DRIVERS_PATH, dir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return;
  }

  const manifest = {
    id: dir,
    name: {
      en: dir.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    },
    class: "sensor",
    capabilities: [],
    images: {
      large: "{{driverAssetsPath}}/images/large.png",
      small: "{{driverAssetsPath}}/images/small.png"
    },
    pair: [
      {
        id: "start"
      }
    ]
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
});
