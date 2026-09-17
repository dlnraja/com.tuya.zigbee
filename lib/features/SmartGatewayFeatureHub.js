'use strict';

/**
 * SmartGatewayFeatureHub (P2563–P2568) — branding-free gateway smart features.
 * MASTER_ONLY — do not wholesale-port to stable-v5.
 * P2568: SoftRecipeRunner finalizes all 200 Soft Feature vectors end-to-end.
 */

const SoftDaylightFade = require('./SoftDaylightFade');
const LampMeshOccupancy = require('./LampMeshOccupancy');
const SoftAmbientSync = require('./SoftAmbientSync');
const SoftDeviceLink = require('./SoftDeviceLink');
const LuxAdaptiveDim = require('./LuxAdaptiveDim');
const MirrorLightSync = require('./MirrorLightSync');
const StaggeredLeaveOff = require('./StaggeredLeaveOff');
const WelcomeHomeSoft = require('./WelcomeHomeSoft');
const AbsenceEnergySoft = require('./AbsenceEnergySoft');
const ContactEntrySoft = require('./ContactEntrySoft');
const ShadeDaylightSoft = require('./ShadeDaylightSoft');
const PeakLoadSoftShed = require('./PeakLoadSoftShed');
const IdleAutoOffSoft = require('./IdleAutoOffSoft');
const DaylightAtmosphere = require('./DaylightAtmosphere');
const QuietHoursGuard = require('./QuietHoursGuard');
const NightPathBias = require('./NightPathBias');
const SoftRecipeRunner = require('./SoftRecipeRunner');
const SoftFeatureCatalog = require('./SoftFeatureCatalog');

class SmartGatewayFeatureHub {
  constructor(app) {
    this.app = app;
    this.homey = app?.homey;
    this.mesh = null;
    this.ambient = null;
    this.deviceLink = null;
    this.luxDim = null;
    this.mirror = null;
    this.welcome = null;
    this.absence = null;
    this.contactEntry = null;
    this.shadeDaylight = null;
    this.peakShed = null;
    this.idleAutoOff = null;
    this.recipes = null;
    this._started = false;
  }

  start() {
    if (this._started || !this.app) return this;
    this._started = true;
    const boot = (key, factory) => {
      try { this[key] = factory(); } catch (e) {
        this.app.error?.(`[SmartGatewayFeatureHub] ${key} failed:`, e.message);
      }
    };

    boot('mesh', () => {
      const m = new LampMeshOccupancy(this.app, { pollMs: 5000, minLights: 2 });
      m.on('occupancy', (ev) => {
        this.app.log?.(`[LAMP-MESH] zone=${ev.zoneId} occupied=${ev.occupied} score=${ev.score} (${ev.source})`);
        this._fireOccupancyTrigger(ev).catch(() => {});
        this._onMeshOccupancy(ev).catch(() => {});
      });
      m.start();
      return m;
    });
    boot('ambient', () => new SoftAmbientSync(this.app, { maxLights: 4, minIntervalMs: 2000 }));
    boot('deviceLink', () => { const d = new SoftDeviceLink(this.app); d.start(); return d; });
    boot('luxDim', () => new LuxAdaptiveDim(this.app));
    boot('mirror', () => new MirrorLightSync(this.app));
    boot('welcome', () => new WelcomeHomeSoft(this.app));
    boot('absence', () => new AbsenceEnergySoft(this.app));
    boot('contactEntry', () => { const c = new ContactEntrySoft(this.app); c.start(); return c; });
    boot('shadeDaylight', () => new ShadeDaylightSoft(this.app));
    boot('peakShed', () => new PeakLoadSoftShed(this.app));
    boot('idleAutoOff', () => new IdleAutoOffSoft(this.app));
    try {
      this.recipes = new SoftRecipeRunner(this);
      this.app.log?.(`[SmartGateway] SoftFeatureCatalog loaded: ${SoftFeatureCatalog.count()} vectors`);
    } catch (e) {
      this.app.error?.('[SmartGatewayFeatureHub] recipes failed:', e.message);
    }
    return this;
  }

  stop() {
    for (const k of [
      'mesh', 'ambient', 'deviceLink', 'luxDim', 'mirror',
      'contactEntry', 'shadeDaylight', 'peakShed', 'idleAutoOff',
    ]) {
      try { this[k]?.destroy?.(); } catch (_e) { /* */ }
      this[k] = null;
    }
    try { this.recipes?.destroy?.(); } catch (_e) { /* */ }
    this.recipes = null;
    this.welcome = null;
    this.absence = null;
    this._started = false;
  }

