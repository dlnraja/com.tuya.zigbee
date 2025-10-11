# Contributing to Universal Tuya Zigbee

First off, thank you for considering contributing to Universal Tuya Zigbee! It's people like you that make this app better for the entire Homey community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Adding New Devices](#adding-new-devices)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our commitment to:

- Being respectful and inclusive
- Accepting constructive criticism gracefully
- Focusing on what is best for the community
- Showing empathy towards other community members

## 🎯 How Can I Contribute?

### Reporting Bugs

**Before submitting a bug report:**
- Check the [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues) to see if the problem has already been reported
- Check the [Homey Forum thread](https://community.homey.app/t/140352/) for similar issues

**When submitting a bug report, include:**
- Device manufacturer and model number
- Homey diagnostic report (`homey app run` output)
- Expected vs. actual behavior
- Steps to reproduce
- Screenshots if applicable

### Suggesting Features

We love feature suggestions! Please create an issue with:
- Clear description of the feature
- Why it would be useful to users
- Any technical considerations
- Examples from other apps (if applicable)

### Adding Device Support

See the [Adding New Devices](#adding-new-devices) section below.

### Improving Documentation

Documentation improvements are always welcome:
- Fix typos or clarify existing docs
- Add examples
- Translate documentation
- Create tutorials or guides

---

## 🛠️ Development Setup

### Prerequisites

```bash
# Required
Node.js 18+ (recommended: 20.x)
npm 9+
Homey CLI

# Optional but recommended
Git
Visual Studio Code with Homey extension
```

### Initial Setup

1. **Fork the repository**
   ```bash
   # On GitHub, click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/com.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/dlnraja/com.tuya.zigbee.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Validate the app**
   ```bash
   npx homey app validate --level publish
   ```

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/add-device-xyz

# Make your changes
# ...

# Test locally
npx homey app install

# Validate
npx homey app validate --level publish

# Commit your changes
git add .
git commit -m "feat: add support for device XYZ"

# Push to your fork
git push origin feature/add-device-xyz

# Create Pull Request on GitHub
```

---

## 📥 Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding guidelines
- [ ] All tests pass (`npx homey app validate --level publish`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow conventional commits format

### PR Guidelines

1. **One feature per PR** - Keep PRs focused and atomic
2. **Descriptive title** - Use format: `feat: add device XYZ support`
3. **Detailed description** - Explain what, why, and how
4. **Link related issues** - Use "Fixes #123" syntax
5. **Keep it small** - Easier to review, faster to merge

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat(drivers): add support for TS0601 gas sensor
fix(temp-sensor): correct temperature parsing for _TZE200_bjawzodf
docs(readme): update installation instructions
```

---

## 📝 Coding Guidelines

### General Principles

1. **Follow SDK3 standards** - Comply with Homey SDK3 requirements
2. **UNBRANDED approach** - Organize by function, not brand
3. **Descriptive names** - Clear, self-documenting code
4. **No hardcoded values** - Use constants or configuration
5. **Error handling** - Always handle errors gracefully

### JavaScript Style

```javascript
// Good
class TemperatureSensor extends ZigBeeDevice {
  async onNodeInit() {
    await super.onNodeInit();
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
  }
}

// Bad
class TempSensor extends Device {
  onNodeInit() {
    this.registerCapability('measure_temperature','msTemperatureMeasurement')
  }
}
```

### Driver Structure

```javascript
// drivers/device_name/device.js
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class DeviceName extends ZigBeeDevice {
  async onNodeInit() {
    await super.onNodeInit();
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Configure reporting
    await this.configureAttributeReporting([{
      cluster: 'genOnOff',
      attributeName: 'onOff',
      minInterval: 0,
      maxInterval: 300,
      minChange: 1
    }]);
    
    this.log('Device initialized');
  }
}

module.exports = DeviceName;
```

### Driver Manifest

```json
{
  "id": "device_name",
  "name": {
    "en": "Device Name"
  },
  "class": "light",
  "capabilities": ["onoff"],
  "zigbee": {
    "manufacturerName": ["Tuya", "_TZ3000_xxxxxxxx"],
    "productId": ["TS0001"],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 4, 5, 6],
        "bindings": [6]
      }
    }
  }
}
```

---

## 🔌 Adding New Devices

### Step 1: Gather Device Information

**Required information:**
- Manufacturer name (e.g., `_TZ3000_xxxxxxxx`)
- Product ID (e.g., `TS0001`)
- Zigbee clusters used
- Capabilities (onoff, dim, temperature, etc.)
- Endpoints configuration

**How to get this info:**
```bash
# Interview device
npx homey app run
# Pair the device and check logs
```

### Step 2: Find Similar Driver

Look for an existing driver with similar capabilities:

```bash
# Search for similar devices
grep -r "TS0001" drivers/
```

### Step 3: Add Manufacturer ID

**If driver exists:**

Add manufacturer ID to existing driver:

```json
{
  "zigbee": {
    "manufacturerName": [
      "Tuya",
      "_TZ3000_existing",
      "_TZ3000_yournewid"  // Add here
    ]
  }
}
```

**If creating new driver:**

1. Copy similar driver folder
2. Rename folder to descriptive name (e.g., `smart_plug_energy`)
3. Update `driver.compose.json`
4. Update `device.js` if needed
5. Add images (75x75 small, 500x500 large)

### Step 4: Test Thoroughly

```bash
# Build app
npx homey app build

