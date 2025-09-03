const fs = require('fs');
const { execSync } = require('child_process');

function extractDevicesFromCommits(since = '30 days') {
  const command = `git log --since="${since}" --oneline --grep="Add \\|Support \\|Device \\|driver"`;
  const output = execSync(command, { encoding: 'utf-8' });
  const commits = output.split('\n').filter(line => line.trim() !== '');
  
  const devices = [];
  
  commits.forEach(commit => {
    const match = commit.match(/(?:Add|Support|Device|driver):?\s+([a-zA-Z0-9-_\s]+)/i);
    if (match) {
      const deviceName = match[1].trim();
      devices.push(deviceName);
    }
  });
  
  return devices;
}

const devices = extractDevicesFromCommits();
fs.writeFileSync('analysis/devices_from_commits.json', JSON.stringify(devices, null, 2));
console.log('✅ Devices extracted from commits and saved to analysis/devices_from_commits.json');
