# MEGA-PROMPT V4: Enriched Endpoint/Cluster Detection

**Date:** Nov 8, 2025 12:55am  
**Context:** User feedback that endpoint/cluster detection is incomplete  
**Status:** ARCHIVED for future implementation (after v4.9.308 validation)

---

## PROBLEM IDENTIFIED:

Current code in `lib/SmartDriverAdaptation.js` (lines 179-206) only reads:
- Endpoint deviceId and profileId ✓
- Cluster names (Object.keys) ❌
- Attribute names (Object.keys) ❌

**What's missing:**
- ❌ Attribute values
- ❌ Server vs Client clusters distinction
- ❌ Available commands
- ❌ Reportable attributes
- ❌ Node descriptor
- ❌ Bindings
- ❌ Fallback handling

---

## RESEARCH FINDINGS:

### **SDK3 Documentation:**

From https://apps.developer.homey.app/wireless/zigbee:

**Endpoints and Clusters:**
- Endpoints contain collections of clusters
- Clusters can be server OR client
- Server: stores attributes
- Client: manipulates attributes

**Commands and Attributes:**
- Attributes: properties (read, write, report)
- Commands: actions (client→server, server→client)
- Not all attributes are reportable

**Best Practices:**
```javascript
// DO: Always catch promises
const value = await zclNode.endpoints[1].clusters.onOff
  .readAttributes(['onOff'])
  .catch(err => this.error(err));

// DON'T: No error handling
const value = await zclNode.endpoints[1].clusters.onOff
  .readAttributes(['onOff']);
```

**First Init:**
```javascript
if (this.isFirstInit() === true) {
  // Only read on first initialization
  // Avoid repeated reads on app restart
}
```

---

## IMPROVED DETECTION CODE:

### **1. Enhanced `collectDeviceInfo()` Method**

Replace lines 179-206 in `lib/SmartDriverAdaptation.js`:

