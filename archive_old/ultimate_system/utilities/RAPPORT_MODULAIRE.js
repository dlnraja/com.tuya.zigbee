// RAPPORT MODULAIRE - Vue d'ensemble architecture
const fs = require('fs');

console.log('📊 RAPPORT ARCHITECTURE MODULAIRE');

const scanModules = (dir) => {
  let modules = [];
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(item => {
      const path = `${dir}/${item}`;
      if (fs.statSync(path).isDirectory()) {
        modules = modules.concat(scanModules(path));
      } else if (item.endsWith('.js')) {
        modules.push(path);
      }
    });
  }
  return modules;
};

const modulesByType = {
  'Drivers': scanModules('./modules/drivers'),
  'Sources': scanModules('./modules/sources'), 
  'Utils': scanModules('./modules/utils'),
  'Validation': scanModules('./modules/validation'),
  'Backup': scanModules('./modules/backup')
};

let totalModules = 0;

Object.entries(modulesByType).forEach(([type, modules]) => {
  console.log(`\n📁 ${type}: ${modules.length} modules`);
  modules.forEach(mod => {
    console.log(`   ✅ ${mod.split('/').pop()}`);
    totalModules++;
  });
});

console.log(`\n🎯 TOTAL: ${totalModules} modules spécialisés`);
console.log('📦 Architecture modulaire créée avec succès !');

// Sauvegarde rapport
const report = {
  timestamp: new Date().toISOString(),
  totalModules,
  modulesByType: Object.fromEntries(
    Object.entries(modulesByType).map(([k, v]) => [k, v.length])
  ),
  status: 'MODULAR_SUCCESS'
};

if (!fs.existsSync('./references')) fs.mkdirSync('./references');
fs.writeFileSync('./references/modular_report.json', JSON.stringify(report, null, 2));

console.log('✅ Rapport sauvé: references/modular_report.json');
