'use strict';
const dgram = require('dgram');
const crypto = require('crypto');
const EventEmitter = require('events');

// Universal key used by Tuya for discovery broadcast (UDP 6667)
const UDP_KEY = 'yG$pk1N7Q387mE0g'; 

class TuyaDiscovery extends EventEmitter {
    constructor(homey) {
        super();
        this.homey = homey;
        this.udpClient = null;
    }

    /**
     * Start hybrid discovery (mDNS + UDP)
     */
    async findDevice(deviceId, localKey = null) {
        this.homey.log(`[Discovery] Searching for device: ${deviceId}...`);

        // 1. Priority to mDNS (Standard Homey)
        const mdnsIp = await this.discoverMdns(deviceId);
        if (mdnsIp) {
            this.homey.log(`[Discovery] mDNS Success: ${mdnsIp}`);
            return mdnsIp;
        }

        // 2. Fallback to UDP Broadcast
        this.homey.log(`[Discovery] mDNS failed, trying UDP Broadcast...`);
        return await this.discoverUdp(deviceId, localKey);
    }

    async discoverMdns(deviceId) {
        try {
            const discoveryStrategy = this.homey.discovery.getStrategy('tuya_wifi');
            if (!discoveryStrategy) return null;
            const results = discoveryStrategy.getResults();

            for (const result of Object.values(results)) {
                const txtId = result.txt.id || result.txt.gwId;
                if (txtId === deviceId) {
                    return result.address;
                }
            }
        } catch (e) {
            this.homey.error('[Discovery] mDNS Error:', e.message);
        }
        return null;
    }

    async discoverUdp(deviceId, localKey = null) {
        return new Promise((resolve) => {
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            
            client.on('error', (err) => {
                this.homey.error('[Discovery] UDP Error:', err);
                client.close();
                resolve(null);
            });

            client.on('message', (msg) => {
                try {
                    const keysToTry = localKey ? [localKey, UDP_KEY] : [UDP_KEY];
                    for (const key of keysToTry) {
                        try {
                            const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
                            decipher.setAutoPadding(false);
                            
                            // Skip first 20 bytes of Tuya header
                            let decrypted = Buffer.concat([decipher.update(msg.slice(20)), decipher.final()]);
                            
                            // Cleanup non-JSON characters
                            const jsonStr = decrypted.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                            const payload = JSON.parse(jsonStr);

                            if (payload.gwId === deviceId || payload.id === deviceId) {
                                this.homey.log(`[Discovery] UDP Success! IP found: ${payload.ip}`);
                                client.close();
                                resolve(payload.ip);
                                return;
                            }
                        } catch (decryptErr) {
                            // Try next key
                        }
                    }
                } catch (e) {
                    // Ignore malformed packets
                }
            });

            client.bind(6667, () => {
                setTimeout(() => {
                    try { client.close(); } catch(e) {}
                    resolve(null);
                }, 10000);
            });
        });
    }
}

module.exports = TuyaDiscovery;
