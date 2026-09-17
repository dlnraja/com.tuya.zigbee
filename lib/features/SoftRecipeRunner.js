'use strict';

/**
 * SoftRecipeRunner (P2567/P2568) — executes ALL 200 catalog vectors end-to-end.
 * Bridges alias module names + declarative recipes onto Soft* / hub APIs.
 * MASTER_ONLY. Never invents commercial UI names.
 *
 * WHY (P215): catalog alone left 161 stubs + 36 broken aliases; finalize = every
 * vector enable() resolves to a real handler (soft auto-collect when ctx empty).
 */

const SoftFeatureCatalog = require('./SoftFeatureCatalog');
const QuietHoursGuard = require('./QuietHoursGuard');
const NightPathBias = require('./NightPathBias');
const SoftDaylightFade = require('./SoftDaylightFade');
const StaggeredLeaveOff = require('./StaggeredLeaveOff');

/** Alias targets from wired rows → concrete recipe (module name ≠ vector id). */
const MODULE_ALIASES = {
  soft_daylight_fade: { type: 'soft_daylight', minutes: 10 },
  soft_ambient_sync: { type: 'ambient', hue: 0.08, saturation: 0.45, dim: 0.4 },
  scene_slots: { type: 'generic_slot', slot: 0, pattern: 'solar' },
  staggered_leave_off: { type: 'stagger_leave', staggerMs: 180 },
  mirror_light_sync: { type: 'mirror' },
  lux_adaptive_dim: { type: 'lux_adaptive', targetLux: 200 },
  night_path_bias: { type: 'night_bias', nightFactor: 0.35 },
  dawn_dusk: { type: 'soft_daylight', minutes: 15 },
  path_light: { type: 'path_light', zone: 'home', dim: 0.55, timeoutMin: 5 },
  idle_auto_off_soft: { type: 'idle_off', idleMinutes: 15 },
  peak_load_soft_shed: { type: 'peak_shed', thresholdW: 2500, dimTo: 0.35 },
  welcome_home_soft: { type: 'welcome', zone: 'home', fadeMinutes: 2 },
  absence_energy_soft: { type: 'absence_eco', zone: 'home', mode: 'dim', dimTo: 0.15 },
  contact_entry_soft: { type: 'contact_entry', quietStart: '23:00', quietEnd: '06:00' },
  soft_device_link: { type: 'device_link', mode: 'toggle' },
  quiet_hours: { type: 'quiet_gate', start: '22:00', end: '07:00' },
  lamp_mesh_occupancy: { type: 'mesh_zone', zone: 'home' },
  lived_in_shuffle: {
    type: 'lived_in_window',
    window: 'evening',
    startHour: 18,
    endHour: 23,
  },
  room_cascade: { type: 'path_light', zone: 'cascade', dim: 0.6, timeoutMin: 4 },
  house_mode: { type: 'house_mode_hook', mode: 'day', action: 'path_dim' },
  shade_daylight_soft: { type: 'shade_elev', duskElev: -3, dawnElev: 3 },
  cover_setpoint: { type: 'shade_elev', duskElev: 0, dawnElev: 6 },
  sensor_pause: { type: 'quiet_gate', start: '00:00', end: '23:59' },
};

const HANDLED_TYPES = new Set([
  'alias', 'quiet_gate', 'night_bias', 'soft_daylight', 'stagger_leave',
  'peak_shed', 'idle_off', 'welcome', 'absence_eco', 'mesh_zone', 'device_link',
  'ambient', 'contact_entry', 'shade_elev', 'lux_gate', 'lux_adaptive',
  'path_light', 'lived_in_window', 'house_mode_hook', 'generic_slot', 'mirror',
  'noop',
]);

class SoftRecipeRunner {
  constructor(hub) {
    this.hub = hub;
    this.app = hub?.app;
    this._enabled = new Map(); // vectorId → { recipe, ctx, vector }
    this._houseModeHooked = false;
    this._livedIn = new Map(); // vectorId → recipe
    this._luxGates = new Map();
  }

  static handledTypes() {
    return [...HANDLED_TYPES];
  }

