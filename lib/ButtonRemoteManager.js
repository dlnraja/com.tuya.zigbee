'use strict';

/**
 * ButtonRemoteManager
 *
 * Manages wireless button/remote devices (TS0041-TS0044, TS0001-TS0004)
 * These devices SEND commands but DON'T RECEIVE state updates
 *
 * Responsibilities:
 * - Bind to onOff/levelControl/scenes clusters
 * - Listen for ZCL commands (not attributes!)
 * - Translate commands to Homey flow triggers
 *
 * CRITICAL: Buttons use COMMANDS, not ATTRIBUTE REPORTING!
 */

class ButtonRemoteManager {
  /**
   * Attach button/remote manager to device
   *
   * @param {Object} device - Homey device instance
   * @param {Object} zclNode - ZCL node
   * @param {Object} options - { endpointId: 1, buttonCount: 1 }
   */
  static async attach(device, zclNode, options = {}) {
    const { endpointId = 1, buttonCount = 1 } = options;

    device.log('[BUTTON-MGR] 🎛️  Attaching ButtonRemoteManager...');
    device.log(`[BUTTON-MGR]    Base Endpoint: ${endpointId}, Buttons: ${buttonCount}`);

    // Store button info
    device._buttonConfig = {
      baseEndpoint: endpointId,
      buttonCount,
      clustersAttached: []
    };

    // For multi-button remotes (TS0042, TS0043, TS0044), they often use Endpoints 1, 2, 3, 4
    for (let i = 0; i < buttonCount; i++) {
      const epId = endpointId + i;
      const endpoint = zclNode.endpoints[epId];
      if (!endpoint) {
        device.error(`[BUTTON-MGR] ❌ No endpoint ${epId}`);
        continue;
      }
      
      const buttonNumber = i + 1;
      device.log(`[BUTTON-MGR]    Attaching handlers for Button ${buttonNumber} on Endpoint ${epId}...`);

      // Attach onOff cluster (single press, double press, long press)
      await ButtonRemoteManager._attachOnOffCluster(device, endpoint, buttonNumber);

      // Attach levelControl cluster (dim up/down for some models)
      await ButtonRemoteManager._attachLevelControlCluster(device, endpoint, buttonNumber);

      // Attach scenes cluster (for scene switches)
      await ButtonRemoteManager._attachScenesCluster(device, endpoint, buttonNumber);
    }

    device.log('[BUTTON-MGR] ✅ ButtonRemoteManager attached');
    device.log(`[BUTTON-MGR]    Clusters: ${device._buttonConfig.clustersAttached.join(', ')}`);
  }

