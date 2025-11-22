# 🚀 Universal TUYA Zigbee - Major Update v4.0.6 Coming Soon!

**Date:** October 21, 2025  
**Author:** Dylan Rajasekaram (@dlnraja)  
**Status:** GitHub Actions Publishing  

Hi everyone! 👋

Exciting updates coming to Universal TUYA Zigbee! I've been working hard on several major improvements based on community feedback and forum diagnostics.

---

## 🎯 What's New in v4.0.6

### 1️⃣ **Motion Aware - Passive Presence Detection (INNOVATION!)**

I'm thrilled to introduce **Motion Aware** - a groundbreaking feature inspired by Philips Hue technology that lets your Zigbee bulbs act as **passive presence detectors**!

**How it works:**
- Uses existing Zigbee bulbs (no extra hardware needed!)
- Monitors RSSI/LQI signal strength changes
- Detects human presence by analyzing signal perturbations
- Zero additional cost if you already have compatible bulbs

**Compatible Drivers (16 bulbs):**
- LSC bulbs (3 models)
- INNR bulbs (3 models)
- MOES bulbs (4 models)
- OSRAM bulbs (3 models)
- Philips bulbs (3 models)

**New Flow Cards:**
- "Presence detected (Motion Aware)" - with RSSI & deviation tokens
- "Presence cleared (Motion Aware)"

**Settings:**
- Sensitivity: Low / Medium / High
- Configurable timeout
- Auto-calibration

**Status:** Phase 1 complete (R&D, documentation, code implemented)  
**Coming:** Beta testing in next release

**References:**
- [Philips Hue Motion Aware explained](https://www.domo-blog.fr/decouverte-configuration-hue-motion-aware-philips-hue-invente-detection-presence-par-ampoules/)

---

### 2️⃣ **Multi-Brand Expansion (+26 Manufacturer IDs)**

The app now supports **10 additional major Zigbee brands**:

✅ **Samsung SmartThings** (5 manufacturer IDs)  
✅ **Sonoff** (4 IDs)  
✅ **Philips Hue** (2 IDs)  
✅ **Xiaomi** (6 IDs)  
✅ **OSRAM** (2 IDs)  
✅ **Innr** (2 IDs)  
✅ **Aqara** (6 IDs)  
✅ **IKEA Tradfri** (4 IDs)  
✅ **LSC** (2 IDs)  
✅ **Nous** (3 IDs)

**Total brands supported:** 14 (including existing ZEMISMART, MOES, Tuya, Avatto)  
**Total manufacturer IDs:** 109+

---

### 3️⃣ **IAS Zone Bug Fixed (CRITICAL)**

**Issue:** Motion sensors and SOS buttons not triggering  
**Cause:** IEEE address retrieval failure during IAS Zone enrollment  
**Solution:** Implemented 7 fallback methods for IEEE retrieval

**Affected devices NOW FIXED:**
- Motion sensors (all brands)
- Door/window contact sensors
- SOS/Emergency buttons
- Any IAS Zone device

**If you had this issue:** Please re-pair your devices after updating to v4.0.6

---

### 4️⃣ **Forum Diagnostics - Active Support**

I've been actively analyzing diagnostic reports from the community:

✅ **Log 200a2ea9:** IAS Zone bug confirmed + fix deployed  
✅ **Log c74e867d:** All OK (informational)  
✅ **Log e8c595d9:** All OK (duplicate report)  
✅ **Log 2c72fd5f:** Investigating "no data" issue (awaiting user details)

**Thank you** to everyone who submitted diagnostics! Your logs help make the app better for everyone.

---

## 📊 Current Stats

- **Drivers:** 183 (optimized)
- **Manufacturer IDs:** 109+
- **Brands:** 14 major brands
- **Flow Cards:** 600+
- **Languages:** 4 (EN/FR/NL/DE)
- **SDK:** v3 compliant

---

## 🔄 Deployment Status

**Current version:** v4.0.5  
**Next version:** v4.0.6  
**Status:** GitHub Actions building now  
**ETA:** 1-2 hours  

**How to update:**
1. Wait for Homey App Store notification
2. Update via Homey App Store
3. For critical bugs (IAS Zone): Re-pair affected devices

---

## 🆘 Need Help?

### Diagnostic Logs
If you have issues, please send diagnostic logs:

**Method 1: Homey Developer Tools**
1. Go to https://tools.developer.homey.app/
2. Select your Homey
3. Open your app
4. Click "Send Diagnostic Report"
5. Add description of issue

**Method 2: Reply to diagnostic email**
If you already sent a diagnostic, I'll reply via email with troubleshooting steps.

### Common Issues

**"No data on devices"**
- Check battery level (if battery-powered)
- Verify device is online in Homey
- Try moving device closer to Homey
- Last resort: Re-pair device

**"Motion sensor not working"**
- Update to v4.0.6 when available
- Re-pair device (critical!)
- Check IAS Zone enrollment in logs

---

## 🎯 Roadmap Ahead

### Completed ✅
- Multi-brand support (14 brands)
- IAS Zone bug fix
- Motion Aware R&D complete
- Forum diagnostics system
- 183 optimized drivers

### In Progress 🔄
- Motion Aware beta testing
- Community feedback integration
- Additional device requests

### Planned 📋
- Motion Aware Phase 2 (fine-tuning)
- More brand integrations
- Advanced flow card features
- Device auto-discovery improvements

---

## 💬 Community Feedback

I want to give a huge **THANK YOU** to:

- **@Peter_van_Werkhoven** - for patience, testing, and detailed reports
- **@Nicolas** - for constructive questions and interest
- **@deejayreissue** - for testing scene switches
- **All diagnostic reporters** - your logs make this possible!

This is a **community-driven project** and your feedback shapes the future of the app.

---

## 🔗 Important Links

**GitHub:** https://github.com/dlnraja/com.tuya.zigbee  
**Documentation:** Check GitHub README  
**Support:** Reply here or send diagnostics  

---

## 🎉 What Makes This Update Special

1. **First Homey app with Motion Aware** - passive presence detection via bulbs
2. **Massive compatibility** - 14 brands, 109+ manufacturer IDs
3. **Critical bug fixes** - IAS Zone enrollment resolved
4. **Active community support** - diagnostic emails, forum responses
5. **Professional development** - GitHub Actions, automated testing, SDK3

---

## 📢 Final Words

This update represents **weeks of development**, bug hunting, and community collaboration. 

**v4.0.6 is not just an update** - it's a major leap forward in:
- Innovation (Motion Aware)
- Compatibility (14 brands)
- Stability (IAS Zone fix)
- Support (active diagnostics)

**ETA:** 1-2 hours from now  
**Action:** Check Homey App Store for update notification

---

**Questions? Issues? Feedback?**

Reply to this thread or send diagnostic logs. I'm here to help!

Best regards,  
**Dylan Rajasekaram**  
Universal Tuya Zigbee Developer

---

*P.S. - Motion Aware is still in Phase 1 (R&D complete). Beta testing will start after current release stabilizes. Stay tuned!* 🎯
