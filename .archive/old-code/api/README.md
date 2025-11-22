# API

Extensions et endpoints personnalisés pour Universal Tuya Zigbee.

## Structure

```
api/
├── README.md (ce fichier)
└── endpoints/ (à venir)
```

## Usage Futur

Ce dossier contiendra:
- REST endpoints personnalisés
- WebSocket handlers
- Intégrations externes
- Webhooks

## Exemples

```javascript
// Example endpoint
module.exports = {
  async getDeviceStats({ homey, params }) {
    const devices = await homey.drivers.getDevices();
    return {
      total: devices.length,
      online: devices.filter(d => d.getAvailable()).length
    };
  }
};
```
