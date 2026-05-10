// scripts/refactor-hybrid-drivers.js
// Script pour supprimer le suffixe `_hybrid` des dossiers de drivers et mettre à jour les références
const fs = require('fs');
const path = require('path');

console.log('🔄 Refactoring drivers: suppression du suffixe _hybrid...');

const driversDir = path.join(__dirname, '..', 'drivers');
const libDriversDir = path.join(__dirname, '..', 'lib', 'drivers');

// 1. Renommer les dossiers dans drivers/
if (fs.existsSync(driversDir)) {
  fs.readdirSync(driversDir).forEach(item => {
    const itemPath = path.join(driversDir, item);
    if (fs.statSync(itemPath).isDirectory() && item.endsWith('_hybrid')) {
      const newName = item.replace(/_hybrid$/, '');
      const newPath = path.join(driversDir, newName);
      console.log(`📁 Renommage: ${item} ➔ ${newName}`);
      fs.renameSync(itemPath, newPath);
      // Mettre à jour les références dans driver.json si présent
      const driverJson = path.join(newPath, 'driver.json');
      if (fs.existsSync(driverJson)) {
        const driver = JSON.parse(fs.readFileSync(driverJson, 'utf8'));
        if (driver.id?.endsWith('_hybrid')) {
          driver.id = driver.id.replace(/_hybrid$/, '');
          fs.writeFileSync(driverJson, JSON.stringify(driver, null, 2) + '\n');
        }
      }
    }
  });
}

// 2. Mettre à jour les imports dans lib/drivers/
if (fs.existsSync(libDriversDir)) {
  const jsFiles = fs.readdirSync(libDriversDir).filter(f => f.endsWith('.js'));
  jsFiles.forEach(file => {
    const filePath = path.join(libDriversDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    // Remplacer les imports/exports avec suffixe _hybrid
    const updated = content
      .replace(/from [\'"]\.\/[^\'"]*_hybrid[\'"]/g, match =>
        match.replace(/_hybrid([\'"])/, '$1'))
      .replace(/require\([\'"]\.\/[^\'"]*_hybrid[\'"]\)/g, match =>
        match.replace(/_hybrid([\'"])/, '$1'));
    if (content !== updated) {
      console.log(`📝 Mise à jour des imports dans ${file}`);
      fs.writeFileSync(filePath, updated);
    }
  });
}

// 3. Mettre à jour app.json si références aux drivers _hybrid
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  let changed = false;
  if (app.drivers) {
    for (const [id, driver] of Object.entries(app.drivers)) {
      if (id.endsWith('_hybrid')) {
        const newId = id.replace(/_hybrid$/, '');
        app.drivers[newId] = driver;
        delete app.drivers[id];
        changed = true;
        console.log(`🔄 Mise à jour de l'ID du driver: ${id} ➔ ${newId}`);
      }
    }
  }
  if (changed) {
    fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n');
    console.log('✅ app.json mis à jour');
  }
}

console.log('✅ Refactorisation _hybrid terminée');
console.log('📋 Prochaines étapes: exécuter validate-all.sh et pousser sur GitHub');
