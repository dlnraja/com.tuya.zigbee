const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUTPUT_FILE = path.join(__dirname, '..', 'driver-analysis.json');

async function analyzeDrivers() {
  try {
    const drivers = [];
    const driverDirs = await readdir(DRIVERS_DIR, { withFileTypes: true });
    
    for (const dir of driverDirs) {
      if (!dir.isDirectory()) continue;
      
      const driverPath = path.join(DRIVERS_DIR, dir.name);
      const driver = {
        id: dir.name,
        path: driverPath,
        files: [],
        hasDeviceJs: false,
        hasDriverJs: false,
        hasComposeJson: false,
        hasTests: false,
        hasAssets: false
      };
      
      // Check driver files
      const files = await readdir(driverPath);
      for (const file of files) {
        const filePath = path.join(driverPath, file);
        const fileStat = await stat(filePath);
        
        if (fileStat.isFile()) {
          driver.files.push(file);
          
          if (file === 'device.js') driver.hasDeviceJs = true;
          if (file === 'driver.js') driver.hasDriverJs = true;
          if (file === 'driver.compose.json') driver.hasComposeJson = true;
        }
      }
      
      // Check for test files
      const testPath = path.join(__dirname, '..', 'test', 'unit', `${dir.name}.test.js`);
      try {
        await stat(testPath);
        driver.hasTests = true;
      } catch (e) {
        driver.hasTests = false;
      }
      
      // Check for assets
      const assetsPath = path.join(driverPath, 'assets');
      try {
        const assetsStat = await stat(assetsPath);
        driver.hasAssets = assetsStat.isDirectory();
      } catch (e) {
        driver.hasAssets = false;
      }
      
      drivers.push(driver);
    }
    
    // Save analysis to file
    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(drivers, null, 2));
    console.log(`Analysis complete. Results saved to ${OUTPUT_FILE}`);
    
    return drivers;
  } catch (error) {
    console.error('Error analyzing drivers:', error);
    throw error;
  }
}

// Run the analysis
analyzeDrivers().catch(console.error);
