# 🌟 Contributors & Acknowledgments

Thank you to everyone who has contributed to the Universal Tuya Zigbee app! This community-maintained project wouldn't be possible without your support.

---

## 🏆 Core Team

### Dylan Rajasekaram (@dlnraja)
**Lead Developer & Maintainer**
- Email: senetmarne@gmail.com
- GitHub: https://github.com/dlnraja
- Role: Architecture, SDK3 migration, bug fixes, community support

---

## 🎯 Key Contributors

### Loïc Salmona
**BSEED Firmware Bug Detective** (November 2025)
- **Contribution**: Extensive testing and detailed logs for BSEED 2-gang switch firmware bug
- **Device**: _TZ3000_l9brjwau / TS0002
- **Impact**: Discovered hardware-level endpoint grouping bug, enabling workaround driver development
- **Support**: Provided comprehensive diagnostic logs and patient testing iterations
- **Special Thanks**: For not returning the devices and helping us solve this critical firmware issue!

### LIUOI
**Community Developer & Testing**
- **Contribution**: Driver testing, bug reports, and improvements
- **Support**: Active community member providing valuable feedback

### vl14-dev
**Device Support Contributor** (November 2025)
- **Contribution**: PR #46 - Added support for MOES/Tuya Zigbee AM25 Tubular Motor
- **Device**: _TZE200_nv6nxo0c / TS0601
- **Impact**: Expanded curtain motor compatibility

---

## 🐛 Bug Reporters & Testers

Thank you to all users who reported bugs and provided diagnostic logs:
- **Jocke Svensson** (bc57e77e): Settings page & flow card errors
- **Peter van Werkhoven** (9a3b9d7f): Sensor data reporting issues
- **Community Forum Members**: Ongoing support and testing

---

## 📚 Knowledge & Inspiration

### Johan Bendz
**Original Tuya Zigbee Developer**
- Original app inspiration and device database
- GitHub: https://github.com/JohanBendz/com.tuya.zigbee

### Athom Homey SDK Team
**SDK3 Framework**
- Homey SDK3 documentation and support
- ZigBee driver architecture

### Tuya Community
**Open-Source Manufacturer ID Database**
- ZHA-Device-Handlers project
- Zigbee2MQTT device definitions
- Community-maintained manufacturer ID lists

---

## 💰 Financial Support

If you'd like to support this project:
- **PayPal**: @dlnraja
- **Revolut**: Available on developer website

Special thanks to Loïc Salmona for offering financial support for bug fixes!

---

## 🛠️ How to Contribute

### Report Bugs
1. Provide Homey diagnostic reports (Device Settings → Advanced → Diagnostics)
2. Include manufacturer ID and product ID
3. Share logs if possible: `homey app run` output

### Add Device Support
1. Fork the repository
2. Add manufacturer ID to appropriate driver
3. Test device pairing and all capabilities
4. Submit PR with testing notes

### Improve Documentation
- Clarify pairing instructions
- Add troubleshooting guides
- Translate to additional languages

### Code Contributions
- Follow SDK3 best practices
- Add comprehensive logging
- Test with `homey app validate --level publish`
- Follow existing code style

---

## 📜 License & Credits

This app is **community-maintained** and built upon the work of many contributors.

**Original Work**: Johan Bendz (com.tuya.zigbee v2.x)  
**Current Maintainer**: Dylan Rajasekaram (v4.x+)  
**Community**: All contributors listed above

**License**: See LICENSE file

---

## 🎉 Hall of Fame

### Most Impactful Contributions (2024-2025)

1. **Loïc Salmona**: BSEED firmware bug discovery & extensive testing
2. **LIUOI**: Ongoing testing and community support
3. **vl14-dev**: Device support expansions
4. **Peter van Werkhoven**: Critical sensor bug reports
5. **Jocke Svensson**: Flow card & settings validation

---

**Want to be listed here?**  
Contribute bug reports, testing, code, or documentation!

_Last Updated: November 2, 2025_