```javascript
/**
 * Collect comprehensive device information
 * - Endpoints (with server/client distinction)
 * - Clusters (with commands and attributes)
 * - Attribute values (with fallback)
 * - Node descriptor
 */
async collectDeviceInfo() {
  this.log('📊 [SMART ADAPT] Collecting comprehensive device information...');
  
  const info = {
    manufacturer: null,
    modelId: null,
    endpoints: {},
    clusters: {},
    nodeDescriptor: null,
    bindings: [],
    powerSource: 'unknown'
  };
  
  // Get manufacturer/model from multiple sources
  const deviceData = this.device.getData() || {};
  
  if (this.device.zclNode) {
    info.manufacturer = deviceData.manufacturerName || 
                        this.device.zclNode.manufacturerName || 
                        this.device.getStoreValue('manufacturerName') ||
                        null;
    info.modelId = deviceData.productId || 
                   deviceData.modelId || 
                   this.device.zclNode.modelId || 
                   this.device.getStoreValue('modelId') ||
                   null;
    
    // Read node descriptor (contains device type, power source, etc.)
    try {
      if (this.device.zclNode.nodeDescriptor) {
        info.nodeDescriptor = {
          type: this.device.zclNode.nodeDescriptor.type,
          manufacturerCode: this.device.zclNode.nodeDescriptor.manufacturerCode,
          powerSource: this.device.zclNode.nodeDescriptor.powerSource,
          receiverOnWhenIdle: this.device.zclNode.nodeDescriptor.receiverOnWhenIdle
        };
        
        // Determine power source from node descriptor
        if (info.nodeDescriptor.powerSource === 'mains') {
          info.powerSource = 'ac';
        } else if (info.nodeDescriptor.powerSource === 'battery') {
          info.powerSource = 'battery';
        }
        
        this.log(`   ✓ Node descriptor: type=${info.nodeDescriptor.type}, powerSource=${info.nodeDescriptor.powerSource}`);
      }
    } catch (err) {
      this.error('   ⚠️  Failed to read node descriptor:', err.message);
    }
    
    // Enumerate endpoints with comprehensive cluster information
    const endpointIds = Object.keys(this.device.zclNode.endpoints || {});
    this.log(`   📍 Found ${endpointIds.length} endpoint(s): ${endpointIds.join(', ')}`);
    
    for (const epId of endpointIds) {
      const endpoint = this.device.zclNode.endpoints[epId];
      if (!endpoint) continue;
      
      this.log(`   📍 Analyzing endpoint ${epId}...`);
      
      info.endpoints[epId] = {
        deviceId: endpoint.deviceId,
        profileId: endpoint.profileId,
        inputClusters: [],   // Server clusters
        outputClusters: [],  // Client clusters
        clusterDetails: {}
      };
      
      // Get cluster names
      const clusterNames = Object.keys(endpoint.clusters || {});
      this.log(`      🔧 ${clusterNames.length} cluster(s): ${clusterNames.join(', ')}`);
      
      for (const clusterName of clusterNames) {
        const cluster = endpoint.clusters[clusterName];
        if (!cluster) continue;
        
        const clusterInfo = {
          name: clusterName,
          id: cluster.id,
          isServer: false,
          isClient: false,
          attributes: {},
          commands: {},
          bound: false
        };
        
        // Determine if server or client
        // Server clusters are in inputClusters (device implements them)
        // Client clusters are in outputClusters (device sends commands to them)
        try {
          // Check if cluster has attributes (server) or is bound (client)
          if (cluster.attributes && Object.keys(cluster.attributes).length > 0) {
            clusterInfo.isServer = true;
            info.endpoints[epId].inputClusters.push(clusterName);
          }
          
          // Check if cluster has commands (could be server or client)
          if (cluster.commands && Object.keys(cluster.commands).length > 0) {
            clusterInfo.isClient = true;
            info.endpoints[epId].outputClusters.push(clusterName);
          }
        } catch (err) {
          this.error(`      ⚠️  Error determining cluster ${clusterName} type:`, err.message);
        }
        
        // Read attribute details (names, values, reportable status)
        const attributeNames = Object.keys(cluster.attributes || {});
        this.log(`         📋 ${attributeNames.length} attribute(s): ${attributeNames.slice(0, 5).join(', ')}${attributeNames.length > 5 ? '...' : ''}`);
        
        for (const attrName of attributeNames) {
          const attr = cluster.attributes[attrName];
          
          clusterInfo.attributes[attrName] = {
            id: attr?.id,
            reportable: attr?.reportable || false,
            readable: attr?.readable !== false, // Default true
            writable: attr?.writable || false,
            value: null // Will try to read
          };
          
          // Try to read attribute value (only for important/small attributes)
          // Avoid reading large arrays or complex structures
          const safeToRead = [
            'onOff', 'currentLevel', 'currentTemperature', 'currentHumidity',
            'batteryPercentageRemaining', 'batteryVoltage', 'occupancy',
            'manufacturerName', 'modelIdentifier', 'powerSource', 'zoneStatus'
          ];
          
          if (safeToRead.includes(attrName) && clusterInfo.attributes[attrName].readable) {
            try {
              const result = await cluster.readAttributes([attrName])
                .catch(err => {
                  // Silent fail - not critical
                  return null;
                });
              
              if (result && result[attrName] !== undefined) {
                clusterInfo.attributes[attrName].value = result[attrName];
                this.log(`            ✓ ${attrName} = ${result[attrName]}`);
              }
            } catch (err) {
              // Silent fail
            }
          }
        }
        
        // List available commands
        const commandNames = Object.keys(cluster.commands || {});
        if (commandNames.length > 0) {
          this.log(`         🎮 ${commandNames.length} command(s): ${commandNames.join(', ')}`);
          commandNames.forEach(cmdName => {
            clusterInfo.commands[cmdName] = {
              available: true
            };
          });
        }
        
        // Store cluster details
        info.endpoints[epId].clusterDetails[clusterName] = clusterInfo;
        
        // Also store in global clusters map (for backward compatibility)
        if (!info.clusters[clusterName]) {
          info.clusters[clusterName] = [];
        }
        info.clusters[clusterName].push({
          endpoint: epId,
          id: cluster.id,
          isServer: clusterInfo.isServer,
          isClient: clusterInfo.isClient,
          attributes: Object.keys(clusterInfo.attributes),
          commands: Object.keys(clusterInfo.commands)
        });
      }
    }
    
    // Try to read bindings (if supported)
    try {
      // Note: Not all devices support reading bindings
      // This is device-specific and may fail
      if (this.device.zclNode.getBindings) {
        const bindings = await this.device.zclNode.getBindings().catch(() => []);
        info.bindings = bindings || [];
        if (info.bindings.length > 0) {
          this.log(`   🔗 Found ${info.bindings.length} binding(s)`);
        }
      }
    } catch (err) {
      // Silent fail - not all devices support this
    }
  }
  
  this.log('   ✅ Comprehensive device info collected');
  this.log(`      Manufacturer: ${info.manufacturer || 'Unknown'}`);
  this.log(`      Model: ${info.modelId || 'Unknown'}`);
  this.log(`      Power Source: ${info.powerSource}`);
  this.log(`      Endpoints: ${Object.keys(info.endpoints).length}`);
  this.log(`      Total Clusters: ${Object.keys(info.clusters).length}`);
  
  return info;
}
```