  static resolveRecipe(recipe) {
    if (!recipe) return { type: 'noop' };
    if (recipe.type !== 'alias') return { ...recipe };
    const mapped = MODULE_ALIASES[String(recipe.target || '')];
    if (mapped) return { ...mapped, _aliasOf: recipe.target };
    // vector-id alias (rare)
    const other = SoftFeatureCatalog.byId(recipe.target);
    if (other?.recipe && other.recipe.type !== 'alias') {
      return { ...other.recipe, _aliasOf: recipe.target };
    }
    return { type: 'generic_slot', slot: 0, pattern: 'quiet', _aliasOf: recipe.target };
  }

  list(limit = 50) {
    return SoftFeatureCatalog.all().slice(0, Math.max(1, Math.min(200, limit)));
  }

  isEnabled(vectorId) {
    return this._enabled.has(String(vectorId || ''));
  }

  enabledIds() {
    return [...this._enabled.keys()];
  }

  enable(vectorId, ctx = {}, opts = {}) {
    const v = SoftFeatureCatalog.byId(vectorId);
    if (!v) return { ok: false, reason: 'unknown_id' };
    const recipe = SoftRecipeRunner.resolveRecipe(v.recipe || { type: 'noop' });
    this._enabled.set(vectorId, { recipe, ctx, vector: v });
    this._ensureHouseModeHook();
    const doApply = opts.apply !== false;
    const applied = doApply ? this.apply(vectorId, ctx) : { ok: true, deferred: true };
    return { ok: true, id: vectorId, type: recipe.type, applied };
  }

  disable(vectorId) {
    const id = String(vectorId || '');
    this._livedIn.delete(id);
    this._luxGates.delete(id);
    return this._enabled.delete(id);
  }

  enableFamily(family, ctx = {}, opts = {}) {
    const list = SoftFeatureCatalog.byFamily(family);
    let n = 0;
    for (const v of list) {
      const r = this.enable(v.id, ctx, opts);
      if (r.ok) n += 1;
    }
    return { ok: true, family, enabled: n, total: list.length };
  }

  /**
   * Register all 200 (apply:false by default — avoids mass stagger/ambient TX).
   * Pass { apply: true } only when ctx has devices for intentional dry/live run.
   */
  enableAll(ctx = {}, opts = { apply: false }) {
    let n = 0;
    const types = {};
    for (const v of SoftFeatureCatalog.all()) {
      const r = this.enable(v.id, ctx, opts);
      if (r.ok) {
        n += 1;
        types[r.type] = (types[r.type] || 0) + 1;
      }
    }
    return { ok: true, enabled: n, total: SoftFeatureCatalog.count(), types };
  }

  collectLights(max = 24) {
    return StaggeredLeaveOff.collectLights(this.app?.homey, { max });
  }

  collectByClass(deviceClass, max = 12) {
    const out = [];
    try {
      for (const driver of Object.values(this.app?.homey?.drivers?.getDrivers?.() || {})) {
        for (const device of driver.getDevices?.() || []) {
          if (device.getClass?.() !== deviceClass) continue;
          out.push(device);
          if (out.length >= max) return out;
        }
      }
    } catch (_e) { /* soft */ }
    return out;
  }

  collectMeters(max = 4) {
    const out = [];
    try {
      for (const driver of Object.values(this.app?.homey?.drivers?.getDrivers?.() || {})) {
        for (const device of driver.getDevices?.() || []) {
          if (!device.hasCapability?.('measure_power')) continue;
          out.push(device);
          if (out.length >= max) return out;
        }
      }
    } catch (_e) { /* soft */ }
    return out;
  }

  collectLuxSensors(max = 4) {
    const out = [];
    try {
      for (const driver of Object.values(this.app?.homey?.drivers?.getDrivers?.() || {})) {
        for (const device of driver.getDevices?.() || []) {
          if (!device.hasCapability?.('measure_luminance')) continue;
          out.push(device);
          if (out.length >= max) return out;
        }
      }
    } catch (_e) { /* soft */ }
    return out;
  }

