import fs from 'fs';
import path from 'path';

const DRIVERS_DIR = '.homeycompose/drivers';
const OUTPUT_FILE = 'data/device_matrix.csv';

async function buildMatrix() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error(`❌ Drivers directory not found: ${DRIVERS_DIR}`);
    process.exit(1);
  }
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  
  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'templates')
    .map(dirent => dirent.name);

  const matrixData = [];
  
  for (const driverId of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      console.warn(`⚠️ Skipping ${driverId}: driver.compose.json not found`);
      continue;
    }
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      matrixData.push({
        driver_id: driverId,
        class: compose.class || '',
        name_en: compose.name?.en || '',
        name_fr: compose.name?.fr || '',
        capabilities: (compose.capabilities || []).join(', '),
        pairing: compose.pair
          ? compose.pair.map(p => `${p.id}:${p.navigation?.label || ''}`).join('; ')
          : '',
        path: path.join(DRIVERS_DIR, driverId)
      });
      
    } catch (e) {
      console.warn(`⚠️ Error processing ${driverId}: ${e.message}`);
    }
  }
  
  // Generate CSV manually
  const headers = ['driver_id', 'class', 'name_en', 'name_fr', 'capabilities', 'pairing', 'path'];
  
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of matrixData) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
  
  console.log(`✅ Device matrix generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total drivers processed: ${matrixData.length}`);
}

buildMatrix();
