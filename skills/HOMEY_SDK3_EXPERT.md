#  HOMEY SDK 3 EXPERT SKILL (Antigravity v6.0.0)

> Optimized for v8.0.0 production release and beyond.

##  Core Patterns

### 1. Idempotent Initialization
```javascript
async onNodeInit() {
  if (this._initialized) return;
  this._initialized = true;
  await super.onNodeInit();
  // ... init logic wrapped in _safeInvoke
}
```

### 2. Bidirectional Sync (Zero-Latency)
Always mark app commands to prevent feedback loops with physical detection.
```javascript
async onCapabilityOnOff(value, opts) {
  this.markAppCommand(1, value); // Mark for Gang 1
  return this.sendOnOffCommand(value);
}
```

### 3. Asymmetric Button Mapping
Support devices with mixed gang capabilities using the `VirtualButtonMixin` v6.0.0 logic.
- `button.toggle_1` -> `onoff`
- `button.toggle_2` -> `onoff.gang2`
- `button.3` -> Custom scene trigger

##  Critical Anti-Patterns
- `getDeviceTriggerCard` without `.trigger()` (Incomplete flow execution)
- Hardcoded endpoint IDs (Use `gang` variable or `getEndpoint(gang)`)
- Missing `_safeInvoke` in async listeners.

##  Self-Healing Strategy
All drivers must implement a retry mechanism for critical ZCL/DP commands, switching between protocols if the primary fails.
