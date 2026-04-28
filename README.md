# Universal Tuya Unified Engine v7.4.6

[![Homey Test Install](https://img.shields.io/badge/Homey-Test_Install-00E6A0?style=for-the-badge&logo=homey)](https:
[![SDK 3](https://img.shields.io/badge/SDK-3-blue?style=for-the-badge)](https:
[![Zero Defect](https://img.shields.io/badge/Zero-Defect-black?style=for-the-badge)](https:

A high-performance, unified, local-first engine for Tuya Zigbee and WiFi devices on Homey Pro. Supporting over **22,400+ device variants** through autonomous behavioral analysis and adaptive protocol translation.

##  Key Features

- **Unified Hybrid Driver**: One driver handles thousands of device variations across ZCL and Tuya DP protocols.
- **Resilient Identity Engine**: Case-insensitive manufacturer and product ID resolution for absolute pairing reliability.
- **Standardized 10-Byte Time Sync**: Robust synchronization for LCD clocks (TZE284 series) with sequence-echoing support.
- **Autonomous Error Correction**: Self-healing flow card links and NaN-hardened sensor reporting.
- **Green Power Support**: Minimalist integration for ultra-low power Zigbee switches.
- **Zero-Conf WiFi Bridge**: Local-first control for Tuya WiFi devices.

##  Installation

1. Install the [Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) for the latest stability fixes.
2. Pair your device using the "Search for my device" option.
3. If your device is not recognized, please provide a diagnostic report on the [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues).

##  Architectural Standard

This project adheres to the **"Zero-Defect Architectural Shield"**:
- **Rule 21**: Interoperable flow cards via capability filtering.
- **Rule 24**: Case-insensitive identity resolution.
- **Rule 25**: Standardized 10-byte time sync protocol.

---
© 2026 Dylan Rajasekaram | [Donate via PayPal](https://paypal.me/dlnraja)
