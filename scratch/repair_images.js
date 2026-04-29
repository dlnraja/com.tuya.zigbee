
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const driversDir = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(driversDir);

async function repair() {
  console.log('Repairing missing images...');
  let repaired = 0;

  // Create a 500x500 transparent placeholder buffer
  const placeholder = await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 0.1 } // Subtle gray
    }
  }).png().toBuffer();

  for (const driver of drivers) {
    const driverPath = path.join(driversDir, driver);
    if (!fs.statSync(driverPath).isDirectory()) continue;

    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.images) {
        for (const [key, val] of Object.entries(compose.images)) {
          // Normalize path: handle {{driverAssetsPath}}, /, etc.
          let relativePath = val.replace('{{driverAssetsPath}}', `drivers/${driver}/assets`);
          if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
          
          const fullPath = path.join(process.cwd(), relativePath);
          const dir = path.dirname(fullPath);

          if (!fs.existsSync(fullPath)) {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, placeholder);
            console.log(` Created placeholder for [${driver}]: ${relativePath}`);
            repaired++;
          }
        }
      }
    } catch (e) {
      console.error(` Error in [${driver}]: ${e.message}`);
    }
  }

  // Also check app.json (icons)
  const appPath = path.join(process.cwd(), 'app.json');
  if (fs.existsSync(appPath)) {
     const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
     if (app.icon) {
        const fullIconPath = path.join(process.cwd(), app.icon.startsWith('/') ? app.icon.substring(1 ) : app.icon)      ;
        if (!fs.existsSync(fullIconPath)) {
            const dir = path.dirname(fullIconPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullIconPath, placeholder);
            console.log(` Created placeholder for app icon: ${app.icon}`);
            repaired++;
        }
     }
  }

  console.log(`\nRepaired ${repaired} missing images.`);
}

repair().catch(console.error);
