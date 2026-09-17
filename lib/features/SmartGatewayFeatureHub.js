'use strict';

/**
 * SmartGatewayFeatureHub (P2563) — branding-free orchestration of community smart features.
 * Boots Soft Daylight Fade + Lamp Mesh Occupancy; wraps DaylightAtmosphere.
 * MASTER_ONLY — do not wholesale-port to stable-v5.
 */

const SoftDaylightFade = require('./SoftDaylightFade');
const LampMeshOccupancy = require('./LampMeshOccupancy');
const DaylightAtmosphere = require('./DaylightAtmosphere');

class SmartGatewayFeatureHub {
  constructor(app) {
    this.app = app;
    this.homey = app?.homey;
    this.mesh = null;
    this._started = false;
  }

  start() {
    if (this._started || !this.app) return this;
    this._started = true;
    try {
      this.mesh = new LampMeshOccupancy(this.app, { pollMs: 8000, minLights: 2 });
      this.mesh.on('occupancy', (ev) => {
        this.app.log?.(`[LAMP-MESH] zone=${ev.zoneId} occupied=${ev.occupied} score=${ev.score} (${ev.source})`);
        this._fireOccupancyTrigger(ev).catch(() => {});
      });
      this.mesh.start();
    } catch (e) {
      this.app.error?.('[SmartGatewayFeatureHub] mesh start failed:', e.message);
    }
    return this;
  }

  stop() {
    try { this.mesh?.destroy?.(); } catch (_e) { /* */ }
    this.mesh = null;
    this._started = false;
  }

  async _fireOccupancyTrigger(ev) {
    try {
      const card = this.homey?.flow?.getTriggerCard?.('lamp_mesh_occupancy_changed');
      if (card && typeof card.trigger === 'function') {
        await card.trigger({
          zone: String(ev.zoneId || ''),
          occupied: !!ev.occupied,
          score: Number(ev.score) || 0,
          source: String(ev.source || 'mesh_soft'),
        });
      }
    } catch (_e) { /* soft */ }
  }

  /** Soft Daylight Fade on one light */
  startSoftDaylightFade(light, opts = {}) {
    return SoftDaylightFade.startOnDevice(this.app, light, opts);
  }

  stopSoftDaylightFade(light) {
    return SoftDaylightFade.stopOnDevice(this.app, light);
  }

  computeAtmosphere(opts = {}) {
    return DaylightAtmosphere.compute({
      ...opts,
      solar: opts.solar || this.app?.solarElevation,
    });
  }

  enrollMeshZone(zoneId, lights) {
    if (!this.mesh) this.start();
    return this.mesh.enrollZone(zoneId, lights);
  }

  snapshot() {
    return {
      mesh: this.mesh?.snapshot?.() || null,
      atmosphereNow: this.computeAtmosphere(),
    };
  }
}

module.exports = SmartGatewayFeatureHub;
