# Athom Official Best Practices
> Extracted from athombv GitHub repositories | February 2, 2026

## 1. SDK3 Migration (from homey-meshdriver)

| Old (deprecated) | New (SDK3) |
|------------------|------------|
| `MeshDevice` | `ZigBeeDevice` |
| `onMeshInit()` | `onNodeInit()` |
| `this.node.on('online')` | `onEndDeviceAnnounce()` |
| `registerReportListener` | `BoundCluster` |
| `registerAttrReportListener` | `configureAttributeReporting` |
| `calculateZigbeeDimDuration` | `calculateLevelControlTransitionTime` |

## 2. BoundCluster Pattern (Official)

```javascript
const { BoundCluster } = require('zigbee-clusters');

class OnOffBoundCluster extends BoundCluster {
  constructor({ onToggle, onSetOn, onSetOff }) {
    super();
    this._onToggle = onToggle;
    this._onSetOn = onSetOn;
    this._onSetOff = onSetOff;
  }

  toggle() {
    if (this._onToggle) this._onToggle();
  }

  setOn() {
    if (this._onSetOn) this._onSetOn();
  }

  setOff() {
    if (this._onSetOff) this._onSetOff();
  }
}

// Usage in device.js
zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
  onToggle: this._toggleHandler.bind(this),
  onSetOn: this._setOnHandler.bind(this),
  onSetOff: this._setOffHandler.bind(this),
}));
```

## 3. Battery Capability Registration

```javascript
// Official pattern from com.ikea.tradfri-example
this.batteryThreshold = 20;
this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
  getOpts: {
    getOnStart: true,
  },
  reportOpts: {
    configureAttributeReporting: {
      minInterval: 0,
      maxInterval: 60000,  // ~16 hours
      minChange: 5,
    },
  },
});
```

## 4. Flow Triggering Pattern

```javascript
// Official pattern - use triggerFlow() method
this.triggerFlow({ id: 'button_pressed' })
  .then(() => this.log('flow triggered: button_pressed'))
  .catch(err => this.error('Error triggering flow:', err));
```

## 5. Long Press Detection Pattern

```javascript
// Track current long press state
this._currentLongPress = null;

// On move command - store mode
_moveCommandHandler({ moveMode }) {
  this._currentLongPress = moveMode;
}

// On stop command - trigger flow
_stopCommandHandler() {
  if (this._currentLongPress) {
    const flowId = `dim_${this._currentLongPress}_long_press`;
    this.triggerFlow({ id: flowId });
    this._currentLongPress = null;
  }
}
```

## 6. OnOff Cluster Definition

```javascript
const ATTRIBUTES = {
  onOff: { id: 0, type: ZCLDataTypes.bool },
  onTime: { id: 16385, type: ZCLDataTypes.uint16 },
  offWaitTime: { id: 16386, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {
  setOff: { id: 0 },
  setOn: { id: 1 },
  toggle: { id: 2 },
  offWithEffect: { id: 64 },
  onWithRecallGlobalScene: { id: 65 },
  onWithTimedOff: { id: 66 },
};
```

## 7. Custom Cluster Implementation

```javascript
const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

class TuyaSpecificCluster extends Cluster {
  static get ID() { return 0xEF00; }  // 61184
  static get NAME() { return 'tuya'; }
  
  static get ATTRIBUTES() {
    return {
      // Custom attributes
    };
  }
  
  static get COMMANDS() {
    return {
      datapoint: {
        id: 0,
        args: {
          status: ZCLDataTypes.uint8,
          transid: ZCLDataTypes.uint8,
          dp: ZCLDataTypes.uint8,
          datatype: ZCLDataTypes.uint8,
          length: ZCLDataTypes.uint16,
          data: ZCLDataTypes.buffer,
        },
      },
    };
  }
}

Cluster.addCluster(TuyaSpecificCluster);
```

## 8. Attribute Reporting Configuration

```javascript
await zclNode.endpoints[1].clusters.onOff.configureReporting({
  onOff: {
    minInterval: 0,
    maxInterval: 300,
    minChange: 1,
  },
});
```

## 9. Device Initialization Best Practice

```javascript
async onNodeInit({ zclNode }) {
  // 1. Enable debug if needed
  this.enableDebug();
  
  // 2. Print node structure
  this.printNode();
  
  // 3. Register capabilities
  this.registerCapability('onoff', CLUSTER.ON_OFF);
  
  // 4. Configure attribute reporting
  await this.configureAttributeReporting([...]);
  
  // 5. Bind clusters for incoming commands
  zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({...}));
}
```

## 10. Key Libraries

| Library | Purpose | NPM |
|---------|---------|-----|
| `homey-zigbeedriver` | ZigBee device abstraction | `npm i homey-zigbeedriver` |
| `zigbee-clusters` | ZCL cluster library | `npm i zigbee-clusters` |

---
*Sources: athombv/node-homey-zigbeedriver, athombv/node-zigbee-clusters, athombv/com.ikea.tradfri-example*
