const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const capabilities = appJson.capabilities || {};
const assetsDir = path.join(__dirname, 'assets', 'capabilities');
const defaultSvgPath = path.join(assetsDir, 'vibration.svg'); // A known existing SVG

for (const capKey of Object.keys(capabilities)) {
  const svgPath = path.join(assetsDir, `${capKey}.svg`);
  if (!fs.existsSync(svgPath)) {
    console.log(`Missing SVG for capability: ${capKey}. Copying default...`);
    fs.copyFileSync(defaultSvgPath, svgPath);
  }
}

console.log('Done checking and fixing SVGs.');
