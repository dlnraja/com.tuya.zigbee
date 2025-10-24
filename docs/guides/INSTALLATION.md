# 📥 Installation Guide - Universal Tuya Zigbee

**Version:** 2.1.51  
**Platform:** Homey Pro  
**SDK:** v3  
**Last Updated:** 2025-10-11

---

## 🎯 Quick Install

### Method 1: Homey App Store (Recommended)

1. Open Homey mobile app
2. Go to **Apps**
3. Search for **"Universal Tuya Zigbee"**
4. Tap **Install**
5. Wait for installation to complete

**That's it!** The app is ready to use.

---

## 💻 Advanced Installation Methods

### Method 2: Test Version (Beta Testing)

**Test URL:**
```
https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

1. Open test URL in browser
2. Login with Homey account
3. Click **Install**
4. Choose your Homey Pro

**Note:** Test versions include latest features before official release.

---

### Method 3: GitHub Installation (Developers)

**Prerequisites:**
- Node.js 18+ installed
- Homey CLI installed
- Git installed

**Steps:**

```bash
# 1. Clone repository
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# 2. Install dependencies
npm install

# 3. Login to Homey
npx homey login

# 4. Install on your Homey
npx homey app install
```

**Verification:**
```bash
# Check app is installed
npx homey app list
```

---

### Method 4: Local Development Installation

For developers working on the app:

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npx homey app run

# 3. In another terminal, watch for changes
npx homey app build --watch

# 4. Install when ready
npx homey app install
```

---

## ✅ Post-Installation

### 1. Verify Installation

1. Open Homey app
2. Go to **Apps**
3. Find **Universal Tuya Zigbee**
4. Should show version **2.1.51**

### 2. Configure Settings (Optional)

1. Open app settings
2. Configure:
   - **Debug logging**: Enable for troubleshooting
   - **Community updates**: Receive notifications
   - **Reporting interval**: Device update frequency
   - **Temperature offset**: Calibration
   - **Humidity offset**: Calibration

### 3. Add Your First Device

1. Go to **Devices** → **Add Device**
2. Select **Universal Tuya Zigbee**
3. Choose device category:
   - Motion & Presence Detection
   - Temperature & Climate
   - Smart Lighting
   - Power & Energy
   - Safety & Detection
   - Contact & Security
   - Automation Control
   - Curtains & Blinds
4. Put device in pairing mode
5. Follow on-screen instructions

---

## 🔧 Troubleshooting

### App not appearing in store

**Solution:**
- Update Homey firmware to latest version
- Restart Homey
- Check internet connection

### Installation fails

**Common causes:**
1. **Insufficient space**
   - Free up space by removing unused apps
   
2. **Network issues**
   - Check Homey internet connection
   - Restart router
   
3. **Homey firmware outdated**
   - Update to latest firmware
   - Settings → System → Updates

### App crashes after installation

**Steps:**
1. Restart Homey
2. Reinstall app
3. Check Homey logs
4. Report issue with logs

---

## 🔄 Updating the App

### Automatic Updates (Recommended)

Homey automatically updates apps when new versions are available.

**Check for updates:**
1. Open Homey app
2. Go to **Apps**
3. Look for update badge on app icon

### Manual Update

```bash
# For GitHub installation
cd com.tuya.zigbee
git pull origin master
npm install
npx homey app install
```

---

## 🗑️ Uninstallation

### Via Homey App

1. Open Homey app
2. Go to **Apps**
3. Find **Universal Tuya Zigbee**
4. Tap **...** (three dots)
5. Select **Uninstall**
6. Confirm

**Note:** All devices paired via this app will be removed.

### Via CLI

```bash
npx homey app uninstall com.dlnraja.tuya.zigbee
```

---

## 📊 System Requirements

### Homey Hardware

- **Homey Pro (2019 or later):** ✅ Fully supported
- **Homey Cloud:** ✅ Supported (verified developer account)
- **Homey Bridge:** ❌ Not supported (Zigbee required)

### Firmware Requirements

- **Minimum:** Homey firmware 8.0.0
- **Recommended:** Latest stable firmware
- **Compatibility:** >=12.2.0 for advanced capabilities

### Network Requirements

- Stable internet connection (for initial install)
- Local network access
- No special ports or firewall rules needed

### Zigbee Requirements

- Homey Zigbee radio enabled
- Zigbee channel configured
- No Zigbee network interference

---

## 🔐 Permissions

This app requires the following permissions:

- **Zigbee**: Device communication
- **Homey API**: Device management
- **Flow**: Create automation flows

**No cloud access required** - All communication is local Zigbee.

---

## 📱 Supported Devices

### Device Compatibility

- **164 drivers** covering 2,000+ manufacturer IDs
- **100% local** Zigbee control
- **No cloud API** required
- **Zigbee2MQTT** compatible

### Check Device Compatibility

Before buying a device:

1. Check [Supported Devices List](https://github.com/dlnraja/com.tuya.zigbee#device-categories)
2. Look for manufacturer ID on device box
3. Search in Zigbee2MQTT database
4. Ask in Homey Community forum

---

## 🆘 Getting Help

### Documentation

- **README.md** - Project overview
- **CONTRIBUTING.md** - Development guide
- **PUBLICATION_GUIDE_OFFICIELLE.md** - Publication process
- **CHANGELOG.md** - Version history

### Community Support

- **Homey Forum:** https://community.homey.app/t/140352/
- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues

### Reporting Issues

When reporting issues, include:
- Homey firmware version
- App version (2.1.51)
- Device manufacturer and model
- Homey diagnostic report
- Steps to reproduce

---

## 🎓 Next Steps

After installation:

1. **Add devices** - Pair your Tuya Zigbee devices
2. **Create flows** - Automate with 1,767 flow cards
3. **Configure settings** - Optimize for your needs
4. **Join community** - Share experiences and help others

---

## 🔗 Quick Links

- **Test URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- **Live URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/
- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee
- **Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

---

**Happy Installing! 🚀**

*Universal Tuya Zigbee Team*
