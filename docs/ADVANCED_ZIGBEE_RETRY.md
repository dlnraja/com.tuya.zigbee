# 🔧 Advanced Zigbee Retry + Non-Destructive Smart-Adapt

## 📊 **Overview**

Ce système résout les problèmes identifiés dans les diagnostics utilisateurs:
- ❌ `Error: Zigbee est en cours de démarrage`
- ❌ Smart-Adapt trop agressif (suppression de capabilities)
- ❌ Logs non accessibles par MCP

---

## 🚀 **Components**

### **1. LogBuffer (`lib/utils/LogBuffer.js`)**

**Purpose:** Circular buffer accessible via Homey.ManagerSettings pour MCP

**Features:**
- ✅ 500 log entries max (circular)
- ✅ Auto-pruning après 24h
- ✅ Categories: ZIGBEE, CLUSTER, DEVICE, BATTERY, FLOW, APP
- ✅ Levels: INFO, WARN, ERROR, DEBUG
- ✅ MCP-ready JSON export

**Usage:**
```javascript
const { LogBuffer } = require('./lib/utils/LogBuffer');

// Dans app.js
this.logBuffer = new LogBuffer(this.homey);

// Log entries
await this.logBuffer.push('ERROR', 'ZIGBEE', 'Connection failed', 'DeviceName');

// Read logs (pour MCP)
const logs = await this.logBuffer.read();

// Export for MCP
const mcpData = await this.logBuffer.exportForMCP();
```

**MCP Access:**
```javascript
// Via Homey.ManagerSettings
const logs = await Homey.ManagerSettings.get('debug_log_buffer');
```

---

### **2. SuggestionEngine (`lib/smartadapt/SuggestionEngine.js`)**

**Purpose:** Non-destructive Smart-Adapt avec suggestions au lieu de modifications automatiques

**Problem Solved:**
```
BEFORE (DESTRUCTIVE):
[SMART ADAPT] Removed incorrect capability: measure_battery  ❌
[SMART ADAPT] Added missing capability: onoff

AFTER (SUGGESTION MODE):
[SMART ADAPT] SUGGESTION: Remove measure_battery (confidence: 70%)
[SMART ADAPT] ⚠️ Needs confirmation: YES
[SMART ADAPT] Safe to apply: NO
```

**Features:**
- ✅ Confidence scoring (0-100%)
- ✅ Safe/unsafe classification
- ✅ needs_confirmation flag
- ✅ PR description generation
- ✅ MCP-accessible suggestions

**Usage:**
```javascript
const SuggestionEngine = require('./lib/smartadapt/SuggestionEngine');

// Dans app.js
this.suggestionEngine = new SuggestionEngine(this.homey, this.logBuffer);

// Dans device onNodeInit
const analysis = {
  required: ['onoff'],
  optional: [],
  forbidden: ['measure_battery', 'dim'],
  confidence: 0.9
};

const suggestions = await this.homey.app.suggestionEngine.analyzeDevice(
  this, // device instance
  analysis
);

// Check if safe to apply
if (suggestions.safeToApply) {
  await this.homey.app.suggestionEngine.applySuggestions(deviceId, this, false);
} else {
  this.log('⚠️ Suggestions need manual review:', suggestions.recommendations);
}

// With user confirmation for destructive changes
if (userConfirmed) {
  await this.homey.app.suggestionEngine.applySuggestions(deviceId, this, true);
}
```

**Confidence Calculation:**
- Base confidence from cluster analysis
- ×0.7 if manufacturer/model unknown
- ×0.5 if destructive recommendations
- ×1.2 if all additive (max 1.0)

**Safety Rules:**
- Never auto-apply if confidence < 80%
- Never auto-apply if destructive recommendations
- Never auto-apply CRITICAL priority items
- Require explicit confirmation for capability removal

---

### **3. Enhanced ZigbeeRetry (`lib/utils/ZigbeeRetry.js`)**

**Purpose:** Retry logic pour toutes opérations Zigbee

**New Function:** `configureReportingWithRetry()`

**Usage:**
```javascript
const { configureReportingWithRetry } = require('./lib/utils/ZigbeeRetry');

// Instead of:
await cluster.configureReporting('onOff', { minInterval: 0, maxInterval: 300, minChange: 0 });

// Use:
const success = await configureReportingWithRetry(
  cluster, // cluster instance
  'onOff', // attribute
  { minInterval: 0, maxInterval: 300, minChange: 0 }, // options
  5, // maxRetries
  this.log.bind(this) // logger
);

if (!success) {
  this.log('⚠️ configureReporting failed after retries — using polling fallback');
  // Setup polling instead
}
```

