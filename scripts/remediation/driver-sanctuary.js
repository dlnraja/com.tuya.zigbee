const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath , callback) : callback(path.join(dir, f))      ;
  });
};

console.log('--- DRIVER SANCTUARY RESTORATION START ---');

walk(DRIVERS_DIR, (filePath) => {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // 1. Fix corrupted Temp/Humid/Battery blocks
  // Pattern: Math.round((safeParse(data.measuredValue,100, safeParse)(10) * 10))
  content = content.replace(/Math\.round\(\(safeParse\(([^,]+),safeMultiply\(100\),\s*safeParse\)\(10\),\s*10\)\)/g, 'Math.round(($1 / 100) * 10) / 10');
  
  // Pattern: Math.round((v * safeParse))(10) * 10)
  content = content.replace(/Math\.round\(safeMultiply\(([^,]+),\s*safeParse\)\)\(10\),\s*10\)/g, 'Math.round($1 * 10) / 10');
  
  // 2. Fix corrupted rawTemp divisor blocks
  // Pattern: Math.round((safeDivide(rawTemp,divisor, safeParse)(10) * 10))
  content = content.replace(/Math\.round\(\(safeDivide\(([^,]+),safeMultiply\(divisor\),\s*safeParse\)\(10\),\s*10\)\)/g, 'Math.round(($1 / divisor) * 10) / 10');

  // 3. Fix Illuminance Math.pow corruption
  content = content.replace(/Math\.pow\(10,\s*\(v\s*-safeParse\(1\),\s*10000\)\)/g, 'Math.round(Math.pow(10, (v - 1) / 10000))');

  // 4. Fix changePercent corruption
  content = content.replace(/Math\.abs\(finalLux\s*-safeDivide\(currentLux\),safeMultiply\(currentLux\),\s*100\)/g, '(Math.abs(finalLux - currentLux) / currentLux) * 100');

  // 5. Cleanup lone artifacts
  content = content.replace(/safeMultiply\(v, safeParse\)\)\(10\), 10\)/g, 'v * 10) / 10');
  content = content.replace(/safeParse\(v, safeParse\)\(10\), 10\)/g, 'v * 10) / 10');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Restored: ${path.relative(ROOT, filePath)}`);
  }
});

console.log('--- DRIVER SANCTUARY RESTORATION COMPLETE ---');
