const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { stringify } = require('csv-stringify/sync');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources');
const MATRICES_DIR = path.join(PROJECT_ROOT, 'matrices');

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  console.log(`Created docs directory: ${DOCS_DIR}`);
}

/**
 * Load a JSON file, returning an empty object if the file doesn't exist
 */
function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    console.warn(`⚠️  File not found: ${filePath}`);
    return [];
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Generate the main README.md file
 */
function generateReadme() {
  const packageJson = loadJsonFile(path.join(PROJECT_ROOT, 'package.json'));
  const version = packageJson.version || '1.0.0';
  const appName = packageJson.name || 'Homey Tuya Zigbee';
  const description = packageJson.description || 'Universal Tuya Zigbee Device Integration for Homey';
  
  const readmeContent = `# ${appName}

${description}

## 📦 Features

- **Local Control**: No cloud dependency - all communication happens locally
- **Wide Device Support**: Supports a wide range of Tuya Zigbee devices
- **Easy to Use**: Simple setup and configuration
- **Open Source**: Fully open source with an active community

## 📋 Supported Devices

For a complete list of supported devices, see [DEVICE_MATRIX.md](./DEVICE_MATRIX.md).

## 🚀 Installation

1. Install the app from the Homey App Store
2. Pair your Tuya Zigbee devices
3. Enjoy local control of your devices

## 🔧 Development

### Prerequisites

- Node.js ${packageJson.engines?.node || '18+'}
- Homey CLI: \`npm install -g homey\`

### Setup

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/homey-tuya-zigbee.git
cd homey-tuya-zigbee

# Install dependencies
npm install

# Link the app to Homey
homey app link
\`\`\`

### Building

\`\`\`bash
# Build the app
npm run build

# Deploy to Homey
homey app install
\`\`\`

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Resources

- [Homey Developer Documentation](https://developers.homey.app/)
- [Zigbee2MQTT Device Database](https://www.zigbee2mqtt.io/supported-devices/)
- [Blakadder's Zigbee Database](https://zigbee.blakadder.com/)

---

📅 **Last Updated**: ${new Date().toISOString().split('T')[0]}
`;

  fs.writeFileSync(path.join(PROJECT_ROOT, 'README.md'), readmeContent);
  console.log('✅ Generated README.md');
}

/**
 * Generate device compatibility documentation
 */
function generateDeviceMatrixDoc() {
  const deviceMatrix = loadJsonFile(path.join(MATRICES_DIR, 'device-matrix.json')) || [];
  
  // Group devices by manufacturer
  const devicesByManufacturer = {};
  deviceMatrix.forEach(device => {
    const manufacturer = device.manufacturer || 'Unknown';
    if (!devicesByManufacturer[manufacturer]) {
      devicesByManufacturer[manufacturer] = [];
    }
    devicesByManufacturer[manufacturer].push(device);
  });
  
  // Generate markdown content
  let markdown = `# Supported Devices

This document lists all supported Tuya Zigbee devices and their capabilities.

## Device Support Status

- **Total Devices**: ${deviceMatrix.length}
- **Manufacturers**: ${Object.keys(devicesByManufacturer).length}

## Device List by Manufacturer

`;

  // Add table of contents
  markdown += '### Table of Contents\n\n';
  Object.keys(devicesByManufacturer).sort().forEach(manufacturer => {
    markdown += `- [${manufacturer}](#${manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
  });
  markdown += '\n';

  // Add device tables by manufacturer
  Object.entries(devicesByManufacturer)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([manufacturer, devices]) => {
      markdown += `### ${manufacturer}\n\n`;
      markdown += '| Model | Description | Capabilities | Status |\n';
      markdown += '|-------|-------------|--------------|--------|\n';
      
      devices
        .sort((a, b) => a.model.localeCompare(b.model))
        .forEach(device => {
          const capabilities = Array.isArray(device.capabilities) 
            ? device.capabilities.join(', ') 
            : '';
          const status = device.issues?.length > 0 ? '⚠️ Partial' : '✅ Full';
          
          markdown += `| ${device.model} | ${device.description || '-'} | ${capabilities} | ${status} |\n`;
        });
      
      markdown += '\n';
    });
  
  // Add footer
  markdown += '---\n';
  markdown += `*Last updated: ${new Date().toISOString()}*\n`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'DEVICE_MATRIX.md'), markdown);
  console.log('✅ Generated DEVICE_MATRIX.md');
}

/**
 * Generate driver development documentation
 */
