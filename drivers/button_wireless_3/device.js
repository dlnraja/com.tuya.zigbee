'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 *
 * v5.11.218 FIX CRITICAL (diag 7abc3ea6) : l'ancien code faisait :
 *   - extends PhysicalButtonMixin(TuyaZigbeeDevice) au lieu de ButtonDevice
 *   - async onNodeInit() SANS destructurer { zclNode }
 *   - await super.on() au lieu de super.onNodeInit({ zclNode })
 * Conséquence : zclNode était undefined → initPhysicalButtonDetection(undefined)
 * → AUCUN listener enregistré → boutons ne répondent pas ("missing capability listener").
 * Fix : restoration de la version ButtonDevice (identique à master qui marche).
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_3] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button3GangDevice;