**Backoff Strategy:**
- Attempt 1: Immediate
- Attempt 2: +1s (1s total)
- Attempt 3: +2s (3s total)
- Attempt 4: +4s (7s total)
- Attempt 5: +8s (15s total)
- Attempt 6: +16s (31s total)

**Detects Transient Errors:**
- ✅ "Zigbee est en cours de démarrage"
- ✅ "starting up"
- ✅ "not ready"
- ✅ "timeout"
- ✅ "busy"

---

## 🔌 **Integration in app.js**

```javascript
// app.js
const { LogBuffer } = require('./lib/utils/LogBuffer');
const SuggestionEngine = require('./lib/smartadapt/SuggestionEngine');

class UniversalTuyaZigbeeApp extends Homey.App {
  async onInit() {
    // Initialize LogBuffer
    this.logBuffer = new LogBuffer(this.homey);
    this.log('✅ LogBuffer initialized (MCP-ready)');
    
    // Initialize SuggestionEngine
    this.suggestionEngine = new SuggestionEngine(this.homey, this.logBuffer);
    this.log('✅ SuggestionEngine initialized (non-destructive mode)');
    
    // Override this.log to capture in LogBuffer
    const originalLog = this.log.bind(this);
    this.log = (...args) => {
      const message = args.join(' ');
      
      // Determine category and level
      let category = 'APP';
      let level = 'INFO';
      
      if (message.includes('ZIGBEE')) category = 'ZIGBEE';
      else if (message.includes('CLUSTER')) category = 'CLUSTER';
      else if (message.includes('DEVICE')) category = 'DEVICE';
      
      if (message.includes('⚠️') || message.includes('WARN')) level = 'WARN';
      else if (message.includes('❌') || message.includes('ERROR')) level = 'ERROR';
      
      // Add to buffer (non-blocking)
      this.logBuffer.push(level, category, message).catch(() => {});
      
      // Call original
      originalLog(...args);
    };
    
    // Similar override for this.error
    const originalError = this.error.bind(this);
    this.error = (...args) => {
      const message = args.join(' ');
      let category = 'APP';
      if (message.includes('ZIGBEE')) category = 'ZIGBEE';
      else if (message.includes('CLUSTER')) category = 'CLUSTER';
      
      this.logBuffer.push('ERROR', category, message).catch(() => {});
      originalError(...args);
    };
  }
  
  // Expose for MCP
  async getMCPLogs() {
    return await this.logBuffer.exportForMCP();
  }
  
  async getMCPSuggestions() {
    return this.suggestionEngine.exportForMCP();
  }
}
```

---

## 🔄 **Integration in BaseHybridDevice.js**

```javascript
// BaseHybridDevice.js
const { configureReportingWithRetry } = require('../utils/ZigbeeRetry');

class BaseHybridDevice extends ZigBeeDevice {
  async registerAllCapabilitiesWithReporting() {
    // ... existing code ...
    
    // Replace direct configureReporting with retry
    const cluster = this.zclNode.endpoints[endpointId].clusters[clusterName];
    
    // BEFORE:
    // await cluster.configureReporting('onOff', { minInterval: 0, maxInterval: 300, minChange: 0 });
    
    // AFTER:
    const success = await configureReportingWithRetry(
      cluster,
      'onOff',
      { minInterval: 0, maxInterval: 300, minChange: 0 },
      6, // maxRetries
      this.log.bind(this)
    );
    
    if (!success) {
      this.log('[FALLBACK] Using polling instead of reporting');
      // Setup polling fallback
    }
  }
  
  async performSmartAdaptation(analysis) {
    // Use SuggestionEngine instead of direct adaptation
    const suggestions = await this.homey.app.suggestionEngine.analyzeDevice(this, analysis);
    
    if (suggestions.safeToApply) {
      this.log('[SMART-ADAPT] ✅ Safe suggestions detected, applying...');
      await this.homey.app.suggestionEngine.applySuggestions(
        this.getData().id,
        this,
        false // no confirmation needed
      );
    } else {
      this.log('[SMART-ADAPT] ⚠️ Suggestions need review:');
      suggestions.recommendations.forEach(r => {
        this.log(`  - [${r.priority}] ${r.type}: ${r.capability} (${(r.confidence * 100).toFixed(0)}%)`);
      });
      
      // Log to buffer for MCP/AI analysis
      await this.homey.app.logBuffer.push(
        'WARN',
        'SMART_ADAPT',
        `Manual review needed for ${this.getName()}`,
        this.getName(),
        { suggestions }
      );
    }
  }
}
```

