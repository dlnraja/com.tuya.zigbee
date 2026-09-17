'use strict';

/**
 * SoftRecipeRunner (P2567) — executes declarative recipes from the 200-vector catalog.
 * Bridges recipe types onto existing Soft* modules / hub APIs.
 * MASTER_ONLY. Never invents commercial UI names.
 */

const SoftFeatureCatalog = require('./SoftFeatureCatalog');
const QuietHoursGuard = require('./QuietHoursGuard');
const NightPathBias = require('./NightPathBias');
const SoftDaylightFade = require('./SoftDaylightFade');
const StaggeredLeaveOff = require('./StaggeredLeaveOff');

class SoftRecipeRunner {
  constructor(hub) {
    this.hub = hub;
    this.app = hub?.app;
    this._enabled = new Map(); // vectorId → { recipe, ctx }
  }

  list(limit = 50) {
    return SoftFeatureCatalog.all().slice(0, Math.max(1, Math.min(200, limit)));
  }

  enable(vectorId, ctx = {}) {
    const v = SoftFeatureCatalog.byId(vectorId);
    if (!v) return { ok: false, reason: 'unknown_id' };
    this._enabled.set(vectorId, { recipe: v.recipe || { type: 'noop' }, ctx, vector: v });
    const applied = this.apply(vectorId, ctx);
    return { ok: true, id: vectorId, applied };
  }

  disable(vectorId) {
    return this._enabled.delete(String(vectorId || ''));
  }

  /**
   * Apply a recipe once (or enroll continuous handlers when ctx has devices).
   */
  apply(vectorId, ctx = {}) {
    const entry = this._enabled.get(vectorId) || {
      recipe: SoftFeatureCatalog.byId(vectorId)?.recipe,
      ctx,
    };
    const recipe = entry?.recipe;
    if (!recipe) return { ok: false, reason: 'no_recipe' };

    const type = recipe.type;
    const c = { ...entry.ctx, ...ctx };
    const hub = this.hub;
    const app = this.app;

    switch (type) {
      case 'alias':
        return { ok: true, type, target: recipe.target };

      case 'quiet_gate':
        return {
          ok: true,
          type,
          inQuiet: QuietHoursGuard.isInQuietHours(recipe.start || '22:00', recipe.end || '07:00'),
        };

      case 'night_bias': {
        const dim = NightPathBias.applyNightBias(c.dim != null ? c.dim : 1, app, {
          nightFactor: recipe.nightFactor,
        });
        return { ok: true, type, dim };
      }

      case 'soft_daylight':
        if (c.light) {
          SoftDaylightFade.startOnDevice(app, c.light, { minutes: recipe.minutes || 10 });
          return { ok: true, type, started: true };
        }
        return { ok: true, type, started: false, need: 'light' };

      case 'stagger_leave': {
        const lights = c.lights || StaggeredLeaveOff.collectLights(app?.homey);
        return { ok: true, type, ...StaggeredLeaveOff.run(app, lights, { staggerMs: recipe.staggerMs }) };
      }

      case 'peak_shed':
        if (c.meter && c.lights) {
          return { ok: true, type, ...hub.enrollPeakShed(c.meter, c.lights, { thresholdW: recipe.thresholdW, dimTo: recipe.dimTo }) };
        }
        return { ok: true, type, enrolled: false, need: 'meter+lights', thresholdW: recipe.thresholdW };

      case 'idle_off':
        if (c.light) {
          return { ok: true, type, ...hub.enrollIdleAutoOff(c.light, { idleMinutes: recipe.idleMinutes }) };
        }
        return { ok: true, type, need: 'light', idleMinutes: recipe.idleMinutes };

      case 'welcome':
        if (c.lights) {
          return { ok: true, type, ...hub.enrollWelcome(recipe.zone || 'home', c.lights) };
        }
        return { ok: true, type, need: 'lights', zone: recipe.zone };

      case 'absence_eco':
        if (c.devices || c.lights) {
          return {
            ok: true,
            type,
            ...hub.enrollAbsence(recipe.zone || 'home', c.devices || c.lights, {
              mode: recipe.mode || 'dim',
              dimTo: recipe.dimTo,
            }),
          };
        }
        return { ok: true, type, need: 'devices', zone: recipe.zone };

      case 'mesh_zone':
        if (c.lights) {
          return { ok: true, type, ...hub.enrollMeshZone(recipe.zone || 'home', c.lights) };
        }
        return { ok: true, type, ...hub.autoEnrollMesh(recipe.zone || 'home', { max: 6 }) };

      case 'device_link':
        if (c.source && c.targets) {
          return { ok: true, type, ...hub.enrollDeviceLink({ source: c.source, targets: c.targets, mode: recipe.mode }) };
        }
        return { ok: true, type, need: 'source+targets', mode: recipe.mode };

      case 'ambient':
        if (c.lights) {
          return {
            ok: true,
            type,
            ...hub.applySoftAmbient(c.lights, {
              hue: recipe.hue,
              saturation: recipe.saturation,
              dim: recipe.dim,
            }),
          };
        }
        return { ok: true, type, need: 'lights', hue: recipe.hue };

      case 'contact_entry':
        if (c.contact && c.lights) {
          return {
            ok: true,
            type,
            ...hub.enrollContactEntry(c.contact, c.lights, {
              quietStart: recipe.quietStart,
              quietEnd: recipe.quietEnd,
            }),
          };
        }
        return { ok: true, type, need: 'contact+lights' };

      case 'shade_elev':
        if (c.cover) {
          // re-enroll with custom elev via new instance opts — soft: enroll cover
          return { ok: true, type, enrolled: !!hub.enrollShadeDaylight(c.cover), duskElev: recipe.duskElev };
        }
        return { ok: true, type, need: 'cover' };

      case 'lux_gate':
        return { ok: true, type, op: recipe.op, lux: recipe.lux };

      case 'path_light':
      case 'lived_in_window':
      case 'house_mode_hook':
      case 'generic_slot':
        return { ok: true, type, recipe, note: 'declarative_ready' };

      case 'noop':
      default:
        return { ok: true, type: type || 'noop' };
    }
  }

  snapshot() {
    return {
      catalog: SoftFeatureCatalog.snapshot(),
      enabled: [...this._enabled.keys()],
    };
  }
}

module.exports = SoftRecipeRunner;
