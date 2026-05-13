# Session Stability & Heuristic Rules Specification
**Universal Tuya Engine for Homey Pro**

---

## 1. ⚙️ Standardized Button Management Heuristics

To maintain a "Zero-Defect" state across physical and virtual buttons, the codebase enforces distinct handling mechanisms to decouple user-initiated app commands from physical hardware clicks.

### A. Physical Button Detection (PR #120 Pattern)
Battery-powered and mains-powered switches report their states via Zigbee attribute reports or Tuya DP (EF00) packets. When an application command (e.g., a Homey flow or user interface click) changes a switch's state, it triggers a feedback report from the device. To prevent this feedback from being incorrectly classified as a physical button click (which would trigger circular flows), the **PR #120 Pending Throttling** pattern is strictly enforced:

1. **State Tracking Variables**:
   Every switch device must maintain:
   ```javascript
   this._lastOnoffState = null;
   this._appCommandPending = false;
   this._appCommandTimeout = null;
   ```

2. **App Command Flagging**:
   When sending an ON/OFF command from the app, call `_markAppCommand()` which sets a 2000ms guard window:
   ```javascript
   _markAppCommand() {
     this._appCommandPending = true;
     clearTimeout(this._appCommandTimeout);
     this._appCommandTimeout = setTimeout(() => {
       this._appCommandPending = false;
     }, 2000);
   }
   ```

3. **Event Classification**:
   In the DP or ZCL command receiver, distinguish physical interactions using:
   ```javascript
   const isPhysical = reportingEvent && !this._appCommandPending;
   ```

### B. Virtual Button Interaction
To ensure flow triggers and capability events are cleanly processed without bypassing internal state validations:
* **Rule**: NEVER use direct state mutators or unvalidated SDK setters for virtual capability updates.
* **Practice**: Always invoke `this._safeSetCapability()` rather than direct setter to ensure flow triggers map optimally internally.

---

## 2. 🧬 Manufacturer & Fingerprint Variant Routing

A single manufacturer ID (`zb_manufacturer_name`) often covers an entire fleet of diverse physical hardware.

### A. Fingerprint Formula
Fingerprints in the Homey app manifest are mapped as:
$$\text{Fingerprint} = \text{zb\_manufacturer\_name} + \text{zb\_model\_id}$$

This means:
* The same manufacturer (e.g., `_TZ3000_abc`) **can and should** exist under multiple drivers if combined with different product IDs (such as `TS0001` for a 1-gang switch, `TS0002` for a 2-gang switch, and `TS0003` for a 3-gang switch).
* **Banning Over-Deletions**: Never delete a fingerprint simply because its manufacturer ID appears elsewhere. Only remove a fingerprint if **both** the manufacturer name and the product ID are identically mapped to a completely wrong driver.
* **Documentation**: When mapping DPs for these multi-variant devices, you must always provide clear inline comments indicating which specific hardware `variant` the DP corresponds to.

---

## 3. 🚨 Diagnostic Crash Remediation Log

The latest diagnostic crash report (`5f100d21-0df6-42f8-a57c-fe6a09285819`) was audited and successfully traced:

* **Error**: `TypeError: this.homey.flow.getDeviceConditionCard is not a function`
* **Root Cause**: An outdated SDK v2 call (`getDeviceConditionCard` or `getDeviceActionCard`) was invoked in legacy/backups of drivers (e.g., archived versions of `air_quality_comprehensive` and `din_rail_meter` located in `tmp/` and `data/temp_desktop_cleanup/tuya_backup/`).
* **Resolution**: In the active production root codebase, all such methods have been completely removed. Active drivers route flow cards via `AdvancedFlowCardManager.js` using compliant SDK v3 calls:
  ```javascript
  this.homey.flow.getConditionCard(id)
  this.homey.flow.getActionCard(id)
  ```
* **Audit Verdict**: 100% Corrected. No occurrences of `getDeviceConditionCard` exist in active production code.

---

## 4. 🛠️ Gateway Emulation & Local Resiliency

To bolster local-first connectivity for WiFi devices:
1. **Socket Address Reuse**: UDP discovery sockets bind with `{ exclusive: false }` to resolve address-in-use (`EADDRINUSE`) issues when multiple drivers share discovery ports.
2. **Auto-Correcting IP Loop**: TuyAPI clients monitor connection failures. If cached IPs are unresponsive, they bypass the cache to broadcast a LAN discovery scan, automatically resolving and saving the device's new IP address.
