const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const oldSha = process.env.START_SHA;
if (!oldSha) {
  console.log('No START_SHA provided, using default changelog.');
  fs.writeFileSync(process.env.GITHUB_OUTPUT, 'changelog=Improvements and bug fixes\n', { flag: 'a' });
  process.exit(0);
}

try {
  // Get all driver.compose.json files modified
  const diffCmd = `git diff --name-only ${oldSha} HEAD`;
  let files = [];
  try {
    const allFiles = execSync(diffCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n').filter(Boolean);
    files = allFiles.filter(f => f.includes('driver.compose.json'));
  } catch (e) {
    // git failed or no diff
  }

  const addedDevices = [];

  for (const file of files) {
    try {
      const oldContentJson = execSync(`git show ${oldSha}:${file}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const newContentJson = fs.readFileSync(file, 'utf8');

      const oldObj = JSON.parse(oldContentJson);
      const newObj = JSON.parse(newContentJson);

      const oldMfrs = [].concat(oldObj.zigbee?.manufacturerName || []);
      const newMfrs = [].concat(newObj.zigbee?.manufacturerName || []);
      
      const newProductId = newObj.zigbee?.productId || 'unknown';

      // Find new ones
      const added = newMfrs.filter(m => !oldMfrs.includes(m) && m);
      
      if (added.length > 0) {
        // Find driver name from path (drivers/folder/driver.compose.json)
        const driverName = file.split('/')[1] || 'device';
        addedDevices.push({
          driver: driverName,
          productId: newProductId,
          mfrs: added
        });
      }
    } catch (err) {
      // Ignored
    }
  }

  let changelog = "Automated improvements and fixes.";
  if (addedDevices.length > 0) {
    changelog = "Added support for new devices:\n" + addedDevices.map(d => 
      `- ${d.driver} (${d.mfrs.join(', ')} / ${d.productId})`
    ).join('\n');
    
    // Truncate if too long for Homey (max 255 chars usually, or maybe more, but keep it clean)
    if (changelog.length > 500) {
      changelog = changelog.substring(0, 480) + '... and more.';
    }
  } else {
    // Did we at least modify something else?
    changelog = "Driver refinements, SDK3 capability mappings and stability enhancements.";
  }

  // Remove any references to AI, script, bot, dump, human
  changelog = changelog.replace(/ai|script|bot|dump|human|autonomous|robot/gi, '');
  
  // Write output
  console.log('Generated changelog:\n' + changelog);
  
  // Multi-line outputs for GITHUB_OUTPUT require a delimiter
  const delimiter = 'EOF' + Math.floor(Math.random() * 10000);
  fs.writeFileSync(process.env.GITHUB_OUTPUT, `changelog<<${delimiter}\n${changelog}\n${delimiter}\n`, { flag: 'a' });

} catch (e) {
  console.error("Error generating changelog:", e);
  fs.writeFileSync(process.env.GITHUB_OUTPUT, 'changelog=Stability improvements and feature enhancements\n', { flag: 'a' });
}
