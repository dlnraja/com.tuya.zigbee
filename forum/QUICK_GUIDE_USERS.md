# Quick Guide for Users

## 🔧 Quick Fixes to Try First

Before reporting an issue, please try these steps:

1. **Reset the device**
   - Most Tuya devices: Press and hold button for 5-10 seconds until LED blinks rapidly
   - Remove device from Homey, then re-pair

2. **Pair close to Homey**
   - Stay within 1 meter during pairing
   - This ensures strong signal and proper enrollment

3. **Select the correct driver**
   - Use the specific driver for your device type (motion sensor, plug, switch, etc.)
   - Avoid generic "Tuya" drivers when a specific one exists

4. **Check power source**
   - Battery devices: Replace with fresh batteries
   - Powered devices: Ensure stable power supply

5. **Zigbee network health**
   - Add powered devices (plugs, bulbs) as routers
   - Keep devices within 10m of Homey or a router

---

## 📝 How to Request Device Support

To help us add your device quickly, please provide:

### Required Information
1. **Device details**
   - Brand name
   - Model number (printed on label)
   - Purchase link (Amazon/AliExpress)

2. **Photos**
   - Clear photo of device label showing model number
   - Photo of the device itself

3. **Zigbee information**
   - Go to Homey Developer Tools > Zigbee
   - Copy the device information (manufacturerName, modelId, clusters)

4. **Pairing logs**
   - Enable logging before pairing
   - Copy any error messages

### Optional but Helpful
- Link to Zigbee2MQTT or Home Assistant if device is supported there
- For TS0601 devices: DP list from logs
- Description of expected capabilities (on/off, dimming, temperature, etc.)

---

## 📤 How to Send Logs

### Normal Logs (Default)
1. Open Homey app
2. Go to Settings > Apps > Tuya Universal
3. Enable "Log" option
4. Reproduce the issue
5. Copy logs and paste in your report

### Debug Logs (Only if requested)
Debug logs are verbose. Only enable if specifically asked:

1. Add to your device settings:
   ```
   LOG_LEVEL=debug
   ```
2. Restart the device
3. Reproduce issue
4. Send logs
5. **Important**: Set back to `LOG_LEVEL=info` after troubleshooting

---

## 🆘 Common Issues & Solutions

### Device pairs but doesn't respond
- **Solution**: Reset device, pair within 1m of Homey, ensure batteries are fresh

### Motion sensor not enrolling (IAS Zone error)
- **Solution**: Keep sensor within 1m during pairing, wait 30 seconds after pairing before moving

### Contact sensor shows wrong state
- **Solution**: Reset sensor, check battery level, ensure magnet is close enough when "closed"

### Curtain/blind doesn't move
- **Solution**: Check calibration, ensure power supply is stable, verify position limits are set

### Energy meter shows no data
- **Solution**: Wait 60 seconds after pairing, check if device is actually consuming power

---

## 🔗 Useful Links

- **GitHub Repository**: [github.com/dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)
- **Device Request Template**: [Create issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=device_request.md)
- **Bug Report Template**: [Report bug](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=bug_report.md)
- **Homey Community Forum**: [forum.homey.app](https://forum.homey.app)

---

## 💡 Tips for Best Results

1. **Patience during pairing**: Some devices need 30-60 seconds to fully initialize
2. **Mesh network**: More powered devices = better reliability
3. **Fresh batteries**: Weak batteries cause many issues with sensors
4. **Firmware updates**: Keep Homey firmware up to date
5. **One change at a time**: When troubleshooting, change one thing at a time

---

## 💝 Support This Project

This app is developed and maintained in spare time. If it helps you and you'd like to support future development:

- **PayPal**: dylan.rajasekaram@gmail.com
- **Revolut**: @dlnraja

Completely optional, but deeply appreciated. Thank you! 🙏

---

**Last updated**: 2025-01-19  
**App version**: 3.1.3+
