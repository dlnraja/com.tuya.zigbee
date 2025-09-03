import fs from 'fs';
import path from 'path';

const DRIVERS_PATH = '.homeycompose/drivers';
const LOCALES_PATH = 'locales';

async function localizeDrivers() {
  const driverDirs = fs.readdirSync(DRIVERS_PATH).filter(dir => {
    return fs.statSync(path.join(DRIVERS_PATH, dir)).isDirectory();
  });

  const en = {};
  const fr = {};

  driverDirs.forEach(dir => {
    const composePath = path.join(DRIVERS_PATH, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const driverId = compose.id;
    
    en[`drivers.${driverId}.name`] = compose.name.en || compose.name || driverId;
    fr[`drivers.${driverId}.name`] = compose.name.fr || compose.name.en || compose.name || driverId;
  });

  fs.writeFileSync(path.join(LOCALES_PATH, 'en.json'), JSON.stringify(en, null, 2));
  fs.writeFileSync(path.join(LOCALES_PATH, 'fr.json'), JSON.stringify(fr, null, 2));
}

localizeDrivers();
