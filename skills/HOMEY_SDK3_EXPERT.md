#  HOMEY SDK 3 EXPERT SKILL

> Optimized for v7.2.14 stabilization.

##  Core Patterns

### 1. Idempotent Initialization
```javascript
async onInit() {
  if (this._flowCardsRegistered) return;
  this._flowCardsRegistered = true;
  // ... init logic
}
```

### 2. Flow Card Triggers (MANDATORY)
Every flow card MUST be triggered. Never just retrieve it.
```javascript
//  Correct
this._myCard = this.homey.flow.getDeviceTriggerCard('my_card');
this._myCard.trigger(this, { value: 1 }).catch(this.error);
```

### 3. Capability Guards
Always check if a capability exists before setting it.
```javascript
if (this.hasCapability('measure_temperature')) {
  await this.setCapabilityValue('measure_temperature', val);
}
```

##  Critical Anti-Patterns to Avoid
- `getDeviceActionCard` (Deprecated in SDK 3)
- Returning `false` in `onInit` (Can cause boot-loops)
- Missing `super.onInit()` in inherited classes.
