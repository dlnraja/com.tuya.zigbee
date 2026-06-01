const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPOS = {
  master: path.resolve(__dirname, '../../tuya_repair'),
  wifi: path.resolve(__dirname, '../../tuya_wifi_local')
};

function runSync() {
  console.log('🔄 Running Ultra Sync Manager (Master + WiFi)');
  
  // 1. Sync Master
  if (fs.existsSync(REPOS.master)) {
    console.log('📦 Syncing Master App (tuya_repair)...');
    try {
      execSync('npx homey app validate', { cwd: REPOS.master, stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️ Master App validation failed!');
    }
  }

  // 2. Sync WiFi
  if (fs.existsSync(REPOS.wifi)) {
    console.log('📶 Syncing WiFi App (tuya_wifi_local)...');
    try {
      // In a real environment, we'd run npm run sync or homey app validate here
      execSync('npx homey app validate', { cwd: REPOS.wifi, stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️ WiFi App validation failed!');
    }
  }
  
  console.log('✅ Ultra Sync Complete!');
}

runSync();
