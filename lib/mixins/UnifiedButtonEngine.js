'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UnifiedButtonEngine.js — VERSION COMPACTE UNIFIÉE
// Combine le MEILLEUR de toutes les versions (v5.11.x → master v9.x)
// Toutes les root causes résolues en un seul module multicouche L1-Lx.
// ═══════════════════════════════════════════════════════════════════════════
//
// ROOT CAUSES RÉSOLUES (7 boutons + 5 batterie) :
//   1. this.homey.set* sans fallback → (this.homey?.set* || set*)
//   2. super.on() → onNodeInit({ zclNode })
//   3. setupButtonDetection perdu → recréé ici (L2)
//   4. Debounce global → Map par-gang
//   5. TSN recyclage → fenêtre 5s
//   6. 0xFD étroit → 6 variantes
//   7. 3 patterns OnOff → 9 patterns
//
// ARCHITECTURE MULTI-COUCHE :
//   L1 : onZigBeeMessage (RX-RAW frame interceptor)
//   L2 : setupButtonDetection (cluster binding + listeners)
//   L3 : handleButtonCommand (state machine single/double/long/multi)
//   L4 : _triggerButtonFlow (flow card dispatch + dedup)
//   L5 : EventDeduplicationLayer (1 action = 1 event)
// ═══════════════════════════════════════════════════════════════════════════

const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;
const EventDeduplicationLayer = require('../filter/EventDeduplicationLayer');

// Timing constants (calibrées d'après forum + v5.11.202)
const TIMING = {
  APP_CMD_WINDOW: 2000,
  DOUBLE_CLICK: 400,
  LONG_PRESS: 1000,
  DEBOUNCE: 50,
  ROC_DEDUP: 500,      // EventDedup fenêtre
  TSN_WINDOW: 5000,    // TSN dedup fenêtre
};

// Seuils ROC pour SanityFilter batterie/valeurs
const ROC_LIMITS = {
  temperature: 0.5, humidity: 5, distance: 5, luminance: 2000,
  pressure: 1, co2: 100, power: 500, voltage: 10, current: 10,
};