---

## KEY IMPROVEMENTS:

### **1. Node Descriptor Reading**
```javascript
info.nodeDescriptor = {
  type: this.device.zclNode.nodeDescriptor.type,
  powerSource: this.device.zclNode.nodeDescriptor.powerSource,
  receiverOnWhenIdle: this.device.zclNode.nodeDescriptor.receiverOnWhenIdle
};

// Determine power source accurately
if (info.nodeDescriptor.powerSource === 'mains') {
  info.powerSource = 'ac';
} else if (info.nodeDescriptor.powerSource === 'battery') {
  info.powerSource = 'battery';
}
```

**Why:** Power source from node descriptor is MORE reliable than guessing from clusters!

### **2. Server vs Client Distinction**
```javascript
// Server clusters (device implements them)
if (cluster.attributes && Object.keys(cluster.attributes).length > 0) {
  clusterInfo.isServer = true;
  info.endpoints[epId].inputClusters.push(clusterName);
}

// Client clusters (device sends commands)
if (cluster.commands && Object.keys(cluster.commands).length > 0) {
  clusterInfo.isClient = true;
  info.endpoints[epId].outputClusters.push(clusterName);
}
```

**Why:** Important for button/remote detection (they send commands, not receive)!

### **3. Attribute Value Reading (Selective)**
```javascript
const safeToRead = [
  'onOff', 'currentLevel', 'currentTemperature', 'currentHumidity',
  'batteryPercentageRemaining', 'batteryVoltage', 'occupancy',
  'manufacturerName', 'modelIdentifier', 'powerSource', 'zoneStatus'
];

if (safeToRead.includes(attrName)) {
  const result = await cluster.readAttributes([attrName])
    .catch(err => null); // Silent fail
  
  if (result && result[attrName] !== undefined) {
    clusterInfo.attributes[attrName].value = result[attrName];
  }
}
```

**Why:** 
- Only read important attributes
- Avoid large arrays/structures
- Silent fail (not critical for detection)
- Provides actual current values for better decision

### **4. Attribute Metadata**
```javascript
clusterInfo.attributes[attrName] = {
  id: attr?.id,
  reportable: attr?.reportable || false,  // Can subscribe?
  readable: attr?.readable !== false,     // Can read?
  writable: attr?.writable || false,      // Can write?
  value: null                             // Current value
};
```

**Why:** Know which attributes can be used for capabilities!

### **5. Command Listing**
```javascript
const commandNames = Object.keys(cluster.commands || {});
commandNames.forEach(cmdName => {
  clusterInfo.commands[cmdName] = {
    available: true
  };
});
```

**Why:** Helps detect buttons/remotes (they have commands but no onoff capability)!

### **6. Binding Detection**
```javascript
if (this.device.zclNode.getBindings) {
  const bindings = await this.device.zclNode.getBindings().catch(() => []);
  info.bindings = bindings || [];
}
```

**Why:** Understand device relationships and group communication!

---

## USAGE IN SMART-ADAPT:

### **Before (Current):**
```javascript
const deviceInfo = await this.collectDeviceInfo();
// deviceInfo.clusters = { onOff: [...], basic: [...] }
// No power source info
// No attribute values
```