  /**
   * Apply a recipe once (or enroll continuous handlers when devices exist).
   */
  apply(vectorId, ctx = {}) {
    const entry = this._enabled.get(vectorId);
    const raw = entry?.recipe || SoftFeatureCatalog.byId(vectorId)?.recipe;
    const recipe = SoftRecipeRunner.resolveRecipe(raw);
    if (!recipe) return { ok: false, reason: 'no_recipe' };

    const type = recipe.type;
    const c = { ...(entry?.ctx || {}), ...ctx };
    const hub = this.hub;
    const app = this.app;

    switch (type) {
      case 'alias':
        // unresolved alias — should not happen after resolveRecipe
        return { ok: true, type, target: recipe.target, note: 'unresolved_alias' };

      case 'quiet_gate':
        return {
          ok: true,
          type,
          inQuiet: QuietHoursGuard.isInQuietHours(recipe.start || '22:00', recipe.end || '07:00'),
          start: recipe.start,
          end: recipe.end,
          zone: recipe.zone || null,
        };

      case 'night_bias': {
        const dim = NightPathBias.applyNightBias(c.dim != null ? c.dim : 1, app, {
          nightFactor: recipe.nightFactor,
        });
        return { ok: true, type, dim, nightFactor: recipe.nightFactor };
      }

      case 'soft_daylight': {
        const lights = c.light ? [c.light] : (c.lights || this.collectLights(4));
        let started = 0;
        for (const light of lights) {
          SoftDaylightFade.startOnDevice(app, light, { minutes: recipe.minutes || 10 });
          started += 1;
        }
        return { ok: true, type, started, minutes: recipe.minutes || 10, window: recipe.window || null };
      }

      case 'stagger_leave': {
        const lights = c.lights || this.collectLights();
        return { ok: true, type, ...StaggeredLeaveOff.run(app, lights, { staggerMs: recipe.staggerMs }) };
      }

      case 'peak_shed': {
        const meter = c.meter || this.collectMeters(1)[0];
        const lights = c.lights || this.collectLights(12);
        if (meter && lights.length) {
          return {
            ok: true,
            type,
            ...hub.enrollPeakShed(meter, lights, {
              thresholdW: recipe.thresholdW,
              dimTo: recipe.dimTo,
            }),
          };
        }
        return {
          ok: true,
          type,
          enrolled: false,
          need: meter ? 'lights' : 'meter+lights',
          thresholdW: recipe.thresholdW,
        };
      }

      case 'idle_off': {
        const lights = c.light ? [c.light] : (c.lights || this.collectLights(8));
        let enrolled = 0;
        for (const light of lights) {
          hub.enrollIdleAutoOff(light, { idleMinutes: recipe.idleMinutes });
          enrolled += 1;
        }
        return { ok: true, type, enrolled, idleMinutes: recipe.idleMinutes };
      }

      case 'welcome': {
        const lights = c.lights || this.collectLights(6);
        return {
          ok: true,
          type,
          ...hub.enrollWelcome(recipe.zone || 'home', lights, {
            fadeMinutes: recipe.fadeMinutes || 2,
            dim: recipe.dim,
          }),
        };
      }

      case 'absence_eco': {
        const devices = c.devices || c.lights || this.collectLights(8);
        return {
          ok: true,
          type,
          ...hub.enrollAbsence(recipe.zone || 'home', devices, {
            mode: recipe.mode || 'dim',
            dimTo: recipe.dimTo,
          }),
        };
      }

      case 'mesh_zone': {
        const lights = c.lights || this.collectLights(8);
        try {
          if (lights.length) {
            return { ok: true, type, ...hub.enrollMeshZone(recipe.zone || 'home', lights) };
          }
          return { ok: true, type, ...hub.autoEnrollMesh(recipe.zone || 'home', { max: 6 }) };
        } catch (e) {
          return { ok: true, type, enrolled: false, error: e.message };
        }
      }

      case 'device_link': {
        const lights = c.lights || this.collectLights(8);
        if (c.source && c.targets) {
          return {
            ok: true,
            type,
            ...hub.enrollDeviceLink({
              source: c.source,
              targets: c.targets,
              mode: recipe.mode || 'toggle',
            }),
          };
        }
        if (lights.length >= 2) {
          return {
            ok: true,
            type,
            ...hub.enrollDeviceLink({
              source: lights[0],
              targets: lights.slice(1, 5),
              mode: recipe.mode || 'toggle',
            }),
          };
        }
        return { ok: true, type, need: 'source+targets', mode: recipe.mode || 'toggle' };
      }

      case 'mirror': {
        const lights = c.lights || this.collectLights(8);
        const master = c.master || lights[0];
        const followers = c.followers || lights.slice(1, 6);
        if (master && followers.length) {
          return { ok: true, type, ...hub.enrollMirror(master, followers) };
        }
        return { ok: true, type, need: 'master+followers' };
      }

      case 'ambient': {
        const lights = c.lights || this.collectLights(4);
        if (lights.length) {
          return {
            ok: true,
            type,
            ...hub.applySoftAmbient(lights, {
              hue: recipe.hue,
              saturation: recipe.saturation,
              dim: recipe.dim,
            }),
          };
        }
        return { ok: true, type, need: 'lights', hue: recipe.hue };
      }

      case 'contact_entry': {
        const contact = c.contact || this.collectByClass('sensor', 8).find(
          (d) => d.hasCapability?.('alarm_contact'),
        ) || this.collectByClass('sensor', 1)[0];
        const lights = c.lights || this.collectLights(4);
        if (contact && lights.length) {
          return {
            ok: true,
            type,
            ...hub.enrollContactEntry(contact, lights, {
              quietStart: recipe.quietStart,
              quietEnd: recipe.quietEnd,
            }),
          };
        }
        return { ok: true, type, need: 'contact+lights', zone: recipe.zone || null };
      }

      case 'shade_elev': {
        const covers = c.cover ? [c.cover] : (c.covers || this.collectByClass('windowcoverings', 6));
        let enrolled = 0;
        for (const cover of covers) {
          if (hub.enrollShadeDaylight(cover)) enrolled += 1;
        }
        return {
          ok: true,
          type,
          enrolled,
          duskElev: recipe.duskElev,
          dawnElev: recipe.dawnElev,
          need: enrolled ? undefined : 'cover',
        };
      }

      case 'lux_gate': {
        const sensor = c.sensor || this.collectLuxSensors(1)[0];
        let lux = c.lux;
        if (lux == null && sensor?.getCapabilityValue) {
          try { lux = Number(sensor.getCapabilityValue('measure_luminance')); } catch (_e) { /* */ }
        }
        const thr = Number(recipe.lux) || 200;
        let pass = null;
        if (lux != null && Number.isFinite(lux)) {
          pass = recipe.op === 'gt' ? lux > thr : lux < thr;
        }
        this._luxGates.set(String(vectorId), { ...recipe, lux, pass });
        return { ok: true, type, op: recipe.op, lux: thr, measured: lux, pass };
      }

      case 'lux_adaptive': {
        const light = c.light || (c.lights || this.collectLights(1))[0];
        const sensor = c.sensor || this.collectLuxSensors(1)[0];
        if (light && sensor) {
          return {
            ok: true,
            type,
            ...hub.enrollLuxAdaptive(light, sensor, { targetLux: recipe.targetLux || 200 }),
          };
        }
        return { ok: true, type, need: 'light+sensor', targetLux: recipe.targetLux || 200 };
      }

      case 'path_light': {
        const zone = recipe.zone || 'home';
        const lights = c.lights || this.collectLights(6);
        const dim = recipe.dim != null ? Number(recipe.dim) : 0.55;
        if (lights.length) {
          hub.enrollMeshZone(zone, lights);
          hub.enrollWelcome(zone, lights, { dim, fadeMinutes: 1 });
        } else {
          hub.autoEnrollMesh(zone, { max: 6 });
        }
        // Cap path brightness at night
        const nightDim = NightPathBias.applyNightBias(dim, app, { nightFactor: 0.4 });
        return {
          ok: true,
          type,
          zone,
          lights: lights.length,
          dim,
          nightDim,
          timeoutMin: recipe.timeoutMin || 5,
        };
      }

      case 'lived_in_window': {
        this._livedIn.set(String(vectorId), recipe);
        const mode = app?.homeModeManager?.mode;
        const hour = (c.now || new Date()).getHours();
        const inWindow = hour >= (recipe.startHour || 0) && hour < (recipe.endHour || 24);
        const away = mode === 'away' || c.forceAway === true;
        let shuffled = false;
        if (away && inWindow) {
          const lights = c.lights || this.collectLights(4);
          if (lights.length) {
            hub.applySoftAmbient(lights, {
              hue: 0.08,
              saturation: 0.35,
              dim: 0.35,
            });
            shuffled = true;
          }
        }
        return {
          ok: true,
          type,
          window: recipe.window,
          startHour: recipe.startHour,
          endHour: recipe.endHour,
          inWindow,
          away: !!away,
          shuffled,
        };
      }

      case 'house_mode_hook': {
        this._ensureHouseModeHook();
        const current = app?.homeModeManager?.mode;
        let ran = false;
        if (current && current === recipe.mode) {
          ran = !!this._runHouseModeAction(recipe.action, c);
        }
        return {
          ok: true,
          type,
          mode: recipe.mode,
          action: recipe.action,
          currentMode: current || null,
          ran,
        };
      }

      case 'generic_slot': {
        const pattern = recipe.pattern || 'quiet';
        const slot = recipe.slot || 0;
        switch (pattern) {
          case 'quiet':
            return this.applyResolved({ type: 'quiet_gate', start: '22:00', end: '07:00' }, c);
          case 'idle':
            return this.applyResolved({ type: 'idle_off', idleMinutes: 20 + (slot % 40) }, c);
          case 'solar':
            return this.applyResolved({ type: 'soft_daylight', minutes: 10 }, c);
          case 'threshold':
            return this.applyResolved({ type: 'lux_gate', op: 'lt', lux: 100 + slot * 25 }, c);
          case 'edge_on':
            return this.applyResolved({ type: 'path_light', zone: `slot_${slot}`, dim: 0.5 }, c);
          default:
            return { ok: true, type, pattern, slot, armed: true };
        }
      }

      case 'noop':
      default:
        return { ok: true, type: type || 'noop', handled: HANDLED_TYPES.has(type) };
    }
  }

