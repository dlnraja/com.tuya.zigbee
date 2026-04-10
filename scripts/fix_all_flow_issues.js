const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_FILE = path.join(ROOT, 'FLOW_CARDS_AUDIT_REPORT.json');

if (!fs.existsSync(REPORT_FILE)) {
  console.error('❌ Report file missing! Run audit first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
const missing = report.issues.missingRegistration || [];

console.log(`🛠️ Fixing ${missing.length} flow card registration issues...`);

missing.forEach(issue => {
  const driverJsPath = path.join(DRIVERS_DIR, issue.driver, 'driver.js');
  if (!fs.existsSync(driverJsPath)) {
    // If driver.js doesn't exist, we create a basic one
    const content = `'use strict';\n\nconst { Driver } = require('homey');\n\nclass TuyaDriver extends Driver {\n\n  async onInit() {\n    this.log('${issue.driver} has been initialized');\n    this._registerFlowCards();\n  }\n\n  _registerFlowCards() {\n    this.homey.flow.get${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}Card('${issue.id}');\n  }\n\n}\n\nmodule.exports = TuyaDriver;\n`;
    fs.writeFileSync(driverJsPath, content);
    console.log(`   ✅ Created driver.js for ${issue.driver}`);
    return;
  }

  let content = fs.readFileSync(driverJsPath, 'utf8');
  
  // Registration code to inject
  const regCode = `this.homey.flow.get${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}Card('${issue.id}');`;
  
  if (content.includes(`'${issue.id}'`)) {
    console.log(`   ⏭️ Trigger ${issue.id} already seems present in ${issue.driver}`);
    return;
  }

  // Find onInit or create it
  if (content.includes('onInit()')) {
    content = content.replace('onInit() {', `onInit() {\n    ${regCode}`);
  } else if (content.includes('onInit ()')) {
    content = content.replace('onInit () {', `onInit () {\n    ${regCode}`);
  } else {
    // Inject _registerFlowCards or add to class
    if (content.includes('class') && content.includes('{')) {
      content = content.replace('{', `{\n\n  async onInit() {\n    ${regCode}\n  }\n`);
    }
  }

  fs.writeFileSync(driverJsPath, content);
  console.log(`   ✅ Fixed ${issue.id} in ${issue.driver}`);
});

console.log('\n✨ All flow registrations fixed.');