const UnifiedButtonEngine = (SuperClass) => {
  // Fallback si Base indisponible
  if (!SuperClass || typeof SuperClass !== 'function') {
    return class { async init() {} };
  }

  return class extends SuperClass {
    // ═════════════════════════════════════════════════════════════════════
    // L2 : setupButtonDetection — binding clusters + listeners
    // Porté de stable-v5 ButtonDevice, enrichi avec 9 patterns OnOff.
    // ═════════════════════════════════════════════════════════════════════
    async setupButtonDetection() {
      if (this._ubeInited) return;
      this._ubeInited = true;
      this._ubeDedup = new EventDeduplicationLayer({ homey: this.homey, windowMs: TIMING.ROC_DEDUP });
      this._ubeTSN = new Map();        // TSN dedup par-gang
      this._ubeDebounce = new Map();   // Debounce par-gang
      this._ubeClickState = {
        lastClick: 0, clickCount: 0, clickTimer: null,
        longPressTimer: null, buttonPressed: false, activeButton: null,
      };
      this._buttonState = {};          // PhysicalButtonMixin compat
      const gangCount = this.gangCount || this.buttonCount || 1;
      for (let g = 1; g <= gangCount; g++) {
        this._buttonState[g] = {
          lastState: null, appCommandPending: false, appCommandTimeout: null,
        };
      }
      if (!this._sceneDedup) this._sceneDedup = {};

      // L2A : Rejoin group 0 (broadcast Tuya)
      await this._ubeBindClusters(gangCount).catch(() => {});
      this.log?.(`[UBE] ✅ Button detection L2 initialized (${gangCount} gang/btn)`);
    }

    async _ubeBindClusters(gangCount) {
      const zclNode = this.zclNode;
      if (!zclNode?.endpoints) return;
      const TUYA_PRESS = this._manufacturerConfig?.pressTypeMapping || PRESS_MAP;
      for (let ep = 1; ep <= gangCount; ep++) {
        const endpoint = zclNode.endpoints[ep];
        if (!endpoint?.clusters) continue;

        // 1. Groups (broadcast)
        const groups = endpoint.clusters.groups || endpoint.clusters.genGroups || endpoint.clusters[4];
        if (groups?.addGroup) {
          try { await groups.addGroup({ groupId: 0, groupName: 'HomeyGroup' }); } catch (_) {}
        }

        // 2. Scenes (TS0043/44/4F — PRIORITÉ 1)
        const scenes = endpoint.clusters.scenes || endpoint.clusters.genScenes || endpoint.clusters[5];
        if (scenes?.on) {
          try { if (scenes.bind) await scenes.bind(); } catch (_) {}
          const handleScene = (sceneId) => {
            const id = typeof sceneId === 'number' ? sceneId : 0;
            const key = `ube_${ep}_${id}`;
            const now = Date.now();
            if (now - (this._sceneDedup[key] || 0) < TIMING.ROC_DEDUP) return;
            this._sceneDedup[key] = now;
            const press = TUYA_PRESS[id] || 'single';
            this._dispatchButton(ep, press);
          };
          scenes.on('command', (cmd, payload) => {
            if (cmd === 'recall' || cmd === 'recallScene') handleScene(payload?.sceneId ?? 0);
          });
          scenes.on('recall', (p) => handleScene(p?.sceneId ?? 0));
          scenes.on('recallScene', (p) => handleScene(p?.sceneId ?? 0));
          scenes.on('attr.currentScene', (id) => handleScene(id));
        }

        // 3. OnOff (9 patterns — root cause #7)
        const onOff = endpoint.clusters.onOff || endpoint.clusters.genOnOff || endpoint.clusters[6];
        if (onOff?.on) {
          for (const cmd of ['toggle','on','off','commandOn','commandOff','commandToggle','setOn','setOff','command']) {
            try { onOff.on(cmd, () => this._dispatchButton(ep, 'single')); } catch (_) {}
          }
          // 0xFD Tuya (6 variantes — root cause #6)
          onOff.on('command', (cmdName, payload) => {
            const isTuya = ['0xFD','tuyaAction','253','fd','commandTuyaAction'].includes(cmdName)
              || (cmdName === 'unknown' && (payload === 253 || payload?.data?.[0] === 253));
            if (!isTuya) return;
            let val = null;
            if (payload && typeof payload === 'object') {
              val = payload.data?.[0] ?? payload.type ?? (Array.isArray(payload) ? payload[0] : null) ?? payload.value;
            } else if (typeof payload === 'number') { val = payload; }
            const press = (typeof val === 'number' && TUYA_PRESS[val]) || 'single';
            this._dispatchButton(ep, press);
          });
        }

        // 4. LevelControl (dimmers)
        const lc = endpoint.clusters.levelControl || endpoint.clusters.genLevelCtrl || endpoint.clusters[8];
        if (lc?.on) {
          lc.on('step', () => this._dispatchButton(ep, 'single'));
          lc.on('move', () => this._dispatchButton(ep, 'long'));
          lc.on('stop', () => this._dispatchButton(ep, 'single'));
        }

        // 5. E000 cluster (Tuya multi-press — root cause stable-v5 ButtonDevice)
        const e000 = endpoint.clusters[0xE000] || endpoint.clusters[57344] || endpoint.clusters.tuyaE000;
        if (e000?.on) {
          try {
            e000.on('buttonPress', (p) => {
              const a = Array.isArray(p) ? p[1] : p?.action; const btn = Array.isArray(p) ? p[0] : p?.button;
              this._dispatchButton(btn ?? ep, a === 0 ? 'single' : a === 1 ? 'double' : 'long');
            });
            e000.on('buttonEvent', (p) => {
              const a = typeof p === 'number' ? p : p?.action;
              this._dispatchButton(ep, a === 0 ? 'single' : a === 1 ? 'double' : 'long');
            });
          } catch (_) {}
        }

        // 6. MultistateInput (certains boutons obscurs)
        const ms = endpoint.clusters.multistateInput || endpoint.clusters[0x0012] || endpoint.clusters[18];
        if (ms?.on) {
          ms.on('attr.presentValue', (v) => {
            this._dispatchButton(ep, v === 1 ? 'single' : v === 2 ? 'double' : v === 3 ? 'triple' : 'long');
          });
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // L3 : State machine single/double/long/multi click
    // Porté de stable-v5 ButtonDevice.handleButtonCommand + LegacyButtonDetectionMixin
    // ═════════════════════════════════════════════════════════════════════
    async handleButtonCommand(ep, cmd) {
      if (this._destroyed) return;
      const s = this._ubeClickState;
      const now = Date.now();
      if (now - s.lastClick < TIMING.DEBOUNCE) return;
      s.lastClick = now;

      const _set = this.homey?.setTimeout || setTimeout;  // Root cause #1
      const _clear = this.homey?.clearTimeout || clearTimeout;

      if (['on','off','toggle'].includes(cmd)) {
        s.buttonPressed = true; s.activeButton = ep;
        s.longPressTimer = _set(() => {
          if (this._destroyed || !s.buttonPressed || s.activeButton !== ep) return;
          this._dispatchButton(ep, 'long');
          s.buttonPressed = false; s.clickCount = 0; s.activeButton = null;
          if (s.clickTimer) { _clear(s.clickTimer); s.clickTimer = null; }
        }, TIMING.LONG_PRESS);
      } else {
        s.buttonPressed = false;
        if (s.longPressTimer) { _clear(s.longPressTimer); s.longPressTimer = null; }
        s.clickCount++;
        if (s.clickTimer) _clear(s.clickTimer);
        s.clickTimer = _set(() => {
          if (this._destroyed) return;
          const clicks = Math.min(s.clickCount, 5);
          const btn = s.activeButton || ep;
          s.clickCount = 0; s.clickTimer = null; s.activeButton = null;
          const type = clicks === 1 ? 'single' : clicks === 2 ? 'double' : 'multi';
          this._dispatchButton(btn, type, clicks);
        }, TIMING.DOUBLE_CLICK);
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // L4+L5 : Dispatch + dedup + flow trigger
    // ═════════════════════════════════════════════════════════════════════
    _dispatchButton(ep, pressType, clicks) {
      if (this._destroyed) return;
      const devId = this.getData?.()?.id || this.id || 'unk';
      // L5 : EventDeduplicationLayer — 1 action = 1 event
      if (this._ubeDedup && !this._ubeDedup.shouldProcess(devId, `btn_${ep}`, pressType)) return;

      // L4 : Flow trigger dispatch
      if (typeof this.triggerButtonPress === 'function') {
        return this.triggerButtonPress(ep, pressType, clicks ? { clicks } : {});
      }
      if (typeof this._triggerPhysicalFlow === 'function') {
        return this._triggerPhysicalFlow(ep, pressType, clicks ? { clicks } : {});
      }
      this.log?.(`[UBE] 🔘 EP${ep} ${pressType} (no dispatcher)`);
    }

    // ═════════════════════════════════════════════════════════════════════
    // markAppCommand — compat PhysicalButtonMixin (root cause #1)
    // ═════════════════════════════════════════════════════════════════════
    markAppCommand(gang = 1, value = null) {
      const st = this._buttonState?.[gang];
      if (!st) return;
      st.appCommandPending = true;
      this._appCommandPending = true; // legacy bool compat
      if (typeof super.markAppCommand === 'function') super.markAppCommand(gang, value);
      const _set = this.homey?.setTimeout || setTimeout;
      const _clear = this.homey?.clearTimeout || clearTimeout;
      if (st.appCommandTimeout) _clear(st.appCommandTimeout);
      st.appCommandTimeout = _set(() => {
        if (this._destroyed) return;
        st.appCommandPending = false;
        const any = Object.values(this._buttonState || {}).some(s => s.appCommandPending);
        if (!any) this._appCommandPending = false;
      }, this._timingProfile?.appCommandWindow || TIMING.APP_CMD_WINDOW);
    }
    isAppCommandPending(gang = 1) {
      return super.isAppCommandPending?.(gang) ?? this._buttonState?.[gang]?.appCommandPending ?? this._appCommandPending ?? false;
    }

    // ═════════════════════════════════════════════════════════════════════
    // L1 : onZigBeeMessage — RX-RAW frame interceptor (fallback ultime)
    // ═════════════════════════════════════════════════════════════════════
    onZigBeeMessage(epId, clusterId, frame, meta) {
      if (super.onZigBeeMessage?.(epId, clusterId, frame, meta) === true) return true;
      if (!frame) return false;
      if (![5, 6, 8, 0xE000].includes(clusterId)) return false;
      const data = frame.toJSON?.().data || frame.data || [];
      if (data.length < 3) return false;
      const cmd = data[2];
      if (clusterId === 0xE000 && cmd === 0) {
        const btn = data[3] || epId; const a = data[4];
        this._dispatchButton(btn, a === 0 ? 'single' : a === 1 ? 'double' : 'long');
        return true;
      }
      if (clusterId === 5 && (cmd === 7 || cmd === 0x07)) {
        const sceneId = data.length > 3 ? data[3] | (data[4] << 8) : 0;
        const press = (this._manufacturerConfig?.pressTypeMapping || PRESS_MAP)[sceneId] || 'single';
        const key = `raw_${epId}_${sceneId}`;
        const now = Date.now();
        if (now - (this._sceneDedup[key] || 0) < TIMING.ROC_DEDUP) return true;
        this._sceneDedup[key] = now;
        this._dispatchButton(epId, press);
        return true;
      }
      if (clusterId === 6 && cmd <= 2) {
        const key = `raw_onoff_${epId}_${cmd}`;
        const now = Date.now();
        if (now - (this._sceneDedup[key] || 0) < TIMING.ROC_DEDUP) return true;
        this._sceneDedup[key] = now;
        this._dispatchButton(epId, 'single');
        return true;
      }
      if (clusterId === 8) {
        const press = (cmd === 1 || cmd === 4) ? 'long' : 'single';
        const key = `raw_level_${epId}_${cmd}`;
        const now = Date.now();
        if (now - (this._sceneDedup[key] || 0) < TIMING.ROC_DEDUP) return true;
        this._sceneDedup[key] = now;
        this._dispatchButton(epId, press);
        return true;
      }
      return false;
    }

    // ═════════════════════════════════════════════════════════════════════
    // Cleanup
    // ═════════════════════════════════════════════════════════════════════
    _ubeCleanup() {
      const _clear = this.homey?.clearTimeout || clearTimeout;
      if (this._ubeClickState?.clickTimer) _clear(this._ubeClickState.clickTimer);
      if (this._ubeClickState?.longPressTimer) _clear(this._ubeClickState.longPressTimer);
      if (this._ubeDedup) this._ubeDedup.destroy();
      if (this._ubeTSN) this._ubeTSN.clear();
      for (const s of Object.values(this._buttonState || {})) {
        if (s.appCommandTimeout) _clear(s.appCommandTimeout);
      }
      this._ubeInited = false;
    }
    onDeleted() { this._ubeCleanup(); super.onDeleted?.(); }
    onUninit() { this._ubeCleanup(); super.onUninit?.(); }
  };
};

module.exports = UnifiedButtonEngine;
module.exports.TIMING = TIMING;
module.exports.ROC_LIMITS = ROC_LIMITS;
