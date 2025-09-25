#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Community sources to check for updates
  SOURCES: [
    {
      name: 'blakadder',
      url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/devices/tuya.js',
      parser: (content) => {
        // Simple regex to extract device models (simplified for example)
        const deviceRegex = /model: '([^']+)'/g;
        const models = [];
        let match;
        while ((match = deviceRegex.exec(content)) !== null) {
          models.push(match[1].toLowerCase());
        }
        return models;
      }
    },
    // Add more sources as needed
  ],
  // Local paths to check
  PATHS: {
    drivers: path.join(__dirname, '..', 'drivers'),
  },
  // Output file for GitHub Actions
  OUTPUT_FILE: process.env.GITHUB_OUTPUT || '/dev/stdout'
};

/**
 * Get list of supported devices from local drivers
 */
function getLocalDevices() {
  const devices = [];
  
  // Get all driver directories
  const driverDirs = fs.readdirSync(CONFIG.PATHS.drivers, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
    
  // Extract device information from each driver
  for (const driver of driverDirs) {
    const driverPath = path.join(CONFIG.PATHS.drivers, driver, 'driver.compose.json');
    if (fs.existsSync(driverPath)) {
      try {
        const driverConfig = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
        devices.push({
          id: driver,
          name: driverConfig.name?.en || driver,
          version: driverConfig.version || '1.0.0',
          capabilities: driverConfig.capabilities || [],
          lastUpdated: getFileLastModified(driverPath)
        });
      } catch (error) {
        console.error(`Error reading driver ${driver}:`, error.message);
      }
    }
  }
  
  return devices;
}

/**
 * Get last modified date of a file
 */
function getFileLastModified(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Check for updates from external sources
 */
async function checkForUpdates() {
  const updates = [];
  const localDevices = getLocalDevices();
  
  for (const source of CONFIG.SOURCES) {
    try {
      console.log(`Checking ${source.name} for updates...`);
      const response = await axios.get(source.url);
      const remoteModels = source.parser(response.data);
      
      // Compare with local devices
      for (const model of remoteModels) {
        const localDevice = localDevices.find(d => d.id.toLowerCase() === model.toLowerCase());
        if (!localDevice) {
          updates.push({
            source: source.name,
            model,
            status: 'new',
            message: 'New device found in external source'
          });
        }
      }
    } catch (error) {
      console.error(`Error checking ${source.name}:`, error.message);
    }
  }
  
  return updates;
}

/**
 * Format updates for GitHub Actions output
 */
function formatUpdates(updates) {
  if (updates.length === 0) {
    return { update_count: 0, update_details: 'No updates found.' };
  }
  
  const updateDetails = updates.map(update => 
    `- **${update.model}**: ${update.message} (Source: ${update.source})`
  ).join('\n');
  
  return {
    update_count: updates.length,
    update_details: updateDetails
  };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting driver update check...');
    const updates = await checkForUpdates();
    const result = formatUpdates(updates);
    
    // Output for GitHub Actions
    const output = [
      `update_count=${result.update_count}`,
      `update_details<<EOF\n${result.update_details}\nEOF`
    ].join('\n');
    
    fs.appendFileSync(CONFIG.OUTPUT_FILE, output);
    
    console.log(`Found ${result.update_count} updates.`);
    process.exit(0);
  } catch (error) {
    console.error('Error in update check:', error);
    process.exit(1);
  }
}

// Run the script
main();
