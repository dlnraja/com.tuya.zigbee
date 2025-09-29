const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const REFERENCES_DIR = path.join(__dirname, '..', 'references');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUTPUT_FILE = path.join(REFERENCES_DIR, 'device-references.json');

async function loadJsonFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not load ${filePath}:`, error.message);
    return null;
  }
}

async function updateReferences() {
  try {
    // Create references directory if it doesn't exist
    if (!fs.existsSync(REFERENCES_DIR)) {
      fs.mkdirSync(REFERENCES_DIR, { recursive: true });
    }

    // Load existing references if they exist
    let references = {};
    try {
      const existing = await readFile(OUTPUT_FILE, 'utf8');
      references = JSON.parse(existing);
      console.log(`Loaded ${Object.keys(references).length} existing references`);
    } catch (e) {
      console.log('No existing references found, starting fresh');
    }

    // Process reference files
    const referenceFiles = [
      'device-matrix.json',
      'driver_search_queries.json',
      'zigbee-device-list.json'
    ];

    for (const refFile of referenceFiles) {
      const refPath = path.join(REFERENCES_DIR, refFile);
      if (fs.existsSync(refPath)) {
        const data = await loadJsonFile(refPath);
        if (data) {
          console.log(`Processing ${refFile}...`);
          // Merge the data into our references
          references = { ...references, ...data };
        }
      }
    }

    // Process driver files to extract device information
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const driverId of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const composeFile = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const composeData = await loadJsonFile(composeFile);
          if (composeData && composeData.zigbee) {
            const modelId = Array.isArray(composeData.zigbee.modelId) 
              ? composeData.zigbee.modelId[0] 
              : composeData.zigbee.modelId;
              
            if (modelId) {
              if (!references[modelId]) {
                references[modelId] = {
                  driver: driverId,
                  model: modelId,
                  manufacturer: composeData.zigbee.manufacturerName || 'Unknown',
                  description: composeData.description || '',
                  capabilities: composeData.capabilities || []
                };
                console.log(`Added reference for ${modelId}`);
              }
            }
          }
        } catch (e) {
          console.error(`Error processing ${driverId}:`, e.message);
        }
      }
    }

    // Save the updated references
    await writeFile(OUTPUT_FILE, JSON.stringify(references, null, 2));
    console.log(`Updated references saved to ${OUTPUT_FILE}`);
    console.log(`Total references: ${Object.keys(references).length}`);

    return references;
  } catch (error) {
    console.error('Error updating references:', error);
    throw error;
  }
}

// Run the reference update
updateReferences().catch(console.error);
