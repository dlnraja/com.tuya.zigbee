const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(process.cwd(), 'app.json');
let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Fix encoding/text in descriptions
appJson.description.de = "Universelle Tuya Unified Engine: Leistungsstarke lokale Steuerung, selbstheilende Flottenstabilität & adaptive Beleuchtung";
appJson.description.fr = "Moteur Tuya Unified Engine : Contrôle local haute performance, auto-réparation de la flotte & éclairage adaptatif";

// 2. Ensure version is 7.4.9
appJson.version = "7.4.9";

// 3. Sync with package.json
const pkgPath = path.join(process.cwd(), 'package.json');
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = "7.4.9";

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✅ app.json and package.json polished and synchronized to v7.4.9');
