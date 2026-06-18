'use strict';

/**
 * Network Topology Trigger - FEATURE #48
 *
 * Triggers flows based on Zigbee network topology changes:
 * - Device joined/left network
 * - Router count changed (mesh health)
 * - Signal quality changes
 * - Network congestion events
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class NetworkTopologyTrigger extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Network state
    this.devices = new Map(); // ieeeAddr -> { modelId, manufacturerName, type, signalQuality, lastSeen, parentAddr }
    this.routers = new Set();
    this.endDevices = new Set();
    this.coordinatorAddr = options.coordinatorAddr || null;

    // History
    this.joinHistory = []; // { ieeeAddr, timestamp, type }
    this.leaveHistory = [];
    this.maxHistory = options.maxHistory || 200;

    // Thresholds
    this.signalWeakThreshold = options.signalWeakThreshold || -85; // dBm
    this.signalCriticalThreshold = options.signalCriticalThreshold || -95;
  }

  /**
   * Register topology flow cards
   */
  async registerFlowCards() {
    // Device joined network
    const joinedCard = this.homey.flow.getTriggerCard('network_device_joined');
    if (joinedCard) {
      joinedCard.registerRunListener(async (args, state) => {
        return state && state.ieeeAddr ? {
          ieeeAddr: state.ieeeAddr,
          modelId: state.modelId,
          manufacturerName: state.manufacturerName,
          deviceType: state.type
        } : false;
      });
    }

    // Device left network
    const leftCard = this.homey.flow.getTriggerCard('network_device_left');
    if (leftCard) {
      leftCard.registerRunListener(async (args, state) => {
        return state && state.ieeeAddr ? {
          ieeeAddr: state.ieeeAddr,
          modelId: state.modelId
        } : false;
      });
    }

    // Router count changed
    const routerCard = this.homey.flow.getTriggerCard('network_router_count_changed');
    if (routerCard) {
      routerCard.registerRunListener(async (args, state) => {
        return state ? {
          previousCount: state.previousCount,
          currentCount: state.currentCount
        } : false;
      });
    }

    // Signal quality warning
    const signalCard = this.homey.flow.getTriggerCard('network_signal_weak');
    if (signalCard) {
      signalCard.registerRunListener(async (args, state) => {
        return state && state.signalQuality <= this.signalWeakThreshold ? {
          ieeeAddr: state.ieeeAddr,
          signalQuality: state.signalQuality
        } : false;
      });
    }

    this.homey.log('[NetworkTopology] Flow cards registered');
  }

  /**
   * Record a device joining the network
   */
  deviceJoined(ieeeAddr, metadata = {}) {
    const wasKnown = this.devices.has(ieeeAddr);

    const device = {
      ieeeAddr,
      modelId: metadata.modelId || null,
      manufacturerName: metadata.manufacturerName || null,
      type: metadata.type || 'end_device', // router | end_device
      signalQuality: metadata.signalQuality || null,
      lastSeen: Date.now(),
      parentAddr: metadata.parentAddr || this.coordinatorAddr,
      joinedAt: this.devices.get(ieeeAddr)?.joinedAt || Date.now()
    };

    this.devices.set(ieeeAddr, device);

    if (device.type === 'router') {
      this.routers.add(ieeeAddr);
    } else {
      this.endDevices.add(ieeeAddr);
    }

    this.joinHistory.push({ ieeeAddr, timestamp: Date.now(), type: device.type, wasKnown });
    if (this.joinHistory.length > this.maxHistory) {
      this.joinHistory.shift();
    }

    const previousRouterCount = this.routers.size;
    this.emit('deviceJoined', device);

    if (!wasKnown) {
      this._triggerFlow('network_device_joined', {
        ieeeAddr,
        modelId: device.modelId,
        manufacturerName: device.manufacturerName,
        deviceType: device.type
      });
    }

    return device;
  }

  /**
   * Record a device leaving the network
   */
  deviceLeft(ieeeAddr) {
    const device = this.devices.get(ieeeAddr);
    if (!device) return;

    this.devices.delete(ieeeAddr);
    this.routers.delete(ieeeAddr);
    this.endDevices.delete(ieeeAddr);

    this.leaveHistory.push({ ieeeAddr, timestamp: Date.now(), modelId: device.modelId });
    if (this.leaveHistory.length > this.maxHistory) {
      this.leaveHistory.shift();
    }

    const previousRouterCount = this.routers.size + 1;
    this.emit('deviceLeft', { ieeeAddr, modelId: device.modelId });

    this._triggerFlow('network_device_left', {
      ieeeAddr,
      modelId: device.modelId
    });

    if (this.routers.size !== previousRouterCount) {
      this._triggerFlow('network_router_count_changed', {
        previousCount: previousRouterCount,
        currentCount: this.routers.size
      });
    }
  }

  /**
   * Update signal quality for a device
   */
  updateSignalQuality(ieeeAddr, signalQuality) {
    const device = this.devices.get(ieeeAddr);
    if (!device) return;

    device.signalQuality = signalQuality;
    device.lastSeen = Date.now();

    if (signalQuality <= this.signalCriticalThreshold) {
      this.emit('signalCritical', { ieeeAddr, signalQuality });
      this._triggerFlow('network_signal_weak', { ieeeAddr, signalQuality });
    } else if (signalQuality <= this.signalWeakThreshold) {
      this.emit('signalWeak', { ieeeAddr, signalQuality });
    }
  }

  /**
   * Get network topology summary
   */
  getTopology() {
    return {
      deviceCount: this.devices.size,
      routerCount: this.routers.size,
      endDeviceCount: this.endDevices.size,
      coordinatorAddr: this.coordinatorAddr,
      devices: Array.from(this.devices.values()).map(d => ({
        ieeeAddr: d.ieeeAddr,
        modelId: d.modelId,
        type: d.type,
        signalQuality: d.signalQuality,
        lastSeen: d.lastSeen,
        timeSinceLastSeen: Date.now() - d.lastSeen,
        parentAddr: d.parentAddr
      })),
      recentJoins: this.joinHistory.slice(-10),
      recentLeaves: this.leaveHistory.slice(-10)
    };
  }

  /**
   * Get mesh health assessment
   */
  getMeshHealth() {
    const routers = Array.from(this.devices.values()).filter(d => d.type === 'router');
    const avgSignal = routers
      .filter(d => d.signalQuality !== null)
      .reduce((sum, d) => sum + d.signalQuality, 0) / (routers.length || 1);

    const weakDevices = Array.from(this.devices.values())
      .filter(d => d.signalQuality && d.signalQuality <= this.signalWeakThreshold);

    return {
      routerCount: routers.length,
      averageSignal: Math.round(avgSignal),
      weakDeviceCount: weakDevices.length,
      weakDevices: weakDevices.map(d => ({ ieeeAddr: d.ieeeAddr, signal: d.signalQuality })),
      healthScore: this._calculateHealthScore()
    };
  }

  _calculateHealthScore() {
    if (this.devices.size === 0) return 0;

    const routerRatio = this.routers.size / this.devices.size;
    const signals = Array.from(this.devices.values())
      .filter(d => d.signalQuality !== null)
      .map(d => Math.max(0, (d.signalQuality + 100) / 100)); // Normalize -100..0 to 0..1
    const avgSignal = signals.length > 0 ? signals.reduce((a, b) => a + b, 0) / signals.length : 0.5;

    return Math.round((routerRatio * 50 + avgSignal * 50) * 100) / 100;
  }

  async _triggerFlow(triggerId, tokens) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard(triggerId);
      if (card) {
        await card.trigger({}, tokens).catch(() => {});
      }
    } catch (err) {
      // Flow card may not exist
    }
  }

  destroy() {
    this.devices.clear();
    this.routers.clear();
    this.endDevices.clear();
    this.joinHistory = [];
    this.leaveHistory = [];
  }
}

module.exports = NetworkTopologyTrigger;
