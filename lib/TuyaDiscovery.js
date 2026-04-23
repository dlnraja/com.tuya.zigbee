'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const EventEmitter = require('events');

// ClÃ© universelle utilisÃ©e par Tuya pour le broadcast de dÃ©couverte (UDP 6667)
const UDP_KEY = 'yG$pk1N7Q387mE0g'; 

class TuyaDiscovery extends EventEmitter {
    constructor(homey) {
        super();
        this.homey = homey;
        this.udpClient = null;
    }

    /**
     * DÃ©marre la recherche hybride (mDNS + UDP)
     */
    async findDevice(deviceId, localKey = null) {
        this.homey.log(`[Discovery] Recherche du device: ${deviceId}...`);

        // 1. PrioritÃ© au mDNS (Standard Homey)
        const mdnsIp = await this.discoverMdns(deviceId);
        if (mdnsIp) {
            this.homey.log(`[Discovery] mDNS SuccÃ¨s: ${mdnsIp}`);
            return mdnsIp;
        }

        // 2. Fallback sur UDP Broadcast avec Local Key possible (v3.4+)
        this.homey.log(`[Discovery] mDNS Ã©chouÃ©, passage en UDP Broadcast...`);
        return await this.discoverUdp(deviceId, localKey);
    }

    /**
     * StratÃ©gie mDNS via le SDK Homey
     */
    async discoverMdns(deviceId) {
        try {
            // On rÃ©cupÃ¨re la stratÃ©gie dÃ©finie dans app.json
            const discoveryStrategy = this.homey.discovery.getStrategy('tuya_wifi');
            if(!discoveryStrategy) return null;
            const results = discoveryStrategy.getResults();

            for (const result of Object.values(results)) {
                // Tuya met souvent l'ID dans les TXT records (gwId ou id)
                const txtId = result.txt.id || result.txt.gwId;
                if (txtId === deviceId) {
                    return result.address;
                }
            }
        } catch (e) {
            this.homey.error('[Discovery] Erreur mDNS:', e.message);
        }
        return null;
    }

    /**
     * StratÃ©gie UDP Port 6667 (Le "vrai" Tuya Local - Multiversion)
     */
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
                    // Les paquets Tuya commencent par un header spÃ©cifique
                    // On teste d'abord avec la clÃ© UNIVERSAL, ou la LOCAL_KEY si fournie
                    const keysToTry = localKey ? [localKey, UDP_KEY] : [UDP_KEY];
                    
                    for (const key of keysToTry) {
                        try {
                            const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
                            decipher.setAutoPadding(false);
                            
                            // On saute les 20 premiers octets du header Tuya pour atteindre le payload
                            let decrypted = Buffer.concat([decipher.update(msg.slice(20)), decipher.final()]);
                            
                            // Nettoyage des caractÃ¨res de padding non-JSON
                            const jsonStr = decrypted.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                            const payload = JSON.parse(jsonStr);

                            if (payload.gwId === deviceId || payload.id === deviceId) {
                                this.homey.log(`[Discovery] UDP SuccÃ¨s (Key: ${key === UDP_KEY ? 'Universal' : 'Local'})! IP trouvÃ©e: ${payload.ip}`);
                                client.close();
                                resolve(payload.ip);
                                return; // Stop after success
                            }
                        } catch (decryptErr) {
                            // On ignore silencieusement et on tente la clÃ© suivante, ou on droppe le paquet
                        }
                    }
                } catch (e) {
                    // On ignore les paquets illisibles ou d'autres devices
                }
            });

            client.bind(6667, () => {
                // On laisse 10 secondes pour trouver le device avant abandon "Cloudless"
                setTimeout(() => {
                    try { client.close(); } catch(e) {}
                    resolve(null);
                }, 10000);
      });
        });
    }
}

module.exports = TuyaDiscovery;
