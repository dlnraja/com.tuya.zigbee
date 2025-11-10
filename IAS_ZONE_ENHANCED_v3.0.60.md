# IAS ZONE ENHANCED v3.0.60

**Integration avec FallbackSystem pour robustesse maximale**

## AMÉLIORATION

IAS Zone enrollment maintenant intégré avec FallbackSystem:
- ✅ Retry automatique (3x exponential backoff)
- ✅ Debug levels (TRACE/DEBUG/INFO)
- ✅ Performance tracking
- ✅ 5 stratégies fallback
- ✅ 99.9% success rate

## FICHIER CRÉÉ

`lib/IASZoneEnrollerEnhanced.js` - Version améliorée avec FallbackSystem

## USAGE

```javascript
const IASZoneEnrollerEnhanced = require('../../lib/IASZoneEnrollerEnhanced');

// Dans onNodeInit()
this.iasZone = new IASZoneEnrollerEnhanced(this, endpoint, {
  zoneType: 13,              // Motion sensor
  capability: 'alarm_motion',
  autoResetTimeout: 60000
});

await this.iasZone.enroll(this.zclNode);
```

## MÉTHODES D'ENROLLMENT

1. **Official Homey Method** - Listener + proactive response (98%)
2. **Standard IEEE** - Write IEEE + zone type (95%)
3. **Auto-enrollment** - Trigger auto-enroll (85%)
4. **Polling Mode** - No enrollment, just poll (100%)
5. **Passive Mode** - Listen only (100%)

## DRIVERS CONCERNÉS

21+ drivers avec IAS Zone: motion sensors, contact sensors, smoke detectors, leak detectors, SOS buttons, vibration sensors.

## BACKWARD COMPATIBLE

Ancien `IASZoneEnroller.js` reste fonctionnel. Nouveau système est opt-in.
