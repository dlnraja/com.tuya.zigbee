const fs = require('fs');

console.log('📝 DYNAMIC README GENERATOR');

// Scan drivers directory
const drivers = fs.readdirSync('drivers');
const driversByCategory = {
    'Motion & Presence': [],
    'Climate & Environment': [],
    'Smart Lighting': [],
    'Power & Energy': [],
    'Security & Safety': [],
    'Automation Control': []
};

// Categorize drivers automatically
drivers.forEach(driver => {
    if (driver.includes('motion') || driver.includes('pir') || driver.includes('presence')) {
        driversByCategory['Motion & Presence'].push(driver);
    } else if (driver.includes('climate') || driver.includes('temp') || driver.includes('humid') || driver.includes('co2')) {
        driversByCategory['Climate & Environment'].push(driver);
    } else if (driver.includes('light') || driver.includes('bulb') || driver.includes('led') || driver.includes('dimmer')) {
        driversByCategory['Smart Lighting'].push(driver);
    } else if (driver.includes('plug') || driver.includes('energy') || driver.includes('power')) {
        driversByCategory['Power & Energy'].push(driver);
    } else if (driver.includes('smoke') || driver.includes('leak') || driver.includes('door') || driver.includes('lock')) {
        driversByCategory['Security & Safety'].push(driver);
    } else {
        driversByCategory['Automation Control'].push(driver);
    }
});

const readme = `# 🏠 Ultimate Zigbee Hub

## 🌟 Professional UNBRANDED Zigbee Device Support

**The most comprehensive Zigbee device compatibility app for Homey, organized by device FUNCTION, not brand.**

### 📊 Statistics
- **${drivers.length} Professional Drivers** 
- **UNBRANDED Organization** by device function
- **Complete Manufacturer IDs** (no wildcards)
- **Based on Johan Bendz** + Homey Community contributions

### 🎯 Device Categories

${Object.entries(driversByCategory).map(([category, driverList]) => 
    `#### ${category} (${driverList.length} drivers)
${driverList.slice(0, 5).map(d => `- ${d.replace(/_/g, ' ')}`).join('\n')}
${driverList.length > 5 ? `- ...and ${driverList.length - 5} more` : ''}`
).join('\n\n')}

### 🏭 Technical Excellence
- **Homey SDK3** compliant
- **Complete manufacturer IDs** from all sources
- **Professional UNBRANDED** user experience  
- **Auto-published** via GitHub Actions

### 📱 Installation
Available on Homey App Store: [Ultimate Zigbee Hub](https://homey.app/a/com.dlnraja.ultimate.zigbee.hub/)

### 🙏 Credits
- **Johan Bendz** - Architecture inspiration
- **Homey Community** - Testing & feedback
- **Contributors** - Device compatibility data

### 🔗 Links
- [Homey App Store](https://apps.developer.homey.app/app-store/publishing)
- [GitHub Repository](https://github.com/dlnraja/com.tuya.zigbee)
- [Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/)`;

fs.writeFileSync('README.md', readme);
console.log('✅ Dynamic README generated with current driver stats');