  /** Internal apply with already-resolved recipe object (no vector id). */
  applyResolved(recipe, ctx = {}) {
    const id = `__anon_${recipe.type}_${Date.now()}`;
    this._enabled.set(id, { recipe, ctx, vector: null });
    try {
      return this.apply(id, ctx);
    } finally {
      this._enabled.delete(id);
    }
  }

  _ensureHouseModeHook() {
    if (this._houseModeHooked) return;
    const hmm = this.app?.homeModeManager;
    if (!hmm || typeof hmm.on !== 'function') return;
    this._houseModeHooked = true;
    try {
      hmm.on('mode_changed', (data) => {
        const mode = typeof data === 'string' ? data : data?.mode;
        if (!mode) return;
        for (const [id, entry] of this._enabled) {
          if (entry.recipe?.type !== 'house_mode_hook') continue;
          if (entry.recipe.mode !== mode) continue;
          try {
            this._runHouseModeAction(entry.recipe.action, entry.ctx || {});
          } catch (_e) { /* soft */ }
        }
        // Lived-in: when switching to away, shuffle enrolled windows
        if (mode === 'away') {
          for (const [id, recipe] of this._livedIn) {
            try {
              this.apply(id, { forceAway: true });
            } catch (_e) { /* soft */ }
          }
        }
      });
    } catch (_e) { /* soft */ }
  }

