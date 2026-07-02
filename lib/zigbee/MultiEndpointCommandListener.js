'use strict';

/**
 * MultiEndpointCommandListener - Listen for commands on ALL endpoints.
 *
 * Critical for multi-gang devices, remotes, and button variants that expose
 * clusters under SDK aliases (onOff/genOnOff/6) or direct event names.
 */

const CLUSTER_ALIASES = Object.freeze({
  onOff: ['onOff', 'genOnOff', 6, '6'],
  levelControl: ['levelControl', 'genLevelCtrl', 'genLevelControl', 8, '8'],
  scenes: ['scenes', 'genScenes', 5, '5'],
  multistateInput: ['multistateInput', 'genMultistateInput', 18, '18'],
});

const DIRECT_EVENTS = Object.freeze({
  onOff: [
    'on', 'off', 'toggle',
    'setOn', 'setOff', 'setToggle',
    'commandOn', 'commandOff', 'commandToggle',
    'commandOnWithTimedOff', 'commandOffWithEffect',
  ],
  scenes: ['recall', 'recallScene', 'commandRecall', 'commandRecallScene', 'attr.currentScene'],
  levelControl: [
    'step', 'stepWithOnOff',
    'move', 'moveWithOnOff',
    'stop', 'stopWithOnOff',
    'moveToLevel', 'moveToLevelWithOnOff',
  ],
  multistateInput: ['attr.presentValue', 'presentValue', 'report'],
});

class MultiEndpointCommandListener {

  constructor(device) {
    this.device = device;
    this.listeners = new Map();
    this._lastDispatch = new Map();
    this._dedupWindowMs = 150;
  }

  /**
   * Setup command listeners on all endpoints.
   * @param {ZCLNode} zclNode
   * @param {Object} options
   * @param {Array} options.clusters - Clusters to listen to
   * @param {Function} options.onCommand - Callback: (epId, clusterName, command, payload) => {}
   */
  async setupListeners(zclNode, options = {}) {
    if (!zclNode) {
      this.device.error('[CMD-LISTENER] zclNode not available');
      return false;
    }

    this.cleanup({ silent: true });

    const {
      clusters = ['onOff', 'levelControl', 'scenes', 'multistateInput'],
      onCommand = null,
    } = options;

    this.device.log('[CMD-LISTENER] Setting up command listeners on all endpoints...');
    this.device.log('[CMD-LISTENER] Monitoring clusters:', clusters.join(', '));

    let listenerCount = 0;

    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      if (epId === 'getDeviceEndpoint' || !endpoint || typeof endpoint !== 'object' || !endpoint.clusters) continue;
      this.device.log(`[CMD-LISTENER] Checking endpoint ${epId}...`);

      for (const clusterName of clusters) {
        const cluster = this._getCluster(endpoint, clusterName);

        if (!cluster) {
          this.device.log(`[CMD-LISTENER]   - ${clusterName}: not present`);
          continue;
        }

        try {
          this.device.log(`[CMD-LISTENER]   - ${clusterName}: bind skipped (SDK3 direct events)`);

          const commandListener = (commandName, commandPayload) => {
            this._emitCommand(epId, clusterName, commandName, commandPayload, onCommand, 'command');
          };
          this._registerListener(epId, clusterName, cluster, 'command', commandListener);
          listenerCount++;

          const attrListener = (attrName, value) => {
            this.device.log(`[CMD-LISTENER] EP${epId} ${clusterName}.${attrName} = ${value}`);
          };
          this._registerListener(epId, clusterName, cluster, 'attr.report', attrListener);
          listenerCount++;

          for (const eventName of DIRECT_EVENTS[clusterName] || []) {
            const directListener = (payload) => {
              this._emitCommand(epId, clusterName, eventName, payload, onCommand, eventName);
            };
            this._registerListener(epId, clusterName, cluster, eventName, directListener);
            listenerCount++;
          }

          this.device.log(`[CMD-LISTENER]   - ${clusterName}: active`);
        } catch (err) {
          this.device.error(`[CMD-LISTENER]   - ${clusterName}: setup failed:`, err.message);
        }
      }
    }

    this.device.log(`[CMD-LISTENER] Setup complete - ${listenerCount} listeners active`);
    return listenerCount > 0;
  }

  _getCluster(endpoint, clusterName) {
    const clusters = endpoint?.clusters || {};
    const candidates = CLUSTER_ALIASES[clusterName] || [clusterName];
    for (const candidate of candidates) {
      if (clusters[candidate]) return clusters[candidate];
    }
    return null;
  }

  _registerListener(epId, clusterName, cluster, event, listener) {
    if (typeof cluster?.on !== 'function') return;
    cluster.on(event, listener);
    this.listeners.set(`${epId}_${clusterName}_${event}_${this.listeners.size}`, { cluster, listener, event });
  }

  _emitCommand(epId, clusterName, commandName, payload, onCommand, sourceEvent) {
    const command = this._normalizeCommandName(clusterName, commandName);
    const metaPayload = this._withMeta(payload, commandName, sourceEvent);
    const key = `${epId}:${clusterName}:${command}:${this._payloadKey(metaPayload)}`;
    const now = Date.now();

    if (now - (this._lastDispatch.get(key) || 0) < this._dedupWindowMs) return;
    this._lastDispatch.set(key, now);

    this.device.log(`[CMD-LISTENER] EP${epId} ${clusterName}.${command}`, metaPayload);
    if (onCommand) onCommand(parseInt(epId, 10), clusterName, command, metaPayload);
  }

  _normalizeCommandName(clusterName, commandName) {
    const name = String(commandName || '').trim();
    const lower = name.toLowerCase();

    if (clusterName === 'onOff') {
      if (lower.includes('on')) return 'on';
      if (lower.includes('off')) return 'off';
      if (lower.includes('toggle')) return 'toggle';
    }

    if (clusterName === 'scenes') {
      if (lower.includes('recall')) return 'recall';
      if (lower.includes('currentscene')) return 'recall';
    }

    if (clusterName === 'multistateInput') {
      if (lower.includes('presentvalue') || lower === 'report') return 'presentValue';
    }

    return name || 'unknown';
  }

  _withMeta(payload, rawCommand, sourceEvent) {
    if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
      return { ...payload, _rawCommand: rawCommand, _sourceEvent: sourceEvent };
    }
    return { value: payload, _rawCommand: rawCommand, _sourceEvent: sourceEvent };
  }

  _payloadKey(payload) {
    const raw = payload?._rawCommand || '';
    const value = payload?.sceneId ?? payload?.scene ?? payload?.presentValue ?? payload?.value ?? '';
    return `${raw}:${value}`;
  }

  /**
   * Cleanup all listeners.
   */
  cleanup({ silent = false } = {}) {
    if (!silent) this.device.log(`[CMD-LISTENER] Cleaning up ${this.listeners.size} listeners...`);

    for (const [key, { cluster, listener, event }] of this.listeners.entries()) {
      try {
        if (typeof cluster?.removeListener === 'function') {
          cluster.removeListener(event, listener);
        } else if (typeof cluster?.off === 'function') {
          cluster.off(event, listener);
        }
      } catch (err) {
        this.device.error(`[CMD-LISTENER] Failed to remove listener ${key}:`, err.message);
      }
    }

    this.listeners.clear();
    this._lastDispatch.clear();
    if (!silent) this.device.log('[CMD-LISTENER] Cleanup complete');
  }
}

module.exports = MultiEndpointCommandListener;
