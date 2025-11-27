# Contributing to Universal Tuya Zigbee

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🎯 How Can You Contribute?

### 1. Report Bugs

Use **[GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues/new)** to report bugs.

**Good bug report includes:**
- Device type and model
- Steps to reproduce
- Expected vs actual behavior
- Homey version and app version
- Logs (if applicable)

### 2. Request New Devices

Use **[Device Request Template](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=device-request.md)**.

**Required information:**
- Device manufacturer and model
- Zigbee manufacturer ID (from Homey developer tools)
- Product ID (if available)
- Photos of the device
- Where you bought it

### 3. Add New Drivers

**Step-by-step process:**

1. **Fork the repository**
2. **Create driver structure:**
   
   drivers/
   └── your_device_name/
       ├── driver.compose.json
       ├── device.js
       └── assets/
           └── images/
               ├── small.png
               └── large.png

3. **driver.compose.json example:** See existing drivers for format

4. **device.js example:** Extend ZigBeeDevice class and register capabilities

5. **Validate:** Run: homey app validate

6. **Test:**
   - Pair device with Homey
   - Test all capabilities
   - Test flows

7. **Submit PR**

### 4. Improve Documentation

Documentation is always welcome!

**Areas:**
- README improvements
- FAQ additions
- Troubleshooting guides
- Translation improvements

### 5. Code Quality

**Standards:**
- ESLint configuration (npm run lint)
- Homey SDK3 compliance
- No hardcoded values
- Comments for complex logic

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Homey CLI (`npm install -g homey`)
- Git

### Setup

1. **Clone:** git clone https://github.com/dlnraja/com.tuya.zigbee.git

2. **Install dependencies:** npm install

3. **Validate:** homey app validate

4. **Build:** homey app build

---

## 📋 Code Standards

### Driver Naming

**Format:** `device_type_power_source`

**Examples:**
- `motion_sensor_battery`
- `smart_plug_ac`
- `thermostat_hybrid`

### Capabilities

**Use standard Homey capabilities:**
- `alarm_motion`, `alarm_contact`
- `measure_temperature`, `measure_humidity`
- `onoff`, `dim`
- `measure_battery`

### Clusters

**Always use numeric format:** [0, 1, 3, 1280]

**Common mappings:**
- 0: basic
- 1: powerConfiguration
- 3: identify
- 6: onOff
- 8: levelControl
- 1026: temperatureMeasurement
- 1280: iasZone

---

## 🧪 Testing

### Manual Testing

1. Pair device
2. Test each capability
3. Create flow with trigger
4. Test action (if applicable)
5. Test condition (if applicable)
6. Verify battery reporting
7. Test offline/online behavior

### Automated Tests

Run tests: npm test

---

## 📝 Pull Request Process

### Before Submitting

- [ ] Code follows project standards
- [ ] `homey app validate` passes
- [ ] Device tested with real hardware
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

### PR Template

**Title:** Clear, descriptive (e.g., "Add support for Motion Sensor XYZ")

**Description:**
- What: What does this PR do?
- Why: Why is this change needed?
- How: How does it work?
- Testing: How was it tested?

### Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainer
3. Testing with real device (if possible)
4. Merge when approved

---

## 🎯 Priority Areas

### High Priority

- Device support requests from forum
- Bug fixes for existing drivers
- Flow cards improvements
- IAS Zone enrollment issues

### Medium Priority

- Documentation improvements
- Test coverage
- Performance optimizations
- New features

### Low Priority

- Code refactoring
- UI/UX improvements
- Advanced automation

---

## 📚 Resources

### Documentation

- [Homey SDK3 Docs](https://apps.developer.homey.app/)
- [Zigbee Clusters](https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf)
- [Zigbee2MQTT Devices](https://www.zigbee2mqtt.io/supported-devices/)

### Tools

- [Homey Developer Tools](https://developer.athom.com/)
- [Zigbee Cluster Library](https://zigbeealliance.org/)
- [Tuya IoT Platform](https://iot.tuya.com/)

---

## 🙏 Credits

**Always credit:**
- Original device support source (Zigbee2MQTT, Home Assistant, etc.)
- Community members who reported the device
- Johan Bendz for the original app

---

## ❓ Questions?

- **Forum:** [Homey Community](https://community.homey.app/)
- **Issues:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

---

**Thank you for contributing!** 🎉
