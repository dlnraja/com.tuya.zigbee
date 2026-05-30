'use strict';
/**
 * analyze-archive.js
 * Builds the Homey app archive and analyzes its contents
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const os = require('os');

process.chdir(path.join(__dirname, '..', '..', '..'));
console.log('CWD:', process.cwd());

// Find the archive after build
const tmpDir = os.tmpdir();
const archiveName = 'com.dlnraja.tuya.zigbee.tar.gz';
const archivePath = path.join(tmpDir, archiveName);

// Check if archive exists from previous build
if (!fs.existsSync(archivePath)) {
  console.log('Building archive...');
  const result = spawnSync('homey', ['app', 'build'], { 
    encoding: 'utf8', 
    shell: true,
    stdio: 'pipe'
  });
  console.log(result.stdout);
  if (result.error) console.log('Build error:', result.error.message);
}

// Find the archive - check different locations
const possiblePaths = [
  archivePath,
  path.join(tmpDir, 'com.dlnraja.tuya.zigbee.tar.gz'),
  // Check current dir
  path.join(process.cwd(), 'com.dlnraja.tuya.zigbee.tar.gz'),
];

let foundArchive = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    foundArchive = p;
    break;
  }
}

// Also search tmp dir
if (!foundArchive) {
  const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.includes('dlnraja') || f.includes('tuya') || f.includes('homey'));
  console.log('Temp files:', tmpFiles);
  
  // Search system temp
  const appData = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (appData) {
    const homeyTemp = path.join(appData, 'Temp');
    if (fs.existsSync(homeyTemp)) {
      const files = fs.readdirSync(homeyTemp).filter(f => f.includes('dlnraja') || f.includes('tuya'));
      console.log('AppData/Temp files:', files);
    }
  }
}

if (foundArchive) {
  const stats = fs.statSync(foundArchive);
  console.log('\nArchive found:', foundArchive);
  console.log('Archive size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  
  // List contents
  try {
    const list = execSync(`tar -tzf "${foundArchive}"`, { encoding: 'utf8', maxBuffer: 50*1024*1024 });
    const files = list.trim().split('\n').filter(Boolean);
    console.log('Files in archive:', files.length);
    
    // Group by extension
    const exts = {};
    const dirs = new Set();
    for (const f of files) {
      const ext = path.extname(f).toLowerCase() || '(none)';
      exts[ext] = (exts[ext] || 0) + 1;
      const dir = f.split('/').slice(0, 2).join('/');
      dirs.add(dir);
    }
    
    console.log('\nBy extension (sorted by count):');
    Object.entries(exts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .forEach(([ext, cnt]) => console.log(`  ${ext}: ${cnt}`));
    
    console.log('\nTop-level directories:');
    [...dirs].filter(d => d.includes('/')).map(d => d.split('/')[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .forEach(d => console.log('  /' + d));
    
    console.log('\ndriver.compose.json count:', files.filter(f => f.includes('driver.compose.json')).length);
    console.log('driver.flow.compose.json count:', files.filter(f => f.includes('driver.flow.compose.json')).length);
    console.log('driver.settings.compose.json count:', files.filter(f => f.includes('driver.settings.compose.json')).length);
    
    // Large files check
    console.log('\nSample JSON files in archive:');
    files.filter(f => f.endsWith('.json') && !f.includes('node_modules')).slice(0, 10)
      .forEach(f => console.log('  ' + f));
  } catch(e) {
    console.log('tar list error:', e.message);
  }
} else {
  console.log('Archive NOT found. Check build output.');
}
