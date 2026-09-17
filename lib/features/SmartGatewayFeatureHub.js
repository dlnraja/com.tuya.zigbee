'use strict';

/**
 * SmartGatewayFeatureHub (P2563/P2564) — full branding-free gateway smart features.
 * Soft Daylight Fade (auto) + Lamp Mesh Occupancy (full soft) + Soft Ambient Sync.
 * MASTER_ONLY — do not wholesale-port to stable-v5.
 */

const SoftDaylightFade = require('./SoftDaylightFade');
const LampMeshOccupancy = require('./LampMeshOccupancy');
const SoftAmbientSync = require('./SoftAmbientSync');
const DaylightAtmosphere = require('./DaylightAtmosphere');

class SmartGatewayFeatureHub {
  constructor(app) {
    this.app = app;
    this.homey = app?.homey;
    this.mesh = null;
    this.ambient = null;
    this._started = false;
  }

  start() {
    if (this._started || !this.app) return this;
    this._started = true;
    try {
      this.mesh = new LampMeshOccupancy(this.app, { pollMs: 5000, minLights: 2 });
      this.mesh.on('occupancy', (ev) => {
        this.app.log?.(`[LAMP-MESH] zone=${ev.zoneId} occupied=${ev.occupied} score=${ev.score} (${ev.source})`);
        this._fireOccupancyTrigger(ev).catch(() => {});
      });
      this.mesh.start();
    } catch (e) {
      this.app.error?.('[SmartGatewayFeatureHub] mesh start failed:', e.message);
    }
    try {
      this.ambient = new SoftAmbientSync(this.app, { maxLights: 4, minIntervalMs: 2000 });
    } catch (e) {
      this.app.error?.('[SmartGatewayFeatureHub] ambient start failed:', e.message);
    }
    return this;
  }

  stop() {
    try { this.mesh?.destroy?.(); } catch (_e) { /* */ }
    try { this.ambient?.destroy?.(); } catch (_e) { /* */ }
    this.mesh = null;
    this.ambient = null;
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
          source: String(ev.source || 'mesh_full'),
        });
      }
    } catch (_e) { /* soft */ }
  }

  _ensure() {
    if (!this._started) this.start();
  }

  startSoftDaylightFade(light, opts = {}) {
    return SoftDaylightFade.startOnDevice(this.app, light, opts);
  }

  stopSoftDaylightFade(light) {
    return SoftDaylightFade.stopOnDevice(this.app, light);
  }

  enableSoftDaylightAuto(light, opts = {}) {
    return SoftDaylightFade.enableAuto(this.app, light, opts);
  }

  disableSoftDaylightAuto(light) {
    return SoftDaylightFade.disableAuto(this.app, light);
  }

  startDawnRamp(light, opts = {}) {
    return SoftDaylightFade.startDawnRamp(this.app, light, opts);
  }

  startDuskFade(light, opts = {}) {
    return SoftDaylightFade.startDuskFade(this.app, light, opts);
  }

  computeAtmosphere(opts = {}) {
    return DaylightAtmosphere.compute({
      ...opts,
      solar: opts.solar || this.app?.solarElevation,
    });
  }

  enrollMeshZone(zoneId, lights, extra) {
    this._ensure();
    return this.mesh.enrollZone(zoneId, lights, extra);
  }

  enrollMeshSensors(zoneId, sensors) {
    this._ensure();
    return this.mesh.enrollSensors(zoneId, sensors);
  }

  autoEnrollMesh(zoneId, opts) {
    this._ensure();
    return this.mesh.autoEnrollMainsLights(zoneId, opts);
  }

  isMeshOccupied(zoneId) {
    return !!this.mesh?.isOccupied?.(zoneId);
  }

  applySoftAmbient(lights, color, opts) {
    this._ensure();
    return this.ambient.apply(lights, color, opts);
  }

  stopSoftAmbient() {
    this.ambient?.stopAll?.();
  }

  snapshot() {
    return {
      mesh: this.mesh?.snapshot?.() || null,
      ambient: this.ambient?.snapshot?.() || null,
      atmosphereNow: this.computeAtmosphere(),
    };
  }
}

module.exports = SmartGatewayFeatureHub;
