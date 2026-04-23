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

    device.log('[BUTTON-MGR]   Attaching ButtonRemoteManager...');
    device.log(`[BUTTON-MGR]    Endpoint: ${endpointId}, Buttons: ${buttonCount}`);

    const endpoint = zclNode.endpoints[endpointId];
    if (!endpoint) {
      device.error(`[BUTTON-MGR]  No endpoint ${endpointId}`);
      return;
    }

    // Store button info
    device._buttonConfig = {
      endpointId,
      buttonCount,
      clustersAttached: []
    };

    // Attach onOff cluster (single press, double press, long press)
    await ButtonRemoteManager._attachOnOffCluster(device, endpoint, buttonCount);

    // Attach levelControl cluster (dim up/down for some models)
    await ButtonRemoteManager._attachLevelControlCluster(device, endpoint, buttonCount);

    // Attach scenes cluster (for scene switches)
    await ButtonRemoteManager._attachScenesCluster(device, endpoint, buttonCount);

    device.log('[BUTTON-MGR]  ButtonRemoteManager attached');
    device.log(`[BUTTON-MGR]    Clusters: ${device._buttonConfig.clustersAttached.join(', ')}`);
  }

  /**
   * Attach to onOff cluster (commands: On, Off, Toggle)
   */
  static async _attachOnOffCluster(device, endpoint, buttonCount) {
    const onOffCluster = endpoint.clusters.onOff;
    if (!onOffCluster) {
      device.log('[BUTTON-MGR]   No onOff cluster, skipping');
      return;
    }

    try {
      // Bind cluster (required for commands to reach Homey)
      await onOffCluster.bind();
      device.log('[BUTTON-MGR]  onOff cluster bound');
      device._buttonConfig.clustersAttached.push('onOff');
    } catch (err) {
      device.error('[BUTTON-MGR]   Failed to bind onOff cluster:', err.message);
      // Continue anyway - some buttons work without explicit bind
    }

    // Listen for commands (NOT attributes!)
    // TS0041: On=single, Off=double, Toggle=long
    // Other models may vary

    onOffCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR]  onOff command: ${commandName}`, payload);

      switch (commandName) {
      case 'on':
      case 'commandOn':
        ButtonRemoteManager.triggerFlow(device, 1, 'single');
        break;
      case 'off':
      case 'commandOff':
        ButtonRemoteManager.triggerFlow(device, 1, 'double');
        break;
      case 'toggle':
      case 'commandToggle':
        ButtonRemoteManager.triggerFlow(device, 1, 'long');
        break;
      default:
        device.log(`[BUTTON-MGR]   Unknown onOff command: ${commandName}`);
      }
    });

    device.log('[BUTTON-MGR]  Listening for onOff commands (single/double/long)');
  }

  /**
   * Attach to levelControl cluster (commands: MoveWithOnOff, StepWithOnOff)
   */
  static async _attachLevelControlCluster(device, endpoint, buttonCount) {
    const levelCluster = endpoint.clusters.levelControl;
    if (!levelCluster) {
      device.log('[BUTTON-MGR]   No levelControl cluster, skipping');
      return;
    }

    try {
      await levelCluster.bind();
      device.log('[BUTTON-MGR]  levelControl cluster bound');
      device._buttonConfig.clustersAttached.push('levelControl');
    } catch (err) {
      device.error('[BUTTON-MGR]   Failed to bind levelControl:', err.message);
    }

    levelCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR]  levelControl command: ${commandName}`, payload);

      switch (commandName) {
      case 'moveWithOnOff':
      case 'move':
        if (payload && payload.moveMode === 0) {
          ButtonRemoteManager.triggerFlow(device, 1, 'dim_up');
        } else {
          ButtonRemoteManager.triggerFlow(device, 1, 'dim_down');
        }
        break;
      case 'stepWithOnOff':
      case 'step':
        if (payload && payload.stepMode === 0) {
          ButtonRemoteManager.triggerFlow(device, 1, 'dim_up_step');
        } else {
          ButtonRemoteManager.triggerFlow(device, 1, 'dim_down_step');
        }
        break;
      case 'stop':
      case 'stopWithOnOff':
        ButtonRemoteManager.triggerFlow(device, 1, 'dim_stop');
        break;
      default:
        device.log(`[BUTTON-MGR]   Unknown level command: ${commandName}`);
      }
    });

    device.log('[BUTTON-MGR]  Listening for levelControl commands (dim up/down)');
  }

  /**
   * Attach to scenes cluster (commands: RecallScene, StoreScene)
   */
  static async _attachScenesCluster(device, endpoint, buttonCount) {
    const scenesCluster = endpoint.clusters.scenes;
    if (!scenesCluster) {
      device.log('[BUTTON-MGR]   No scenes cluster, skipping');
      return;
    }

    try {
      await scenesCluster.bind();
      device.log('[BUTTON-MGR]  scenes cluster bound');
      device._buttonConfig.clustersAttached.push('scenes');
    } catch (err) {
      device.error('[BUTTON-MGR]   Failed to bind scenes:', err.message);
    }

    scenesCluster.on('command', (commandName, payload) => {
      device.log(`[BUTTON-MGR]  scenes command: ${commandName}`, payload);

      if (commandName === 'recallScene' && payload && payload.sceneId !== undefined) {
        const sceneId = payload.sceneId;
        ButtonRemoteManager.triggerFlow(device, 1, `scene_${sceneId}`);
      }
    });

    device.log('[BUTTON-MGR]  Listening for scenes commands');
  }

  /**
   * Trigger Homey flow card
   *
   * @param {Object} device - Homey device
   * @param {Number} button - Button number (1-4)
   * @param {String} scene - Scene name (single, double, long, dim_up, scene_1, etc.)
   */
  static triggerFlow(device, button, scene) {
    device.log(`[BUTTON-MGR]  Triggering flow: button=${button}, scene=${scene}`);

    const triggerCard = device.homey.flow.getTriggerCard('remote_button_pressed');
    if (!triggerCard) {
      device.error('[BUTTON-MGR]  Flow trigger card "remote_button_pressed" not found!');
      device.error('[BUTTON-MGR]    Make sure app.json has this trigger card defined');
      return;
    }

    triggerCard
      .trigger(device, {}, { button, scene })
      .then(() => {
        device.log(`[BUTTON-MGR]  Flow triggered: button ${button}, scene ${scene}`);
      })
      .catch(err => {
        device.error('[BUTTON-MGR]  Error triggering flow:', err);
      });
  }

  /**
   * Detach button manager (cleanup)
   */
  static detach(device) {
    device.log('[BUTTON-MGR]  Detaching ButtonRemoteManager...');

    if (device._buttonConfig) {
      delete device._buttonConfig;
    }

    device.log('[BUTTON-MGR]  ButtonRemoteManager detached');
  }
}

module.exports = ButtonRemoteManager;