  /**
   * Attach to onOff cluster (commands: On, Off, Toggle)
   */
  static async _attachOnOffCluster(device, endpoint, buttonNumber) {
    const onOffCluster = endpoint.clusters.onOff;
    if (!onOffCluster) {
      device.log('[BUTTON-MGR] ℹ️  No onOff cluster, skipping');
      return;
    }

    try {
      // Bind cluster (required for commands to reach Homey)
      await onOffCluster.bind();
      device.log('[BUTTON-MGR] ✅ onOff cluster bound');
      device._buttonConfig.clustersAttached.push('onOff');
    } catch (err) {
      device.error('[BUTTON-MGR] ⚠️  Failed to bind onOff cluster:', err.message);
      // Continue anyway - some buttons work without explicit bind
    }

    // Listen for commands (NOT attributes!)
    // TS0041: On=single, Off=double, Toggle=long
    // Other models may vary

    onOffCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR] 📥 onOff command: ${commandName}`, payload);

      switch (commandName) {
      case 'on':
      case 'commandOn':
        ButtonRemoteManager.triggerFlow(device, buttonNumber, 'single');
        break;
      case 'off':
      case 'commandOff':
        ButtonRemoteManager.triggerFlow(device, buttonNumber, 'double');
        break;
      case 'toggle':
      case 'commandToggle':
        ButtonRemoteManager.triggerFlow(device, buttonNumber, 'long');
        break;
      default:
        device.log(`[BUTTON-MGR] ℹ️  Unknown onOff command: ${commandName}`);
      }
    });

    device.log(`[BUTTON-MGR] 👂 Listening for onOff commands (single/double/long) on btn ${buttonNumber}`);
  }

  /**
   * Attach to levelControl cluster (commands: MoveWithOnOff, StepWithOnOff)
   */
  static async _attachLevelControlCluster(device, endpoint, buttonNumber) {
    const levelCluster = endpoint.clusters.levelControl;
    if (!levelCluster) {
      device.log('[BUTTON-MGR] ℹ️  No levelControl cluster, skipping');
      return;
    }

    try {
      await levelCluster.bind();
      device.log('[BUTTON-MGR] ✅ levelControl cluster bound');
      device._buttonConfig.clustersAttached.push('levelControl');
    } catch (err) {
      device.error('[BUTTON-MGR] ⚠️  Failed to bind levelControl:', err.message);
    }

    levelCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR] 📥 levelControl command: ${commandName}`, payload);

      switch (commandName) {
      case 'moveWithOnOff':
      case 'move':
        if (payload && payload.moveMode === 0) {
          ButtonRemoteManager.triggerFlow(device, buttonNumber, 'dim_up');
        } else {
          ButtonRemoteManager.triggerFlow(device, buttonNumber, 'dim_down');
        }
        break;
      case 'stepWithOnOff':
      case 'step':
        if (payload && payload.stepMode === 0) {
          ButtonRemoteManager.triggerFlow(device, buttonNumber, 'dim_up_step');
        } else {
          ButtonRemoteManager.triggerFlow(device, buttonNumber, 'dim_down_step');
        }
        break;
      case 'stop':
      case 'stopWithOnOff':
        ButtonRemoteManager.triggerFlow(device, buttonNumber, 'dim_stop');
        break;
      default:
        device.log(`[BUTTON-MGR] ℹ️  Unknown level command: ${commandName}`);
      }
    });

    device.log(`[BUTTON-MGR] 👂 Listening for levelControl commands (dim up/down) on btn ${buttonNumber}`);
  }

  /**
   * Attach to scenes cluster (commands: RecallScene, StoreScene)
   */
  static async _attachScenesCluster(device, endpoint, buttonNumber) {
    const scenesCluster = endpoint.clusters.scenes;
    if (!scenesCluster) {
      device.log('[BUTTON-MGR] ℹ️  No scenes cluster, skipping');
      return;
    }

    try {
      await scenesCluster.bind();
      device.log('[BUTTON-MGR] ✅ scenes cluster bound');
      device._buttonConfig.clustersAttached.push('scenes');
    } catch (err) {
      device.error('[BUTTON-MGR] ⚠️  Failed to bind scenes:', err.message);
    }

    scenesCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR] 📥 scenes command: ${commandName}`, payload);

      if (commandName === 'recallScene' && payload && payload.sceneId !== undefined) {
        const sceneId = payload.sceneId;
        ButtonRemoteManager.triggerFlow(device, buttonNumber, `scene_${sceneId}`);
      }
    });

    device.log(`[BUTTON-MGR] 👂 Listening for scenes commands on btn ${buttonNumber}`);
  }

  /**
   * Trigger Homey flow card
   *
   * @param {Object} device - Homey device
   * @param {Number} button - Button number (1-4)
   * @param {String} scene - Scene name (single, double, long, dim_up, scene_1, etc.)
   */
  static triggerFlow(device, button, scene) {
    device.log(`[BUTTON-MGR] Triggering flow: button=${button}, scene=${scene}`);

    try {
      const triggerCard = device.homey?.flow?.getDeviceTriggerCard?.('remote_button_pressed');
      if (!triggerCard || typeof triggerCard.trigger !== 'function') {
        device.log('[BUTTON-MGR] Flow trigger card "remote_button_pressed" not available');
        return;
      }

      triggerCard
        .trigger(device, {}, { button, scene })
        .then(() => {
          device.log(`[BUTTON-MGR] Flow triggered: button ${button}, scene ${scene}`);
        })
        .catch(err => {
          device.error('[BUTTON-MGR] Error triggering flow:', err.message);
        });
    } catch (err) {
      device.log(`[BUTTON-MGR] Flow card not available: ${err.message}`);
    }
  }

  /**
   * Detach button manager (cleanup)
   */
  static detach(device) {
    device.log('[BUTTON-MGR] 🔌 Detaching ButtonRemoteManager...');

    if (device._buttonConfig) {
      delete device._buttonConfig;
    }

    device.log('[BUTTON-MGR] ✅ ButtonRemoteManager detached');
  }
}

module.exports = ButtonRemoteManager;