### **After (Improved):**
```javascript
const deviceInfo = await this.collectDeviceInfo();

// Now you have:
deviceInfo.powerSource                    // 'ac' or 'battery' (reliable!)
deviceInfo.nodeDescriptor.type            // 'router', 'endDevice', etc.
deviceInfo.endpoints[1].inputClusters     // ['onOff', 'levelControl']
deviceInfo.endpoints[1].outputClusters    // ['scenes']
deviceInfo.endpoints[1].clusterDetails.onOff.attributes.onOff.value  // true/false
deviceInfo.endpoints[1].clusterDetails.onOff.commands                 // ['toggle', 'on', 'off']
deviceInfo.endpoints[1].clusterDetails.onOff.isServer                 // true
deviceInfo.endpoints[1].clusterDetails.onOff.isClient                 // false
deviceInfo.bindings                       // Array of bindings

// Use for better detection:
if (deviceInfo.powerSource === 'ac') {
  // NEVER add measure_battery!
}

if (deviceInfo.endpoints[1].clusterDetails.onOff?.isClient && 
    !deviceInfo.endpoints[1].clusterDetails.onOff?.isServer) {
  // This is a BUTTON/REMOTE (sends commands, doesn't receive)
  // NOT a switch!
}

if (deviceInfo.endpoints[1].clusterDetails.genPowerCfg?.attributes?.batteryPercentageRemaining?.value) {
  // Battery value available, can add measure_battery capability
}
```

---

## BENEFITS:

### **1. Accurate Power Source Detection**
```
✅ Read from node descriptor (not guessed)
✅ Prevents adding measure_battery to AC devices
✅ Prevents detecting batteries as AC
```

### **2. Button/Remote vs Switch**
```
✅ Client-only onOff cluster = button/remote
✅ Server onOff cluster = switch/outlet
✅ No more false positives
```

### **3. TS0601 Tuya DP Detection**
```
✅ Node descriptor shows "Unknown" type
✅ Endpoints show limited clusters
✅ Combined with model ID = Tuya DP device
✅ Better detection logic
```

### **4. Multi-Gang Detection**
```
✅ Count endpoints with inputClusters.includes('onOff')
✅ More accurate than just endpoint count
✅ Distinguishes control endpoints from data endpoints
```

### **5. Presence Sensor Mapping**
```
✅ Check for occupancy cluster + attributes
✅ Check attribute values (occupancy: true/false)
✅ Better fallback logic
```

### **6. Attribute Availability**
```
✅ Know which attributes are reportable
✅ Set up correct listeners
✅ Avoid trying to report non-reportable attributes
```

---

## IMPLEMENTATION PLAN:

### **Priority 1: Core Improvements (After v4.9.308 validation)**
```
⏳ Replace collectDeviceInfo() method
⏳ Add node descriptor reading
⏳ Add server/client distinction
⏳ Add selective attribute reading
⏳ Add error handling (catch all promises)
```

### **Priority 2: Use Improved Data**
```
⏳ Update analyzeClusters() to use new data
⏳ Update device type detection
⏳ Update power source logic
⏳ Update button/remote detection
```

### **Priority 3: Advanced Features**
```
⏳ Binding detection and usage
⏳ Attribute metadata in decisions
⏳ Command availability checks
⏳ Reportable attribute subscription
```

---

## TESTING APPROACH:

### **1. Test with Known Devices**
```javascript
// Test fixtures with expected output
const fixtures = [
  {
    model: 'TS0601',
    expected: {
      powerSource: 'battery',
      nodeDescriptor: { type: 'endDevice' },
      endpoints: {
        '1': {
          inputClusters: ['basic', 'ssIasZone'],
          outputClusters: []
        }
      }
    }
  },
  {
    model: 'TS0002',
    expected: {
      powerSource: 'ac',
      nodeDescriptor: { type: 'router' },
      endpoints: {
        '1': {
          inputClusters: ['basic', 'onOff'],
          outputClusters: []
        },
        '2': {
          inputClusters: ['onOff'],
          outputClusters: []
        }
      }
    }
  }
];
```

### **2. Log Output Comparison**
```bash
# Before
📊 Collecting device information...
   ✅ Device info collected
      Manufacturer: _TZ3000_h1ipgkwn
      Model: TS0002
      Endpoints: 1
      Clusters: basic, onOff

# After
📊 Collecting comprehensive device information...
   ✓ Node descriptor: type=router, powerSource=mains
   📍 Found 2 endpoint(s): 1, 2
   📍 Analyzing endpoint 1...
      🔧 2 cluster(s): basic, onOff
         📋 5 attribute(s): manufacturerName, modelIdentifier, ...
            ✓ manufacturerName = _TZ3000_h1ipgkwn
            ✓ modelIdentifier = TS0002
         🎮 3 command(s): on, off, toggle
   📍 Analyzing endpoint 2...
      🔧 1 cluster(s): onOff
   ✅ Comprehensive device info collected
      Manufacturer: _TZ3000_h1ipgkwn
      Model: TS0002
      Power Source: ac
      Endpoints: 2
      Total Clusters: 2
```

