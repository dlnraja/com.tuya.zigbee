// PRE-PUBLISH SECURITY RULES - HOMEY COMPLIANCE
const fs = require('fs').promises;

class PrePublishSecurity {
  async enforceSecurityRules() {
    console.log('🔒 ENFORCING PRE-PUBLISH SECURITY RULES...');
    
    // Rule 1: ALWAYS clean .homeycompose before publish
    await this.cleanHomeyCompose();
    
    // Rule 2: Scan for potential credentials
    await this.scanCredentials();
    
    // Rule 3: Validate all drivers exist
    await this.validateDrivers();
    
    console.log('✅ SECURITY RULES ENFORCED');
  }

  async cleanHomeyCompose() {
    try {
      await fs.rmdir('.homeycompose', { recursive: true });
      console.log('✅ .homeycompose cleaned (security compliance)');
    } catch (e) {
      console.log('ℹ️ .homeycompose already clean');
    }
  }

  async scanCredentials() {
    const patterns = [
      /password: "REDACTED",}/gi,
      /token: "REDACTED",}/gi,
      /key\s*[:=]\s*['"][^'"]{16,}/gi,
      /(sk-|pk_|ghp_)[a-zA-Z0-9_]{20,}/g
    ];
    
    // Scan critical files only
    const criticalFiles = ['app.json', 'app.js'];
    for (const file of criticalFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            throw new Error(`SECURITY VIOLATION: Potential credential in ${file}`);
          }
        }
      } catch (e) {
        if (e.message.includes('SECURITY')) throw e;
      }
    }
    console.log('✅ No credentials found');
  }

  async validateDrivers() {
    const appJson = JSON.parse(await fs.readFile('app.json', 'utf8'));
    const missingDrivers = [];
    
    for (const driver of appJson.drivers || []) {
      const composePath = `drivers/${driver.id}/driver.compose.json`;
      try {
        await fs.access(composePath);
      } catch (e) {
        missingDrivers.push(driver.id);
      }
    }
    
    if (missingDrivers.length > 0) {
      throw new Error(`Missing drivers: ${missingDrivers.join(', ')}`);
    }
    console.log('✅ All drivers validated');
  }
}

module.exports = PrePublishSecurity;
