module.exports = {
  /**
   * Fetch all devices configured in this Homey Pro.
   * Returns a lightweight array for use in settings dropdown menus.
   * Uses native Homey SDK3 APIs - no dependency on homey-api.
   */
  async getDevices({ homey }) {
    try {
      const driverList = homey.drivers.getDrivers();
      const allDevices = [];

      for (const driverId of Object.keys(driverList)) {
        const driver = driverList[driverId];
        const devices = driver.getDevices();
        for (const device of Object.values(devices)) {
          const data = (typeof device.getData === 'function' && device.getData()) || {};
          allDevices.push({
            id: device.getId(),
            name: device.getName(),
            zoneName: device.getZone()?.getName() || '',
            driverId: device.getDriver().getId() || '',
            driverUri: device.getDriver().getUri() || '',
            available: typeof device.getAvailable === 'function' ? device.getAvailable() : true,
            className: typeof device.getClass === 'function' ? device.getClass() : '',
            capabilities: typeof device.getCapabilities === 'function' ? device.getCapabilities() : [],
            manufacturerName: data.manufacturerName || data.manufacturer || '',
            productId: data.productId || data.modelId || '',
            ieeeAddress: data.ieeeAddress || data.ieee || data.ieeeAddr || data.deviceIeeeAddress || ''
          });
        }
      }

      return allDevices.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      homey.error('[FlowRepair API] Failed to fetch devices:', err);
      throw new Error(`Failed to retrieve devices: ${err.message}`);
    }
  },


  /**
   * P3374 / t1016u: preview (default) or apply a device-id remap in flows.
   * Writes stay off unless FLOW_REMAP_WRITES=1, the setting is on, and the
   * user sends confirm=APPLY with dryRun=false. This device app does not
   * request homey:manager:api (store review would likely refuse it).
   * If ManagerFlow cannot list/update flows, return a read-only plan and
   * point to Flow Converter (optional third-party app).
   */
  async previewFlowRemap({ homey, query, body }) {
    const src = Object.assign({}, query || {}, body || {});
    return module.exports._flowRemap(homey, src, true);
  },

  async getFlowRecoveryCandidates({ homey }) {
    const { findOrphanPairs } = require('./lib/flow-remap/OrphanDeviceMatcher');
    const { FLOW_CONVERTER } = require('./lib/flow-remap/constants');
    const devices = await module.exports.getDevices({ homey });
    return {
      candidates: findOrphanPairs(devices),
      flowConverter: FLOW_CONVERTER,
      writes: require('./lib/flow-remap/constants').writesEnabled(homey.app && typeof homey.app.getSettings === 'function' ? (await homey.app.getSettings().catch(() => ({}))) : {}),
    };
  },

  /**
   * Search and replace old device references with new ones
   * inside triggers, conditions, and actions of all Flows and Advanced Flows.
   * Dry-run by default. See previewFlowRemap.
   */
  async replaceDevice({ homey, body }) {
    return module.exports._flowRemap(homey, body || {}, false);
  },

  async _flowRemap(homey, body, forceDry) {
    const { planRemap, applyPlanToClone } = require('./lib/flow-remap/FlowRemapPlanner');
    const { FLOW_CONVERTER, writesEnabled, CONFIRM_TOKEN, BACKUP_MAX } = require('./lib/flow-remap/constants');
    const capMap = require('./lib/flow-remap/capability-map.json');
    const oldId = body.oldId;
    const newId = body.newId;
    const dryRun = forceDry || body.dryRun !== false;
    const confirm = body.confirm;

    const flowManager = homey.flow || {};
    let flows = {};
    let advancedFlows = {};
    let listError = null;
    const canList = typeof flowManager.getFlows === 'function';
    if (canList) {
      try {
        flows = (await flowManager.getFlows()) || {};
        try { advancedFlows = (await flowManager.getAdvancedFlows()) || {}; }
        catch (_e) { advancedFlows = {}; }
      } catch (err) {
        listError = err && err.message ? err.message : String(err);
        flows = {};
        advancedFlows = {};
      }
    } else {
      listError = 'ManagerFlow.getFlows is not available in this app (no homey:manager:api).';
    }

    const plan = planRemap({ flows, advancedFlows, oldId, newId, capMap, dryRun, confirm });
    plan.flowConverter = FLOW_CONVERTER;
    if (listError) {
      plan.listError = listError;
      plan.guidance = 'This device app does not request the Web API permission. For a full remap of Flows, Advanced Flows, timers and Insights, use the optional Flow Converter app (preview first). ' + FLOW_CONVERTER.forum;
    }
    if (!plan.ok) {return plan;}

    const wantWrite = !dryRun && confirm === CONFIRM_TOKEN;
    if (!wantWrite) {
      return plan;
    }
    if (!writesEnabled((homey.app && homey.settings) ? { flow_remap_writes_enabled: homey.settings.get && homey.settings.get('flow_remap_writes_enabled') } : {})) {
      plan.applyAllowed = false;
      plan.dryRun = true;
      plan.error = 'Flow remap writes are disabled (kill switch). Use Flow Converter or enable writes only after a documented store-review decision.';
      return plan;
    }
    if (typeof flowManager.updateFlow !== 'function') {
      plan.applyAllowed = false;
      plan.dryRun = true;
      plan.error = 'Cannot write flows from this app. Use Flow Converter.';
      return plan;
    }

    // Bounded backup of the JSON we are about to change
    try {
      const backup = {
        at: new Date().toISOString(),
        oldId,
        newId,
        standard: plan.standard,
        advanced: plan.advanced,
      };
      const prev = (homey.settings && typeof homey.settings.get === 'function' && homey.settings.get('flow_remap_backups')) || [];
      const next = [backup].concat(Array.isArray(prev) ? prev : []).slice(0, BACKUP_MAX);
      if (homey.settings && typeof homey.settings.set === 'function') {
        await homey.settings.set('flow_remap_backups', next);
      }
    } catch (_e) { /* backup is best-effort */ }

    let flowsUpdated = 0;
    let advancedFlowsUpdated = 0;
    for (const item of plan.standard) {
      const flow = flows[item.id] || Object.values(flows).find((f) => f && f.id === item.id);
      if (!flow) {continue;}
      const patched = applyPlanToClone(flow, oldId, newId, capMap);
      await flowManager.updateFlow({
        id: item.id,
        flow: { trigger: patched.trigger, actions: patched.actions, conditions: patched.conditions },
      });
      flowsUpdated++;
    }
    if (typeof flowManager.updateAdvancedFlow === 'function') {
      for (const item of plan.advanced) {
        const af = advancedFlows[item.id] || Object.values(advancedFlows).find((f) => f && f.id === item.id);
        if (!af) {continue;}
        const patched = applyPlanToClone(af, oldId, newId, capMap);
        await flowManager.updateAdvancedFlow({ id: item.id, advancedflow: { cards: patched.cards } });
        advancedFlowsUpdated++;
      }
    }
    return {
      success: true,
      dryRun: false,
      flowsUpdated,
      advancedFlowsUpdated,
      flowConverter: FLOW_CONVERTER,
    };
  },
};
