const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const REFERENCES_FILE = path.join(__dirname, '..', 'references', 'device-references.json');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REPORT_FILE = path.join(__dirname, '..', 'driver-enrichment-report.json');

async function enrichDrivers() {
  try {
    // Load references
    const referencesData = await readFile(REFERENCES_FILE, 'utf8');
    const references = JSON.parse(referencesData);
    
    const report = {
      timestamp: new Date().toISOString(),
      updatedDrivers: [],
      skippedDrivers: [],
      errors: []
    };

    // Get all driver directories
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const driverId of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const composeFile = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composeFile)) {
        report.skippedDrivers.push({
          driver: driverId,
          reason: 'No driver.compose.json found'
        });
        continue;
      }

      try {
        // Read the compose file
        const composeData = JSON.parse(await readFile(composeFile, 'utf8'));
        let wasUpdated = false;
        
        // Get the model ID from the compose file
        const modelId = Array.isArray(composeData.zigbee?.modelId)
          ? composeData.zigbee.modelId[0]
          : composeData.zigbee?.modelId;
        
        if (!modelId) {
          report.skippedDrivers.push({
            driver: driverId,
            reason: 'No modelId found in driver.compose.json'
          });
          continue;
        }

        // Find reference data for this model
        const reference = Object.values(references).find(
          ref => ref.model === modelId || ref.driver === driverId
        );

        if (!reference) {
          report.skippedDrivers.push({
            driver: driverId,
            model: modelId,
            reason: 'No reference data found'
          });
          continue;
        }

        // Update the compose file with reference data
        if (reference.description && !composeData.description) {
          composeData.description = reference.description;
          wasUpdated = true;
        }

        if (reference.capabilities && reference.capabilities.length > 0) {
          const newCapabilities = [...new Set([
            ...(composeData.capabilities || []),
            ...reference.capabilities
          ])];
          
          if (JSON.stringify(newCapabilities) !== JSON.stringify(composeData.capabilities || [])) {
            composeData.capabilities = newCapabilities;
            wasUpdated = true;
          }
        }

        // Add or update the zigbee configuration
        if (!composeData.zigbee) {
          composeData.zigbee = {};
        }

        if (reference.manufacturer && !composeData.zigbee.manufacturerName) {
          composeData.zigbee.manufacturerName = reference.manufacturer;
          wasUpdated = true;
        }

        // Save the updated compose file if changes were made
        if (wasUpdated) {
          await writeFile(
            composeFile,
            JSON.stringify(composeData, null, 2) + '\n',
            'utf8'
          );
          
          report.updatedDrivers.push({
            driver: driverId,
            model: modelId,
            changes: Object.keys(reference).filter(k => k !== 'model' && k !== 'driver')
          });
        } else {
          report.skippedDrivers.push({
            driver: driverId,
            model: modelId,
            reason: 'No updates needed'
          });
        }
      } catch (error) {
        report.errors.push({
          driver: driverId,
          error: error.message,
          stack: error.stack
        });
        console.error(`Error processing ${driverId}:`, error);
      }
    }

    // Save the enrichment report
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`Enrichment complete. Report saved to ${REPORT_FILE}`);
    console.log(`Updated ${report.updatedDrivers.length} drivers`);
    console.log(`Skipped ${report.skippedDrivers.length} drivers`);
    if (report.errors.length > 0) {
      console.error(`Encountered ${report.errors.length} errors`);
    }

    return report;
  } catch (error) {
    console.error('Error enriching drivers:', error);
    throw error;
  }
}

// Run the enrichment
enrichDrivers().catch(console.error);