function generateDriverDocs() {
  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  
  if (!fs.existsSync(driversDir)) {
    console.warn('⚠️  Drivers directory not found');
    return;
  }
  
  const drivers = fs.readdirSync(driversDir)
    .filter(file => {
      const filePath = path.join(driversDir, file);
      return fs.statSync(filePath).isDirectory() && !file.startsWith('_');
    });
  
  if (drivers.length === 0) {
    console.warn('⚠️  No drivers found');
    return;
  }
  
  // Generate main driver documentation
  let driverDoc = `# Driver Development Guide

This document provides guidelines for developing and contributing drivers for the Homey Tuya Zigbee app.

## Available Drivers

`;
  
  drivers.forEach(driver => {
    driverDoc += `- [${driver}](#${driver.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
  });
  
  driverDoc += '\n## Driver Structure\n\n';
  driverDoc += 'Each driver should have the following structure:\n\n';
  driverDoc += '```\n';
  driverDoc += 'drivers/\n';
  driverDoc += '└── driver-name/\n';
  driverDoc += '    ├── assets/\n  driverDoc += '    │   ├── icon.svg\n  driverDoc += '    │   └── images/\n  driverDoc += '    │       └── icon.png\n  driverDoc += '    ├── device.js\n  driverDoc += '    └── driver.compose.json\n  driverDoc += '```\n\n';
  
  // Add documentation for each driver
  drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    let driverInfo = {};
    
    try {
      if (fs.existsSync(composePath)) {
        driverInfo = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      }
    } catch (e) {
      console.error(`❌ Error reading ${composePath}:`, e.message);
    }
    
    driverDoc += `## ${driverInfo.name || driver}\n\n`;
    
    if (driverInfo.description) {
      driverDoc += `${driverInfo.description}\n\n`;
    }
    
    // Add capabilities
    if (Array.isArray(driverInfo.capabilities) && driverInfo.capabilities.length > 0) {
      driverDoc += '### Capabilities\n\n';
      driverDoc += '| Capability | Description |\n';
      driverDoc += '|------------|-------------|\n';
      
      driverInfo.capabilities.forEach(cap => {
        // This is a simplified example - you might want to add more details about each capability
        driverDoc += `| ${cap} | - |\n`;
      });
      
      driverDoc += '\n';
    }
    
    // Add Zigbee configuration
    if (driverInfo.zigbee) {
      driverDoc += '### Zigbee Configuration\n\n';
      driverDoc += '| Setting | Value |\n';
      driverDoc += '|---------|-------|\n';
      
      Object.entries(driverInfo.zigbee).forEach(([key, value]) => {
        driverDoc += `| ${key} | ${JSON.stringify(value)} |\n`;
      });
      
      driverDoc += '\n';
    }
    
    // Add notes if available
    if (driverInfo.notes) {
      driverDoc += '### Notes\n\n';
      driverDoc += `${driverInfo.notes}\n\n`;
    }
    
    driverDoc += '---\n\n';
  });
  
  fs.writeFileSync(path.join(DOCS_DIR, 'DRIVER_DEVELOPMENT.md'), driverDoc);
  console.log('✅ Generated DRIVER_DEVELOPMENT.md');
}

/**
 * Generate CHANGELOG.md
 */
function generateChangelog() {
  let changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Basic device support for common Tuya Zigbee devices
- Documentation and contribution guidelines

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release

`;

  fs.writeFileSync(path.join(PROJECT_ROOT, 'CHANGELOG.md'), changelog);
  console.log('✅ Generated CHANGELOG.md');
}

/**
 * Generate CONTRIBUTING.md
 */
function generateContributing() {
  const contributing = `# Contributing to Homey Tuya Zigbee

Thank you for your interest in contributing to the Homey Tuya Zigbee project! We welcome contributions from the community to help improve this project.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/yourusername/homey-tuya-zigbee/issues) on GitHub. When reporting a bug, please include:

- A clear description of the issue
- Steps to reproduce the issue
- Expected vs. actual behavior
- Any relevant error messages or logs

### Submitting Pull Requests

1. Fork the repository and create a new branch for your changes
2. Make your changes, following the project's coding standards
3. Add or update tests as needed
4. Update the documentation if necessary
5. Submit a pull request with a clear description of your changes

### Development Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/homey-tuya-zigbee.git
   cd homey-tuya-zigbee
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Link the app to your Homey:
   \`\`\`bash
   homey app link
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

### Code Style

- Follow the existing code style
- Use 2 spaces for indentation
- Use single quotes for strings
- Include JSDoc comments for all functions and classes

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
`;

  fs.writeFileSync(path.join(PROJECT_ROOT, 'CONTRIBUTING.md'), contributing);
  console.log('✅ Generated CONTRIBUTING.md');
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Generating documentation...');
  
  // Generate documentation files
  generateReadme();
  generateDeviceMatrixDoc();
  generateDriverDocs();
  generateChangelog();
  generateContributing();
  
  console.log('\n✅ Documentation generation complete!');
  console.log(`📚 Documentation is available in the 'docs' directory.`);
}

// Run the main function
main();
