const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const templatePath = path.join(__dirname, '..', 'templates', 'driver.compose.json');

// Read the template
const templateContent = fs.readFileSync(templatePath, 'utf8');

// Traverse the drivers directory
fs.readdirSync(driversDir, { withFileTypes: true }).forEach(categoryDir => {
  if (categoryDir.isDirectory()) {
    const categoryPath = path.join(driversDir, categoryDir.name);
    fs.readdirSync(categoryPath, { withFileTypes: true }).forEach(driverDir => {
      if (driverDir.isDirectory()) {
        const driverPath = path.join(categoryPath, driverDir.name);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        // Check if driver.compose.json exists
        if (!fs.existsSync(composePath)) {
          // Create the file with template content
          fs.writeFileSync(composePath, templateContent);
          console.log(`Created driver.compose.json in ${driverPath}`);
        }
      }
    });
  }
});