### **3. Validation Checks**
```javascript
// Validate enriched data
assert(deviceInfo.powerSource !== 'unknown', 'Power source should be determined');
assert(deviceInfo.nodeDescriptor !== null, 'Node descriptor should be read');
assert(Object.keys(deviceInfo.endpoints).length > 0, 'Should have endpoints');

for (const epId in deviceInfo.endpoints) {
  const ep = deviceInfo.endpoints[epId];
  assert(ep.inputClusters.length > 0 || ep.outputClusters.length > 0, 
         `Endpoint ${epId} should have clusters`);
}
```

---

## COMPATIBILITY:

### **Backward Compatible:**
```javascript
// Old code still works
info.clusters[clusterName] = [...]  // Still populated

// New code has more data
info.endpoints[epId].clusterDetails[clusterName] = {
  isServer: true,
  attributes: { ... },
  commands: { ... }
}
```

### **Gradual Adoption:**
```javascript
// Phase 1: Add new collection method (no breaking changes)
// Phase 2: Update analysis to use new data
// Phase 3: Deprecate old format (keep for 1-2 versions)
// Phase 4: Remove old format
```

---

## ERROR HANDLING:

### **All Reads Protected:**
```javascript
// Node descriptor
try {
  if (this.device.zclNode.nodeDescriptor) {
    info.nodeDescriptor = { ... };
  }
} catch (err) {
  this.error('Failed to read node descriptor:', err.message);
}

// Attribute reading
const result = await cluster.readAttributes([attrName])
  .catch(err => {
    // Silent fail - not critical
    return null;
  });

// Bindings
const bindings = await this.device.zclNode.getBindings()
  .catch(() => []);
```

**Why:** 
- Devices may not support all features
- Network issues may occur
- Don't fail entire detection due to one error

---

## PERFORMANCE CONSIDERATIONS:

### **Selective Attribute Reading:**
- ✅ Only read small, important attributes
- ✅ Skip arrays and complex structures
- ✅ Silent fail (non-blocking)
- ✅ Cache results (don't read repeatedly)

### **Async/Await with Catch:**
- ✅ Don't block on errors
- ✅ Continue processing other endpoints
- ✅ Log failures for debugging

### **First Init Optimization:**
```javascript
// Only do comprehensive read on first init
if (this.isFirstInit()) {
  deviceInfo = await this.collectDeviceInfo();
  this.setStoreValue('deviceInfo', deviceInfo);
} else {
  // Use cached info
  deviceInfo = this.getStoreValue('deviceInfo');
}
```

---

## DECISION CRITERIA:

### **When to Implement:**
- ✅ v4.9.308 validated (24-48h)
- ✅ No critical issues reported
- ✅ User feedback positive
- ✅ Clear benefit demonstrated

### **Why Not Now:**
- ❌ v4.9.308 just published (30 min ago)
- ❌ Need validation first
- ❌ Too many changes at once
- ❌ Cannot isolate bugs

### **Success Metrics:**
- ✅ Power source detection 100% accurate
- ✅ Button/remote false positives eliminated
- ✅ TS0601 detection improved
- ✅ Multi-gang detection more reliable
- ✅ No performance degradation

---

## REFERENCES:

- SDK3 Zigbee: https://apps.developer.homey.app/wireless/zigbee
- homey-zigbeedriver: https://athombv.github.io/node-homey-zigbeedriver/
- zigbee-clusters: https://athombv.github.io/node-zigbee-clusters/
- User feedback: "recuperation et detection des endpoints et clusters incompletes"
- Current code: `lib/SmartDriverAdaptation.js` lines 179-206

---

## TIMELINE:

- **Nov 8, 12:55am:** Mega-Prompt V4 created
- **Nov 9-10:** Wait for v4.9.308 validation
- **Nov 10:** Decision point
  - ✅ If validated: Implement Priority 1
  - ⚠️ If issues: Fix first
- **Nov 11+:** Priority 2-3 if beneficial

---

**END OF MEGA-PROMPT V4**
