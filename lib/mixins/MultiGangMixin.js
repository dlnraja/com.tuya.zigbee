'use strict';

/**
 * MultiGangMixin - v7.0.22
 * 
 * Native Homey SDK 3 grouping for multi-button/gang Tuya devices.
 * Implements Dot-Notation mapping (onoff, onoff.1, onoff.2, etc.)
 * and the Synchronization Shield (Multi-Gang Guard).
 * 
 * Works for both Zigbee (EF00) and WiFi (Local TCP).
 */
module.exports = (BaseClass) => class extends BaseClass {
    
    async onInit() {
        if (super.onInit) await super.onInit();

        // 1. Dynamic Mapping (DP <-> Capability)
        // ex: { 1: 'onoff', 2: 'onoff.1', 3: 'onoff.2', 4: 'onoff.3' }
        this.gangMappings = this._buildGangMapFromCapabilities();

        // 2. SDK 3 Grouped Listener (UI-to-HW)
        const capabilities = Object.values(this.gangMappings);
        if (capabilities.length > 0) {
            this.log(`[MultiGang]  Registered Grouped Listener for: ${capabilities.join(', ')}`);
            this.registerMultipleCapabilityListener(
                capabilities, 
                this._onMultipleGangAction.bind(this), 
                { debounce: 150 }
            );
        }
    }

    /**
     *  THE SYNCHRONIZATION SHIELD (Multi-Gang Guard)
     * HW-to-UI: Filters redundant reports to avoid infinite loops and flow cross-firing.
     */
    async handleGangReport(dp, incomingValue) {
        const capability = this.gangMappings[dp];
        if (!capability) return false;

        const currentState = this.getCapabilityValue(capability);

        // State Differential Filter: Block redundant reports
        if (currentState === incomingValue) {
            this.log(`[MultiGang Guard]  Blocked redundant report for DP ${dp} (${capability}) at ${incomingValue}`);
            return false;
        }

        this.log(`[MultiGang]  Valid Status Update -> DP: ${dp} | Cap: ${capability} | Val: ${incomingValue}`);
        
        // Propagate via _safeSetCapability (Mixed in by CapabilityManagerMixin)
        if (this._safeSetCapability) {
            return await this._safeSetCapability(capability, !!incomingValue);
        } else {
            return await this.setCapabilityValue(capability, !!incomingValue).catch(this.error);
        }
    }

    /**
     * SDK 3 Native Action Handler (UI-to-HW)
     */
    async _onMultipleGangAction(valueObj, customOpts) {
        this.log('[MultiGang]  Outgoing Multi-Action:', JSON.stringify(valueObj));

        const results = [];
        for (const [capability, value] of Object.entries(valueObj)) {
            const dp = this._getDpFromCapability(capability);
            if (dp) {
                // Determine value type (usually boolean for onoff)
                const type = typeof value === 'boolean' ? 'boolean' : (typeof value === 'number' ? 'value' : 'enum');
                
                // Route to the specific sender (BaseUnifiedDevice or TuyaLocalDevice)
                if (this.sendTuyaCommand) {
                    results.push(await this.sendTuyaCommand(dp, type, value));
                } else if (this.sendDP) {
                    results.push(await this.sendDP(dp, type, value));
                } else if (this._tuyaWiFi) {
                    // WiFi fallback via Hybrid Manager
                    results.push(await this._tuyaWiFi.setDP(dp, value));
                }
            }
        }
        return Promise.all(results);
    }

    _buildGangMapFromCapabilities() {
        const map = {};
        const caps = this.getCapabilities();
        
        // v7.0.22 Strategy: Standard Tuya DP allocation for 1-4 gang switches
        if (caps.includes('onoff')) map[1] = 'onoff';
        
        // If it's a multi-gang without 'onoff' on DP1, we check sub-caps
        if (caps.includes('onoff.1')) map[caps.includes('onoff') ? 2 : 1] = 'onoff.1';
        if (caps.includes('onoff.2')) map[caps.includes('onoff') ? 3 : 2] = 'onoff.2';
        if (caps.includes('onoff.3')) map[caps.includes('onoff') ? 4 : 3] = 'onoff.3';
        if (caps.includes('onoff.4')) map[caps.includes('onoff') ? 5 : 4] = 'onoff.4';
        
        // v5.13: Allow override via device sub-class map if present
        if (this.customGangMap) {
            Object.assign(map, this.customGangMap);
        }

        this.log(`[MultiGang]  Auto-Mapped DPs:`, JSON.stringify(map));
        return map;
    }

    _getDpFromCapability(capability) {
        return Object.keys(this.gangMappings).find(key => this.gangMappings[key] === capability);
    }
};