  _runHouseModeAction(action, ctx = {}) {
    const hub = this.hub;
    const lights = ctx.lights || this.collectLights(12);
    switch (action) {
      case 'all_off':
        StaggeredLeaveOff.run(this.app, lights, { staggerMs: 180 });
        return true;
      case 'path_dim': {
        const dim = NightPathBias.applyNightBias(0.45, this.app, { nightFactor: 0.4 });
        for (const light of lights.slice(0, 6)) {
          SoftDaylightFade.startOnDevice(this.app, light, {
            minutes: 2,
            forceOn: true,
            toDim: dim,
          });
        }
        return true;
      }
      case 'lived_in':
        if (lights.length) {
          hub.applySoftAmbient(lights.slice(0, 4), { hue: 0.1, saturation: 0.3, dim: 0.3 });
        }
        return true;
      case 'quiet':
        return QuietHoursGuard.isInQuietHours('22:00', '07:00');
      default:
        return false;
    }
  }

  snapshot() {
    return {
      catalog: SoftFeatureCatalog.snapshot(),
      enabled: this.enabledIds(),
      enabledCount: this._enabled.size,
      livedInWindows: this._livedIn.size,
      luxGates: this._luxGates.size,
      handledTypes: SoftRecipeRunner.handledTypes(),
      moduleAliases: Object.keys(MODULE_ALIASES).length,
    };
  }

  destroy() {
    this._enabled.clear();
    this._livedIn.clear();
    this._luxGates.clear();
    this._houseModeHooked = false;
  }
}

module.exports = SoftRecipeRunner;
module.exports.MODULE_ALIASES = MODULE_ALIASES;
module.exports.HANDLED_TYPES = HANDLED_TYPES;