  _ensure() {
    if (!this._started) this.start();
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

  async _onMeshOccupancy(ev) {
    if (ev.occupied) {
      const r = await this.welcome?.onOccupied?.(ev.zoneId);
      if (r?.fired) this.app.log?.(`[WELCOME-HOME] zone=${ev.zoneId} lights=${r.lights}`);
    } else {
      const r = await this.absence?.onClear?.(ev.zoneId);
      if (r?.fired) this.app.log?.(`[ABSENCE-ENERGY] zone=${ev.zoneId} mode=${r.mode}`);
    }
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

  enrollDeviceLink(opts) {
    this._ensure();
    return this.deviceLink.enroll(opts);
  }

  enrollLuxAdaptive(light, sensor, opts) {
    this._ensure();
    return this.luxDim.enroll(light, sensor, opts);
  }

  enrollMirror(master, followers) {
    this._ensure();
    return this.mirror.enroll(master, followers);
  }

  enrollWelcome(zoneId, lights, opts) {
    this._ensure();
    return this.welcome.enroll(zoneId, lights, opts);
  }

  enrollAbsence(zoneId, devices, opts) {
    this._ensure();
    return this.absence.enroll(zoneId, devices, opts);
  }

  staggeredLeaveOff(lights, opts) {
    const list = lights?.length
      ? lights
      : StaggeredLeaveOff.collectLights(this.homey);
    return StaggeredLeaveOff.run(this.app, list, opts);
  }

  enrollContactEntry(contact, lights, opts) {
    this._ensure();
    return this.contactEntry.enroll(contact, lights, opts);
  }

  enrollShadeDaylight(cover) {
    this._ensure();
    return this.shadeDaylight.enroll(cover);
  }

  enrollPeakShed(meter, lights, opts) {
    this._ensure();
    return this.peakShed.enroll(meter, lights, opts);
  }

  enrollIdleAutoOff(light, opts) {
    this._ensure();
    return this.idleAutoOff.enroll(light, opts);
  }

  isInQuietHours(start, end, date) {
    return QuietHoursGuard.isInQuietHours(start, end, date);
  }

  applyNightBias(dim, opts) {
    return NightPathBias.applyNightBias(dim, this.app, opts);
  }

  enableSoftFeature(vectorId, ctx, opts) {
    this._ensure();
    return this.recipes?.enable?.(vectorId, ctx, opts) || { ok: false, reason: 'no_runner' };
  }

  disableSoftFeature(vectorId) {
    this._ensure();
    return !!this.recipes?.disable?.(vectorId);
  }

  isSoftFeatureEnabled(vectorId) {
    return !!this.recipes?.isEnabled?.(vectorId);
  }

  enableSoftFeatureFamily(family, ctx, opts) {
    this._ensure();
    return this.recipes?.enableFamily?.(family, ctx, opts)
      || { ok: false, reason: 'no_runner' };
  }

  enableAllSoftFeatures(ctx, opts) {
    this._ensure();
    return this.recipes?.enableAll?.(ctx, opts) || { ok: false, reason: 'no_runner' };
  }

  searchSoftFeatures(q) {
    return SoftFeatureCatalog.search(q);
  }

  softFeatureCount() {
    return SoftFeatureCatalog.count();
  }

  snapshot() {
    return {
      mesh: this.mesh?.snapshot?.() || null,
      ambient: this.ambient?.snapshot?.() || null,
      deviceLink: this.deviceLink?.snapshot?.() || null,
      luxDim: this.luxDim?.snapshot?.() || null,
      mirror: this.mirror?.snapshot?.() || null,
      welcome: this.welcome?.snapshot?.() || null,
      absence: this.absence?.snapshot?.() || null,
      contactEntry: this.contactEntry?.snapshot?.() || null,
      shadeDaylight: this.shadeDaylight?.snapshot?.() || null,
      peakShed: this.peakShed?.snapshot?.() || null,
      idleAutoOff: this.idleAutoOff?.snapshot?.() || null,
      recipes: this.recipes?.snapshot?.() || null,
      softFeatures: SoftFeatureCatalog.snapshot(),
      atmosphereNow: this.computeAtmosphere(),
    };
  }
}

module.exports = SmartGatewayFeatureHub;