# Install on Homey
npx homey app install

# Test device:
# - Pairing
# - All capabilities
# - Reporting
# - Flow cards
```

### Step 5: Document

Update:
- CHANGELOG.md
- README.md (if adding new category)
- driver comments

---

## 🧪 Testing

### Local Testing

```bash
# Validate app
npx homey app validate --level publish

# Install locally
npx homey app install

# Check logs
npx homey app run
```

### Manual Tests

For each new device:
- [ ] Device pairs successfully
- [ ] All capabilities work (on/off, dim, temperature, etc.)
- [ ] Values update correctly
- [ ] Battery reporting works (if applicable)
- [ ] Flow cards trigger correctly
- [ ] Settings page accessible
- [ ] Device icon displays correctly

### Validation Levels

```bash
# Development
npx homey app validate --level debug

# Before PR
npx homey app validate --level publish

# For verified developers
npx homey app validate --level verified
```

---

## 📚 Documentation

### What to Document

- **Code comments** - Explain complex logic
- **Driver README** - Special device notes
- **CHANGELOG.md** - All user-facing changes
- **README.md** - New features/categories

### Documentation Style

```javascript
/**
 * Parse temperature value from Zigbee attribute
 * 
 * @param {number} value - Raw temperature value (int16)
 * @returns {number} Temperature in Celsius
 * 
 * Note: Some Tuya devices report in Fahrenheit, convert if needed
 */
parseTemperature(value) {
  return value / 100; // Divide by 100 to get actual value
}
```

---

## 🚀 GitHub Actions & CI/CD

This project uses automated workflows:

- **Validation** - Runs on all PRs
- **Publishing** - Automated on master push
- **Versioning** - Automatic semantic versioning

**Your PR will automatically:**
- Be validated at publish level
- Check JSON syntax
- Verify driver structure

---

## 🔗 Useful Resources

### Official Documentation
- [Homey Apps SDK](https://apps.developer.homey.app/)
- [Zigbee Clusters](https://apps.developer.homey.app/wireless/zigbee)
- [Device Capabilities](https://apps.developer.homey.app/drivers-and-devices/capabilities)

### Community Resources
- [Homey Forum](https://community.homey.app/)
- [Zigbee2MQTT Devices](https://www.zigbee2mqtt.io/supported-devices/)
- [Blakadder Zigbee DB](https://zigbee.blakadder.com/)

### Tools
- [Homey Developer Tools](https://tools.developer.homey.app/)
- [Homey CLI](https://www.npmjs.com/package/homey)

---

## ❓ Questions?

- **GitHub Issues:** For bugs and features
- **Homey Forum:** For general questions
- **Pull Requests:** For code discussions

---

## 🙏 Thank You!

Your contributions make this app better for everyone. Thank you for taking the time to contribute!

---

**Happy Coding! 🚀**

*Universal Tuya Zigbee Team*
