# Contributing to Universal Tuya Zigbee

## Critical Rules

### Settings Keys
```javascript
// CORRECT:
this.getSetting('zb_model_id')
this.getSetting('zb_manufacturer_name')

// WRONG (causes bugs):
this.getSetting('zb_modelId')
this.getSetting('zb_manufacturerName')
```

### Flow Card IDs
- Pattern: `{driver}_physical_gang{N}_{on|off}`
- Example: `switch_2gang_physical_gang1_on`
- Must match driver.flow.compose.json exactly

### Flow Card JSON
```json
{
  "id": "switch_2gang_physical_gang1_on",
  "title": { "en": "Gang 1 turned on (physical)" },
  "args": []
}
```
**NO `titleFormatted` with `[[device]]`**

### Switch Mixin Order
```javascript
class Device extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))
```

### Backlight Values
Use strings: `"off"`, `"normal"`, `"inverted"`

### Physical Button Detection
```javascript
this._zclState.pending[ep] = true;
setTimeout(() => { this._zclState.pending[ep] = false; }, 2000);
const isPhysical = !this._zclState.pending[ep];
```

## BSEED ZCL-Only Fingerprints
`_TZ3000_l9brjwau`, `_TZ3000_blhvsaqf`, `_TZ3000_ysdv91bk`,
`_TZ3000_hafsqare`, `_TZ3000_e98krvvk`, `_TZ3000_iedbgyxt`

## Tuya DP Reference
| DP | Function |
|----|----------|
| 1-8 | Gang states |
| 14 | Power-on behavior |
| 15 | Backlight mode |
| 101 | Child lock |
