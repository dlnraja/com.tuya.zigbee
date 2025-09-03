import fs from 'fs';
import path from 'path';
import { Translation } from 'llmarena';

const DRIVERS_PATH = '.homeycompose/drivers';
const LOCALES_PATH = 'locales';

async function localizeDrivers() {
  const driverDirs = fs.readdirSync(DRIVERS_PATH).filter(dir => {
    return fs.statSync(path.join(DRIVERS_PATH, dir)).isDirectory();
  });

  const locales = ['en', 'fr', 'nl', 'ta'];
  const localeData = {
    en: {},
    fr: {},
    nl: {},
    ta: {}
  };

  const translator = new Translation.Translator();

  for (const dir of driverDirs) {
    const composePath = path.join(DRIVERS_PATH, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const driverId = compose.id;
    const driverName = compose.name?.en || compose.name || driverId;

    for (const locale of locales) {
      const key = `drivers.${driverId}.name`;
      if (compose.name?.[locale]) {
        localeData[locale][key] = compose.name[locale];
      } else {
        try {
          const translation = await translator.translate({
            text: driverName,
            target: locale,
            source: 'en'
          });
          localeData[locale][key] = translation;
        } catch (error) {
          console.error(`Error translating to ${locale}:`, error);
          localeData[locale][key] = driverName;
        }
      }
    }
  }

  for (const locale of locales) {
    const filePath = path.join(LOCALES_PATH, `${locale}.json`);
    fs.writeFileSync(filePath, JSON.stringify(localeData[locale], null, 2));
  }
}

localizeDrivers();
