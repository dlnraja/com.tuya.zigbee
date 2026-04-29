const fs = require('fs');
const path = require('path');

const files = [
  'drivers/sensor_climate_contact_hybrid/device.js',
  'drivers/sensor_climate_motion_hybrid/device.js',
  'drivers/plug_energy_monitor_hybrid/device.js',
  'drivers/sensor_climate_temphumidsensor_hybrid/device.js',
  'drivers/sensor_contact_climate_hybrid/device.js'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix: (this._manufacturerName || '').toLowerCase().includes('_tze284')
  content = content.replace(/\(this\._manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('_tze284'\)/g, "CI.containsCI(getManufacturer(this), '_tze284')");

  // Fix: mfr.includes('_tze200_2se8efxh')
  content = content.replace(/mfr\.includes\('_tze200_2se8efxh'\)/g, "CI.containsCI(mfr, '_tze200_2se8efxh')");

  // Fix: mfr.includes(s) inside some()
  content = content.replace(/\.some\(s => mfr\.includes\(s\)\)/g, ".some(s => CI.containsCI(mfr, s))");

  // Fix specific motion sensor issues
  content = content.replace(/if \(mfr\.includes\('qoy0ekbd'\)\) return true;/g, "if (CI.containsCI(mfr, 'qoy0ekbd')) return true;");

  // Fix sensor_climate_contact_hybrid specific line 1407
  content = content.replace(/if \(\(this\._manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('_tze284'\)\)/g, "if (CI.containsCI(getManufacturer(this), '_tze284'))");

  fs.writeFileSync(filePath, content);
  console.log(`Deep refactored ${file}`);
});
