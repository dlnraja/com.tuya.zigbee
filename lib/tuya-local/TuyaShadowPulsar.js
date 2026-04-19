/**
 * TuyaShadowPulsar - Singleton Manager for Zigbee-to-Cloud Mirroring
 * Implements Leaky Bucket, Deduplication, and Echo Filtering (v7.0.22).
 */
class TuyaShadowPulsar {
    constructor() {
        if (TuyaShadowPulsar.instance) return TuyaShadowPulsar.instance;

        this.queue = new Map(); // Map ensures deduplication (only latest state per DP is kept)
        this.echoCache = new Map(); // Stores timestamps of local actions
        this.RATE_LIMIT_MS = 2000; // 1 request per 2 seconds
        this.ECHO_WINDOW_MS = 2500; // Ignore cloud updates matching local actions within 2.5s
        
        // v7.0.22 Quota Shields
        this.DEADBANDS = {
            'cur_temperature': 0.5,
            'cur_humidity': 5,
            'cur_lux': 50
        };
        this.WHITELIST = ['switch', 'switch_1', 'switch_2', 'switch_3', 'switch_4', 'onoff', 'cur_temperature', 'cur_humidity', 'presence', 'door_contact'];

        this.pulsarTimer = setInterval(() => this._drainBucket(), this.RATE_LIMIT_MS);
        
        // v7.0.22: Dependency Injection for Cloud API
        this._cloudApi = null;
        this.log = console.log;

        TuyaShadowPulsar.instance = this;
    }

    setCloudApi(api, log) {
        this._cloudApi = api;
        if (log) this.log = log;
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
    }

    /**
     * @param {string} localId - Homey Device ID
     * @param {string} shadowId - Tuya Virtual Device ID
     * @param {number|string} dp - Data Point Code
     * @param {any} value - Value to send
     * @param {boolean} isCritical - Bypasses certain noise filters if true
     */
    spill(localId, shadowId, dp, value, isCritical = false) {
        if (!this.enabled || !shadowId) return; // Opt-in check

        //  v7.0.22: Quota Whitelist Shield
        if (!this.WHITELIST.includes(dp)) {
            // this.log(`[Pulsar]  Whitelist block for DP: ${dp}`);
            return;
        }

        const cacheKey = `${localId}_${dp}`;
        const lastLocal = this.echoCache.get(cacheKey);

        //  v7.0.22: Deadband Filter (Save API Credits)
        if (!isCritical && typeof value === 'number' && this.DEADBANDS[dp]) {
            if (lastLocal && Math.abs(value - lastLocal.value) < this.DEADBANDS[dp]) {
                return; // Suppress noise
            }
        }
        
        // 1. Tagging for Echo Filter (Record when WE changed it locally)
        this.echoCache.set(cacheKey, { value, timestamp: Date.now() });

        // 2. Queueing & Deduplication (Overwrite existing pending update for this DP)
        const payloadKey = `${shadowId}_${dp}`;
        
        // Basic deduplication
        if (!isCritical && lastLocal && lastLocal.value === value && (Date.now() - lastLocal.timestamp < 10000)) {
            return;
        }

        this.queue.set(payloadKey, { shadowId, dp, value, isCritical });
    }

    /**
     * Called by incoming MQTT/Cloud events to verify if we should ignore them
     */
    isEcho(localId, dp, incomingValue) {
        const cacheKey = `${localId}_${dp}`;
        const lastLocal = this.echoCache.get(cacheKey);

        if (!lastLocal) return false;

        const timeSinceLocal = Date.now() - lastLocal.timestamp;
        if (timeSinceLocal < this.ECHO_WINDOW_MS && lastLocal.value === incomingValue) {
            return true; // It's an echo of our own spill!
        }
        return false;
    }

    /**
     * The Leaky Bucket Drain (Fires every 2000ms)
     * Groups commands by shadowId to minimize API calls (Batching)
     */
    async _drainBucket() {
        if (this.queue.size === 0 || !this._cloudApi) return;

        // 1. Extract and Group items by shadowId
        const batchMap = new Map();
        const batchKeys = [];
        
        for (const [key, data] of this.queue.entries()) {
            if (batchMap.size >= 3) break; // Max 3 devices per pulse to stay safe
            
            if (!batchMap.has(data.shadowId)) {
                batchMap.set(data.shadowId, []);
            }
            batchMap.get(data.shadowId).push({ code: String(data.dp), value: data.value });
            batchKeys.push(key);
        }

        this.log(`[Pulsar]  Pulse: Syncing ${batchMap.size} devices...`);

        // 2. Execute Batch Sends
        for (const [shadowId, commands] of batchMap.entries()) {
            try {
                // v7.0.22: Batched API Call
                await this._cloudApi.sendCommand(shadowId, commands);
                this.log(`[Pulsar]  Batched spill for ${shadowId.slice(0, 8)}... (${commands.length} DPs)`);
            } catch (error) {
                this.log(`[Pulsar]  Batch spill failed for ${shadowId}: ${error.message}`);
                // Permission Denied or Quota Exceeded? 
                if (error.message.includes('permission') || error.message.includes('quota')) {
                    this.log(`[Pulsar]  CLOUD SYNC SUSPENDED (Expiration/Quota)`);
                }
            }
        }

        // 3. Clear processed keys
        batchKeys.forEach(k => this.queue.delete(k));
    }

    destroy() {
        clearInterval(this.pulsarTimer);
    }
}

module.exports = new TuyaShadowPulsar();
