const fs = require('fs').promises;
const path = require('path');

async function updateAppJson() {
  const appJsonPath = path.join(__dirname, '../app.json');
  
  try {
    // Read and parse app.json
    const data = await fs.readFile(appJsonPath, 'utf8');
    const appJson = JSON.parse(data);
    
    // Update SDK version
    if (!appJson.sdk || appJson.sdk < 3) {
      appJson.sdk = 3;
      console.log('Updated SDK version to 3');
    }
    
    // Add required permissions if missing
    const requiredPermissions = ['homey:manager:drivers'];
    if (!appJson.permissions) {
      appJson.permissions = [];
    }
    
    requiredPermissions.forEach(perm => {
      if (!appJson.permissions.includes(perm)) {
        appJson.permissions.push(perm);
        console.log(`Added permission: ${perm}`);
      }
    });
    
    // Save updated app.json
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('app.json updated for SDK 3 compatibility');
    
  } catch (error) {
    console.error('Error updating app.json:', error);
  }
}

// Run the update
updateAppJson();