---

## 🎯 **MCP Access Examples**

### **Read Logs:**
```javascript
// Via MCP protocol
const logs = await homey.settings.get('debug_log_buffer');

// Structured export
const mcpLogs = await homeyApp.getMCPLogs();
console.log(mcpLogs.buffer.entries); // All log entries
console.log(mcpLogs.buffer.stats); // Stats by level/category
```

### **Read Suggestions:**
```javascript
const suggestions = await homeyApp.getMCPSuggestions();
console.log(suggestions.suggestions.entries); // All suggestions
console.log(suggestions.suggestions.needingConfirmation); // Count needing review
```

### **AI Analysis:**
```javascript
// Windsurf AI can query:
const diagnostics = {
  logs: await homey.settings.get('debug_log_buffer'),
  suggestions: await homeyApp.getMCPSuggestions(),
  ...
};

// AI analyzes and generates fix PR
if (diagnostics.suggestions.needingConfirmation > 0) {
  const pr = generatePRForSuggestions(diagnostics.suggestions);
  await github.createPullRequest(pr);
}
```

---

## 📝 **Example Fix for "presence_sensor_radar" Issue**

**Problem (from log fb5006cf):**
```
Device: presence_sensor_radar
Capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery']
Clusters detected: basic, onOff (INCOMPLETE!)
Smart-Adapt decided: It's a switch!
Result: Removed measure_battery, added onoff ❌ WRONG!
```

**With SuggestionEngine:**
```javascript
// Detection
const analysis = {
  required: ['onoff'],
  forbidden: ['measure_battery'],
  confidence: 0.9
};

// Generate suggestions
const suggestions = await suggestionEngine.analyzeDevice(device, analysis);

// Result:
{
  recommendations: [
    {
      type: 'REMOVE_CAPABILITY',
      capability: 'measure_battery',
      reason: 'Not supported by hardware clusters',
      confidence: 0.9,
      safe: false, // ⚠️ DESTRUCTIVE
      priority: 'CRITICAL',
      warning: '⚠️ DESTRUCTIVE: May break existing flows/automations'
    },
    {
      type: 'ADD_CAPABILITY',
      capability: 'onoff',
      reason: 'Required by hardware clusters',
      confidence: 0.9,
      safe: true,
      priority: 'HIGH'
    }
  ],
  confidence: 0.315, // 0.9 * 0.7 (unknown device) * 0.5 (destructive) = 31.5%
  needsConfirmation: true, // ✅ FLAGS FOR REVIEW
  safeToApply: false // ✅ WON'T AUTO-APPLY
}
```

**Logged for MCP:**
```
[WARN] [SMART_ADAPT_SUGGESTION] SMART-ADAPT SUGGESTIONS for presence_sensor_radar:
Confidence: 32%
Safe to apply: NO
Needs confirmation: YES

Recommendations:
  1. [CRITICAL] REMOVE_CAPABILITY: measure_battery (90% confidence)
  2. [HIGH] ADD_CAPABILITY: onoff (90% confidence)
```

**AI/Human Review:**
- Check real device hardware
- Verify if it's actually a switch or motion sensor
- Test before applying
- Generate PR for proper fix

---

## 🚀 **Benefits**

### **Before (v4.9.300 and earlier):**
- ❌ Smart-Adapt auto-removes capabilities
- ❌ No way to review changes before apply
- ❌ Logs not accessible by MCP
- ❌ `Zigbee est en cours de démarrage` causes failures

### **After (v4.9.302+):**
- ✅ Smart-Adapt suggests instead of auto-applying
- ✅ Confidence scoring prevents bad decisions
- ✅ needs_confirmation flag protects users
- ✅ Logs accessible via ManagerSettings for MCP
- ✅ Zigbee retry handles startup timing
- ✅ AI can analyze and propose fixes

---

## 📚 **References**

- **LogBuffer source:** `lib/utils/LogBuffer.js`
- **SuggestionEngine source:** `lib/smartadapt/SuggestionEngine.js`
- **ZigbeeRetry source:** `lib/utils/ZigbeeRetry.js`
- **MCP Integration:** `docs/MCP_AI_INTEGRATION.md`

---

## ✅ **Testing**

```bash
# Test LogBuffer
node -e "
const { LogBuffer } = require('./lib/utils/LogBuffer');
const buffer = new LogBuffer({ settings: { get: async () => [], set: async () => {} } });
buffer.push('ERROR', 'TEST', 'Test message');
console.log(buffer.getStats());
"

# Test suggestions generation
# (Requires full app context)
```

---

**Status:** ✅ Ready for v4.9.302
