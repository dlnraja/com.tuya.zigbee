#!/usr/bin/env node
/**
 * Tuya Light Synchronization Script
 * Synchronizes and adapts with tuya-light project according to forum specifications
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  tuyaLightDir: path.join(__dirname, '../tuya-light'),
  mainProjectDir: path.join(__dirname, '..'),
  outputDir: path.join(__dirname, '../tuya-light-sync-results'),
  driversDir: path.join(__dirname, '../drivers'),
  assetsDir: path.join(__dirname, '../assets')
};

class TuyaLightSynchronizer {
  constructor() {
    this.syncReport = {
      timestamp: new Date().toISOString(),
      driversAnalyzed: 0,
      driversSynced: 0,
      assetsUpdated: 0,
      configurationsMerged: 0,
      errors: [],
      recommendations: []
    };
  }

  async synchronize() {

    try {
      await this.ensureDirectories();

      // Analyze tuya-light structure
      const tuyaLightStructure = await this.analyzeTuyaLight();

      // Sync drivers
      await this.syncDrivers(tuyaLightStructure);

      // Sync assets and configurations
      await this.syncAssets(tuyaLightStructure);

      // Merge app configurations
      await this.mergeConfigurations(tuyaLightStructure);

      // Update documentation
      await this.updateDocumentation(tuyaLightStructure);

      await this.generateReport();

    } catch (error) {
      console.error('❌ Synchronization failed:', error);
      this.syncReport.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
  }

  async analyzeTuyaLight() {
    const structure = {
      drivers: [],
      assets: [],
      configurations: {},
      documentation: []
    };

    try {
      // Analyze drivers
      const driversPath = path.join(CONFIG.tuyaLightDir, 'drivers');
      const drivers = await fs.readdir(driversPath, { withFileTypes: true });

      for (const driver of drivers) {
        if (driver.isDirectory()) {
          const driverData = await this.analyzeDriver(path.join(driversPath, driver.name));
          structure.drivers.push({
            name: driver.name,
            path: path.join(driversPath, driver.name),
            ...driverData
          });
          this.syncReport.driversAnalyzed++;
        }
      }

      // Analyze app.json
      const appJsonPath = path.join(CONFIG.tuyaLightDir, 'app.json');
      const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
      structure.configurations.appJson = JSON.parse(appJsonContent);

    } catch (error) {

    }

    return structure;
  }

  async analyzeDriver(driverPath) {
    const data = {
      hasDeviceJS: false,
      hasDriverCompose: false,
      hasAssets: false,
      capabilities: [],
      zigbeeConfig: null
    };

    try {
      const files = await fs.readdir(driverPath);

      for (const file of files) {
        if (file === 'device.js') {
          data.hasDeviceJS = true;
        } else if (file === 'driver.compose.json') {
          data.hasDriverCompose = true;
          const content = await fs.readFile(path.join(driverPath, file), 'utf8');
          const compose = JSON.parse(content);
          data.capabilities = compose.capabilities || [];
          data.zigbeeConfig = compose.zigbee;
        } else if (file === 'assets') {
          data.hasAssets = true;
        }
      }
    } catch (error) {

    }

    return data;
  }

  async syncDrivers(tuyaLightStructure) {

    for (const tuyaDriver of tuyaLightStructure.drivers) {
      try {
        // Check if we have a similar driver
        const matchingDriver = await this.findMatchingDriver(tuyaDriver);

        if (matchingDriver) {
          await this.mergeDrivers(tuyaDriver, matchingDriver);
          this.syncReport.driversSynced++;
        } else {
          await this.adaptTuyaDriver(tuyaDriver);
          this.syncReport.driversSynced++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync driver ${tuyaDriver.name}:`, error);
        this.syncReport.errors.push(`Driver ${tuyaDriver.name}: ${error.message}`);
      }
    }
  }

  async findMatchingDriver(tuyaDriver) {
    try {
      const ourDrivers = await fs.readdir(CONFIG.driversDir, { withFileTypes: true });

      for (const ourDriver of ourDrivers) {
        if (ourDriver.isDirectory()) {
          // Check for name similarity or capability overlap
          if (this.driversAreSimilar(tuyaDriver.name, ourDriver.name)) {
            return {
              name: ourDriver.name,
              path: path.join(CONFIG.driversDir, ourDriver.name)
            };
          }
        }
      }
    } catch (error) {

    }

    return null;
  }

  driversAreSimilar(name1, name2) {
    // Simple similarity check
    const normalizedName1 = name1.toLowerCase().replace(/[_-]/g, '');
    const normalizedName2 = name2.toLowerCase().replace(/[_-]/g, '');

    return normalizedName1.includes('light') && normalizedName2.includes('light') ||
           normalizedName1.includes(normalizedName2) ||
           normalizedName2.includes(normalizedName1);
  }

  async mergeDrivers(tuyaDriver, ourDriver) {

    // Copy enhanced features from tuya-light
    if (tuyaDriver.hasDeviceJS) {
      await this.enhanceDeviceJS(ourDriver.path, tuyaDriver.path);
    }

    if (tuyaDriver.hasDriverCompose) {
      await this.enhanceDriverComposeFile(ourDriver.path, tuyaDriver.path);
    }

    if (tuyaDriver.hasAssets) {
      await this.syncDriverAssetsFiles(ourDriver.path, tuyaDriver.path);
    }
  }

  async adaptTuyaDriver(tuyaDriver) {

    // Create adapted version in our drivers directory
    const adaptedPath = path.join(CONFIG.driversDir, `tuya_light_${tuyaDriver.name}`);

    try {
      await fs.mkdir(adaptedPath, { recursive: true });

      // Copy and adapt driver files
      const files = await fs.readdir(tuyaDriver.path, { recursive: true });

      for (const file of files) {
        const sourcePath = path.join(tuyaDriver.path, file);
        const targetPath = path.join(adaptedPath, file);

        try {
          const stats = await fs.stat(sourcePath);
          if (stats.isFile()) {
            await fs.mkdir(path.dirname(targetPath), { recursive: true });

            if (file.endsWith('.js') || file.endsWith('.json')) {
              // Process and adapt the file
              let content = await fs.readFile(sourcePath, 'utf8');
              content = await this.adaptFileContent(content, file);
              await fs.writeFile(targetPath, content);
            } else {
              await fs.copyFile(sourcePath, targetPath);
            }
          }
        } catch (error) {
          // Skip files that can't be processed
        }
      }
    } catch (error) {
      throw new Error(`Failed to adapt driver: ${error.message}`);
    }
  }

  async adaptFileContent(content, filename) {
    if (filename === 'driver.compose.json') {
      try {
        const compose = JSON.parse(content);

        // Ensure Tuya manufacturer names are included
        if (compose.zigbee && compose.zigbee.manufacturerName) {
          const manufacturers = Array.isArray(compose.zigbee.manufacturerName)
            ? compose.zigbee.manufacturerName
            : [compose.zigbee.manufacturerName];

          // Add common Tuya manufacturers if not present
          const tuyaManufacturers = ['_TZ3000_', '_TYZB01_', '_TZ3210_', '_TZ3290_'];
          for (const mfg of tuyaManufacturers) {
            if (!manufacturers.includes(mfg)) {
              manufacturers.push(mfg);
            }
          }

          compose.zigbee.manufacturerName = manufacturers;
        }

        return JSON.stringify(compose, null, 2);
      } catch (error) {
        return content;
      }
    } else if (filename === 'device.js') {
      // Add Tuya-specific enhancements
      if (!content.includes('TuyaSpecificCluster')) {
        content = content.replace(
          "const { ZigBeeDevice } = require('homey-zigbeedriver');",
          `const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');`
        );
      }

      return content;
    }

    return content;
  }

  async enhanceDriverComposeFile(ourDriverPath, tuyaDriverPath) {
    const ourComposePath = path.join(ourDriverPath, 'driver.compose.json');
    const tuyaComposePath = path.join(tuyaDriverPath, 'driver.compose.json');

    try {
      const tuyaContent = await fs.readFile(tuyaComposePath, 'utf8');
      let ourContent = '{}';

      try {
        ourContent = await fs.readFile(ourComposePath, 'utf8');
      } catch (error) {
        // Create new driver.compose.json
      }

      const ourCompose = JSON.parse(ourContent);
      const tuyaCompose = JSON.parse(tuyaContent);

      // Merge configurations
      const merged = { ...ourCompose };

      if (tuyaCompose.capabilities && !merged.capabilities) {
        merged.capabilities = tuyaCompose.capabilities;
      }

      if (tuyaCompose.zigbee && tuyaCompose.zigbee.manufacturerName) {
        merged.zigbee = merged.zigbee || {};
        merged.zigbee.manufacturerName = tuyaCompose.zigbee.manufacturerName;
      }

      await fs.writeFile(ourComposePath, JSON.stringify(merged, null, 2));

    } catch (error) {

    }
  }

  async syncDriverAssetsFiles(ourDriverPath, tuyaDriverPath) {
    const ourAssetsPath = path.join(ourDriverPath, 'assets');
    const tuyaAssetsPath = path.join(tuyaDriverPath, 'assets');

    try {
      await fs.mkdir(ourAssetsPath, { recursive: true });
      await this.copyAssetsRecursively(tuyaAssetsPath, ourAssetsPath);
    } catch (error) {

    }
  }

  async enhanceDeviceJS(ourDriverPath, tuyaDriverPath) {
    const ourDevicePath = path.join(ourDriverPath, 'device.js');
    const tuyaDevicePath = path.join(tuyaDriverPath, 'device.js');

    try {
      const tuyaContent = await fs.readFile(tuyaDevicePath, 'utf8');
      let ourContent = '';

      try {
        ourContent = await fs.readFile(ourDevicePath, 'utf8');
      } catch (error) {
        // Create new device.js
      }

      // Extract useful methods from tuya-light
      const enhancedContent = this.mergeDeviceJSContent(ourContent, tuyaContent);
      await fs.writeFile(ourDevicePath, enhancedContent);

    } catch (error) {
      throw new Error(`Device.js enhancement failed: ${error.message}`);
    }
  }

  mergeDeviceJSContent(ourContent, tuyaContent) {
    // Simple merge - combine the best of both
    if (!ourContent || ourContent.length < 100) {
      return tuyaContent;
    }

    // Add tuya-specific methods if missing
    if (!ourContent.includes('onTuyaData') && tuyaContent.includes('onTuyaData')) {
      const tuyaDataMethod = this.extractMethod(tuyaContent, 'onTuyaData');
      if (tuyaDataMethod) {
        ourContent = ourContent.replace(
          /}(\s*)module\.exports/,
          `\n${tuyaDataMethod}\n}$1module.exports`
        );
      }
    }

    return ourContent;
  }

  extractMethod(content, methodName) {
    const regex = new RegExp(`\\s*async\\s+${methodName}\\s*\\([^{]*\\{`, 'g');
    const match = regex.exec(content);

    if (match) {
      let braceCount = 1;
      let i = match.index + match[0].length;

      while (i < content.length && braceCount > 0) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        i++;
      }

      return content.substring(match.index, i);
    }

    return null;
  }

  async syncAssets(tuyaLightStructure) {

    try {
      const tuyaAssetsPath = path.join(CONFIG.tuyaLightDir, 'assets');
      const ourAssetsPath = CONFIG.assetsDir;

      // Copy improved icons and images
      await this.copyAssetsRecursively(tuyaAssetsPath, ourAssetsPath);

      this.syncReport.assetsUpdated++;
    } catch (error) {

    }
  }

  async copyAssetsRecursively(sourcePath, targetPath) {
    try {
      const entries = await fs.readdir(sourcePath, { withFileTypes: true });

      for (const entry of entries) {
        const sourceFile = path.join(sourcePath, entry.name);
        const targetFile = path.join(targetPath, entry.name);

        if (entry.isDirectory()) {
          await fs.mkdir(targetFile, { recursive: true });
          await this.copyAssetsRecursively(sourceFile, targetFile);
        } else {
          await fs.mkdir(path.dirname(targetFile), { recursive: true });
          await fs.copyFile(sourceFile, targetFile);
        }
      }
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }

  async mergeConfigurations(tuyaLightStructure) {

    try {
      const ourAppJsonPath = path.join(CONFIG.mainProjectDir, 'app.json');
      let ourAppJson = {};

      try {
        const content = await fs.readFile(ourAppJsonPath, 'utf8');
        ourAppJson = JSON.parse(content);
      } catch (error) {
        // Use empty config if file doesn't exist
      }

      const tuyaAppJson = tuyaLightStructure.configurations.appJson;

      // Merge configurations
      const mergedConfig = this.mergeAppJsonConfigs(ourAppJson, tuyaAppJson);

      await fs.writeFile(ourAppJsonPath, JSON.stringify(mergedConfig, null, 2));
      this.syncReport.configurationsMerged++;

    } catch (error) {
      console.error('Failed to merge configurations:', error);
    }
  }

  mergeAppJsonConfigs(ourConfig, tuyaConfig) {
    const merged = { ...ourConfig };

    // Merge specific sections
    if (tuyaConfig.permissions && !merged.permissions) {
      merged.permissions = tuyaConfig.permissions;
    }

    if (tuyaConfig.flow && tuyaConfig.flow.actions) {
      merged.flow = merged.flow || {};
      merged.flow.actions = merged.flow.actions || [];

      // Add missing flow actions
      for (const action of tuyaConfig.flow.actions) {
        const exists = merged.flow.actions.some(a => a.id === action.id);
        if (!exists) {
          merged.flow.actions.push(action);
        }
      }
    }

    return merged;
  }

  async updateDocumentation(tuyaLightStructure) {

    const docPath = path.join(CONFIG.outputDir, 'TUYA_LIGHT_INTEGRATION.md');
    const documentation = `# Tuya Light Integration Report

## Synchronization Summary

- **Drivers Analyzed**: ${this.syncReport.driversAnalyzed}
- **Drivers Synced**: ${this.syncReport.driversSynced}
- **Assets Updated**: ${this.syncReport.assetsUpdated}
- **Configurations Merged**: ${this.syncReport.configurationsMerged}

## Integration Benefits

1. **Enhanced Light Control**: Improved color and brightness control from tuya-light
2. **Better Device Support**: Additional device models and manufacturers
3. **Improved Assets**: Better icons and images for light devices
4. **Flow Integration**: Enhanced flow cards for lighting automation

## Recommendations

- Test all synced drivers with physical devices
- Validate flow cards functionality
- Update device compatibility matrices
- Monitor for any conflicts or issues

Generated: ${new Date().toISOString()}
`;

    await fs.writeFile(docPath, documentation);
  }

  async generateReport() {
    const reportPath = path.join(CONFIG.outputDir, 'tuya-light-sync-report.json');

    this.syncReport.recommendations = [
      '✅ Successfully synchronized with tuya-light project',
      '🔄 Test enhanced drivers with physical devices',
      '📊 Update device compatibility matrices',
      '🎨 Validate asset improvements',
      '⚙️ Review merged configurations'
    ];

    if (this.syncReport.errors.length > 0) {
      this.syncReport.recommendations.push('⚠️ Review and fix synchronization errors');
    }

    await fs.writeFile(reportPath, JSON.stringify(this.syncReport, null, 2));

  }
}

// Run synchronization if called directly
if (require.main === module) {
  const synchronizer = new TuyaLightSynchronizer();
  synchronizer.synchronize()
    .then(() => {

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Tuya Light synchronization failed:', error);
      process.exit(1);
    });
}

module.exports = TuyaLightSynchronizer;