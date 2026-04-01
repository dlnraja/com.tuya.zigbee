const fs = require('fs');
const path = require('path');
const reader = require('./.github/scripts/gmail-imap-reader.js');

const mockEmail = `
Date: Sun, 28 Mar 2026 20:30:00 +0100
From: "Homey App Tuya Zigbee" <noreply@athom.com>
Subject: [App Crash] Tuya Zigbee by dlnraja - Diagnostic Report

A user has sent a diagnostic report from your app Tuya Zigbee (com.dlnraja.tuya.zigbee).

Message from user:
Hi, my soil sensor _TZE284_oitavov2 is not updating battery level.
Also Johan mentioned on the forum that the Besterm WiFi radiator is missing some features.
Diagnostic ID: 9f8e7d6c

Crash Log:
Error: Missing DP mapping for battery
    at TuyaEF00Manager.processDP (/app/lib/tuya/TuyaEF00Manager.js:450:15)
    at ZigBeeDevice.onDPReport (/app/lib/devices/TuyaHybridDevice.js:200:10)
    
App Version: 5.11.143
Homey Version: 10.0.0
`;

try {
  const pseudo = reader.extractPseudo(mockEmail);
  const crashData = reader.extractCrashData(mockEmail);

  console.log('Pseudo:', pseudo);
  console.log('Crash Data:', crashData);

  const testDir = path.join(__dirname, 'scripts', 'temp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'mock-diag.json'), JSON.stringify({ pseudo, crashData }, null, 2));
} catch (e) {
  console.error("Error executing:", e.message);
}
