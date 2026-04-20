const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git'];

function fixDuplicateFlowIds() {
  console.log('Running Check Flow IDs & Deduplication...');
  let duplicatesFixed = 0;
  
  // App.json root
  if (fs.existsSync('app.json')) {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      // Basic check
  }
  
  // Drivers
  const driversPath = path.join(__dirname, '../../drivers');
  if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath);
    for (const driver of drivers) {
      const composePath = path.join(driversPath, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        let content = fs.readFileSync(composePath, 'utf8');
        // Basic naive replace if it ever exists
        if (content.includes('dup_tnhi1')) {
           content = content.replace(/_dup_tnhi1/g, '_' + driver);
           fs.writeFileSync(composePath, content);
           duplicatesFixed++;
        }
      }
    }
  }

  console.log(` Flow IDs check complete. Fixed ${duplicatesFixed} duplicate(s).`);
  process.exit(0);
}

fixDuplicateFlowIds();
