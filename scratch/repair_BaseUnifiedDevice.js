const fs = require('fs');
const path = 'lib/devices/BaseUnifiedDevice.js';
let content = fs.readFileSync(path, 'utf8');

const targetStart = "async logDeviceIdentity() {";
const targetEnd = "async registerCapabilityWithRetry(capability, clusterId, options) {";

const startIdx = content.indexOf(targetStart);
const endIdx = content.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    console.log('Found logDeviceIdentity to replace');
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    const replacement = `async logDeviceIdentity() {
    try {
      this.log(' DEVICE IDENTITY:');
      this.log(\`   - Driver ID: \${this.driver?.id || 'unknown'}\`);
      this.log(\`   - Driver Class: \${this.constructor?.name || 'unknown'}\`);
      this.log(\`   - Device Name: \${this.getName() || 'unknown'}\`);
      this.log(\`   - Device ID: \${this.getData()?.id || 'unknown'}\`);

      // CRITICAL: Force read device info with retries
      this.log(' [FIX] Reading device manufacturer & model (with retries)...');
      if (this.zclNode?.endpoints?.[1]?.clusters?.basic) {
        // Try 3 times with increasing delays
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            this.log(\`  Attempt \${attempt}/3...\`);
            const deviceInfo = await this.zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'modelId', 'zclVersion']);
            if (deviceInfo && (deviceInfo.manufacturerName || deviceInfo.modelId)) {
              this.log('  Device info read successfully!');
              // Store for later use
              if (deviceInfo.manufacturerName) {
                this.zclNode.manufacturerName = deviceInfo.manufacturerName;
                this.log(\`   Manufacturer: \${deviceInfo.manufacturerName}\`);
              }
              if (deviceInfo.modelId) {
                this.zclNode.modelId = deviceInfo.modelId;
                this.log(\`   Model: \${deviceInfo.modelId}\`);
              }
              break; // Success!
            } else {
              this.log('    Empty response, retrying...');
            }
          } catch (err) {
            this.log(\`    Attempt \${attempt} failed: \${err.message}\`);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, attempt * 1000)); // 1s, 2s delays
            }
          }
        }
      }

      this.log(\`   - IEEE Address: \${this.zclNode?.ieeeAddr || this.getData()?.ieeeAddress || 'unknown'}\`);
      this.log(\`   - Network Address: \${this.zclNode?.networkAddress || this.getData()?.networkAddress || 'unknown'}\`);
      this.log(\`   - Manufacturer: \${this.zclNode?.manufacturerName || this.getData()?.manufacturerName || 'unknown'}\`);
      this.log(\`   - Model ID: \${this.zclNode?.modelId || this.getData()?.modelId || 'unknown'}\`);
      this.log(\`   - Endpoints: \${Object.keys(this.zclNode?.endpoints || {}).filter(ep => ep !== 'getDeviceEndpoint').length}\`);

      // Log endpoints
      const endpoints = Object.keys(this.zclNode?.endpoints || {}).filter(ep => ep !== 'getDeviceEndpoint');
      this.log(\`   - Endpoints: \${endpoints.join(', ')}\`);

      // Log clusters per endpoint
      this.log('');
      this.log(' AVAILABLE CLUSTERS PER ENDPOINT:');
      for (const epId of endpoints) {
        const endpoint = this.zclNode.endpoints[epId];
        if (endpoint?.clusters) {
          const clusterNames = Object.keys(endpoint.clusters)
            .filter(c => c !== 'getClusterById' && c !== 'bind' && c !== 'unbind')
            .map(c => {
              const cluster = endpoint.clusters[c];
              return \`\${c} (0x\${(cluster?.constructor?.ID || 0).toString(16)})\`;
            });
          this.log(\`     Endpoint \${epId}: \${clusterNames.join(', ')}\`);
        }
      }

      this.log('');
      this.log(' DEVICE SETTINGS:');
      const settings = this.getSettings();
      for (const [key, value] of Object.entries(settings)) {
        this.log(\`   - \${key}: \${value}\`);
      }

      this.log('');
      this.log(' DEVICE CAPABILITIES:');
      const capabilities = this.getCapabilities();
      this.log(\`   - Total: \${capabilities.length}\`);
      this.log(\`   - List: \${capabilities.join(', ')}\`);

    } catch (err) {
      this.error(' Device identity logging failed:', err.message);
    }
  }

  `;
    
    content = before + replacement + after;
    fs.writeFileSync(path, content);
    console.log('File written. New length:', content.length);
} else {
    console.log('Could not find start/end markers');
}
