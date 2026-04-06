'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const EventEmitter = require('events');

// Clé universelle utilisée par Tuya pour le broadcast de découverte (UDP 6667)
const UDP_KEY = 'yG$pk1N7Q387mE0g'; 

class TuyaDiscovery extends EventEmitter {
    constructor(homey) {
        super();
        this.homey = homey;
        this.udpClient = null;
    }

    /**
     * Démarre la recherche hybride (mDNS + UDP)
     */
    async findDevice(deviceId) {
        this.homey.log(`[Discovery] Recherche du device: ${deviceId}...`);

        // 1. Priorité au mDNS (Standard Homey)
        const mdnsIp = await this.discoverMdns(deviceId);
        if (mdnsIp) {
            this.homey.log(`[Discovery] mDNS Succès: ${mdnsIp}`);
            return mdnsIp;
        }

        // 2. Fallback sur UDP Broadcast
        this.homey.log(`[Discovery] mDNS échoué, passage en UDP Broadcast...`);
        return await this.discoverUdp(deviceId);
    }

    /**
     * Stratégie mDNS via le SDK Homey
     */
    async discoverMdns(deviceId) {
        try {
            // On récupère la stratégie définie dans app.json
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
     * Stratégie UDP Port 6667 (Le "vrai" Tuya Local)
     */
    async discoverUdp(deviceId) {
        return new Promise((resolve) => {
            const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            
            client.on('error', (err) => {
                this.homey.error('[Discovery] UDP Error:', err);
                client.close();
                resolve(null);
            });

            client.on('message', (msg) => {
                try {
                    // Les paquets Tuya commencent par un header spécifique
                    // On déchiffre le message avec la clé universelle AES-128-ECB
                    const decipher = crypto.createDecipheriv('aes-128-ecb', UDP_KEY, '');
                    decipher.setAutoPadding(false);
                    
                    // On saute les 20 premiers octets du header Tuya pour atteindre le payload
                    let decrypted = Buffer.concat([decipher.update(msg.slice(20)), decipher.final()]);
                    
                    // Nettoyage des caractères de padding non-JSON
                    const jsonStr = decrypted.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                    const payload = JSON.parse(jsonStr);

                    if (payload.gwId === deviceId || payload.id === deviceId) {
                        this.homey.log(`[Discovery] UDP Succès! IP trouvée: ${payload.ip}`);
                        client.close();
                        resolve(payload.ip);
                    }
                } catch (e) {
                    // On ignore les paquets illisibles ou d'autres devices
                }
            });

            client.bind(6667, () => {
                // On laisse 10 secondes pour trouver le device
                setTimeout(() => {
                    try { client.close(); } catch(e) {}
                    resolve(null);
                }, 10000);
            });
        });
    }
}

module.exports = TuyaDiscovery;
