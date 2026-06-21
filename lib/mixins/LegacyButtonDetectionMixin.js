'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   LegacyButtonDetectionMixin v9.0.47                                        ║
 * ║   Fallback de détection boutons porté depuis stable-v5 + masterwlan         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  CONTEXTE — Régression identifiée :                                          ║
 * ║  Lors de la consolidation v9 (commit 53688db3d), la logique riche de         ║
 * ║  détection des boutons Tuya (setupButtonDetection + handleButtonCommand)     ║
 * ║  présente dans stable-v5 (1949 lignes) et masterwlan a été PERDUE dans       ║
 * ║  master (ButtonDevice ne conserve qu'un commentaire orphelin).               ║
 * ║                                                                              ║
 * ║  Ce mixin réintroduit la couche de fallback complémentaire à                 ║
 * ║  PhysicalButtonMixin, en respectant l'architecture L1/L2/L3 :                ║
 * ║   - L1 : onZigBeeMessage (RX-RAW) — déjà dans PhysicalButtonMixin            ║
 * ║   - L2 : setupButtonDetection (clusters bind + scenes + onOff + levelCtrl)   ║
 * ║   - L3 : handleButtonCommand (single/double/long/multi click state machine)  ║
 * ║                                                                              ║
 * ║  USAGE :                                                                     ║
 * ║    class MyButton extends LegacyButtonDetectionMixin(PhysicalButtonMixin(    ║
 * ║      VirtualButtonMixin(ButtonDevice)))                                      ║
 * ║                                                                              ║
 * ║  COMPATIBILITÉ :                                                             ║
 * ║   - N'écrase PAS setupButtonDetection si déjà défini (no-op).                ║
 * ║   - Coexiste avec PhysicalButtonMixin via _sceneDedup partagé.               ║
 * ║   - Délègue à triggerButtonPress() (ButtonDevice) ou _triggerPhysicalFlow.   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;

// Timing constants (calibrées d'après stable-v5 + forum)
const TIMING = {
  DOUBLE_CLICK_WINDOW: 400,  // ms — fenêtre double-clic
  LONG_PRESS_DURATION: 1000, // ms — seuil pression longue
  DEBOUNCE_TIME: 50,         // ms — anti-rebond commande
  MULTI_CLICK_MAX: 5,        // clics maximum comptés
};

const LegacyButtonDetectionMixin = (SuperClass) => class extends SuperClass {

  /**
   * L2 : Configuration de la détection boutons multi-clusters
   * Porté de stable-v5 ButtonDevice.setupButtonDetection().
   * Invoqué depuis onNodeInit() APRES super.onNodeInit().
   *
   * Complète PhysicalButtonMixin (qui gère déjà onOff + scenes + DP) avec :
   *   - Binding explicite scenes/groups/levelControl
   *   - Rejoin group 0 (broadcast Tuya)
   *   - Mapping manufacturer-specific des press types
   *
   * IDEMPOTENT : no-op si déjà initialisé ou si _legacyButtonInited.
   */
  async setupButtonDetection() {
    // Si une implémentation existe déjà (master ButtonDevice), ne pas écraser
    if (this._legacyButtonInited) {
      this.log?.('[LEGACY-BTN] ⏭️ Déjà initialisé');
      return;
    }
    this._legacyButtonInited = true;

    // Initialise l'état partagé de détection des clics
    this._clickState = {
      lastClick: 0,
      clickCount: 0,
      clickTimer: null,
      longPressTimer: null,
      buttonPressed: false,
      activeButton: null,
    };

    // Dedup partagé avec PhysicalButtonMixin (même objet _sceneDedup)
    if (!this._sceneDedup) this._sceneDedup = {};

    const manufacturerConfig = this._manufacturerConfig || {};
    const TUYA_PRESS_TYPES = manufacturerConfig.pressTypeMapping || PRESS_MAP;

    this.log?.('[LEGACY-BTN] 🚀 Initialisation (L2 multi-cluster fallback)');

    const endpoints = this.buttonCount || this.gangCount || 1;
    for (let ep = 1; ep <= endpoints; ep++) {
      try {
        await this._setupLegacyEndpoint(ep, TUYA_PRESS_TYPES, manufacturerConfig);
      } catch (err) {
        this.log?.(`[LEGACY-BTN] ⚠️ EP${ep} setup failed: ${err.message}`);
      }
    }

    this.log?.(`[LEGACY-BTN] ✅ Configuré pour ${endpoints} bouton(s)`);
  }

  /**
   * Configuration d'un endpoint : groups + scenes + onOff + levelCtrl
   */
  async _setupLegacyEndpoint(ep, TUYA_PRESS_TYPES, manufacturerConfig) {
    const endpoint = this.zclNode?.endpoints?.[ep];
    if (!endpoint?.clusters) return;

    // 1. Rejoin group 0 (broadcast Tuya) — sécurisé même si déjà membre
    const groupsCluster = endpoint.clusters.groups
      || endpoint.clusters.genGroups
      || endpoint.clusters[4];
    if (groupsCluster) {
      try {
        if (typeof groupsCluster.addGroup === 'function') {
          await groupsCluster.addGroup({ groupId: 0, groupName: 'HomeyGroup' });
          this.log?.(`[LEGACY-BTN] ✅ EP${ep} joined group 0`);
        } else if (typeof groupsCluster.add === 'function') {
          await groupsCluster.add({ groupId: 0, groupName: 'HomeyGroup' });
        }
      } catch (_e) { /* déjà membre = OK */ }
    }

    // 2. Scenes cluster (TS0043/TS0044/TS004F) — PRIORITÉ 1
    const scenesCluster = endpoint.clusters.scenes
      || endpoint.clusters.genScenes
      || endpoint.clusters[5];
    if (scenesCluster && typeof scenesCluster.on === 'function') {
      try {
        if (typeof scenesCluster.bind === 'function') await scenesCluster.bind();
      } catch (_e) { /* non-critique */ }

      const handleSceneRecall = (sceneId) => {
        const id = typeof sceneId === 'number' ? sceneId : 0;
        const now = Date.now();
        const dedupKey = `legacy_${ep}_${id}`;
        const lastTime = this._sceneDedup[dedupKey] || 0;
        if (now - lastTime < 500) return; // anti-flood
        this._sceneDedup[dedupKey] = now;

        const pressAction = TUYA_PRESS_TYPES[id] || 'single';
        this.log?.(`[LEGACY-BTN] 🔘 EP${ep} scene ${id} → ${pressAction.toUpperCase()}`);
        this._dispatchButtonPress(ep, pressAction);
      };

      scenesCluster.on('command', (cmdName, payload) => {
        if (cmdName === 'recall' || cmdName === 'recallScene') {
          handleSceneRecall(payload?.sceneId ?? payload?.sceneid ?? 0);
        }
      });
      scenesCluster.on('recall', (p) => handleSceneRecall(p?.sceneId ?? 0));
      scenesCluster.on('recallScene', (p) => handleSceneRecall(p?.sceneId ?? 0));
      scenesCluster.on('attr.currentScene', (id) => handleSceneRecall(id));
    }

    // 3. OnOff cluster (certains boutons TS0041/TS0042)
    const onOffCluster = endpoint.clusters.onOff
      || endpoint.clusters.genOnOff
      || endpoint.clusters[6];
    if (onOffCluster && typeof onOffCluster.on === 'function') {
      // Délègue au state machine handleButtonCommand
      try {
        onOffCluster.on('toggle', () => this.handleButtonCommand(ep, 'toggle', TIMING));
        onOffCluster.on('on', () => this.handleButtonCommand(ep, 'on', TIMING));
        onOffCluster.on('off', () => this.handleButtonCommand(ep, 'off', TIMING));

        // Commande propriétaire Tuya 0xFD (TS0044)
        onOffCluster.on('command', (cmdName, payload) => {
          if (cmdName === '0xFD' || cmdName === 'tuyaAction') {
            const v = typeof payload === 'number'
              ? payload
              : (payload?.data?.[0] ?? payload);
            const press = TUYA_PRESS_TYPES[v] || 'single';
            this._dispatchButtonPress(ep, press);
          }
        });
      } catch (_e) { /* ignore */ }
    }

    // 4. LevelControl (dimmers TS004F)
    const lcCluster = endpoint.clusters.levelControl
      || endpoint.clusters.genLevelCtrl
      || endpoint.clusters[8];
    if (lcCluster && typeof lcCluster.on === 'function') {
      lcCluster.on('step', () => this._dispatchButtonPress(ep, 'single'));
      lcCluster.on('move', () => this._dispatchButtonPress(ep, 'long'));
      lcCluster.on('stop', () => this._dispatchButtonPress(ep, 'single'));
    }

    // 5. v9.0.47: E000 cluster buttonPress/buttonEvent listeners (régression #8)
    // master ne gérait E000 QUE dans le RX-RAW L1 interceptor (onZigBeeMessage),
    // qui ne se déclenche pas toujours pour les événements cluster. stable-v5
    // écoutait directement buttonPress/buttonEvent sur le cluster E000.
    const e000Cluster = endpoint.clusters[0xE000]
      || endpoint.clusters[57344]
      || endpoint.clusters['e000']
      || endpoint.clusters.tuyaE000;
    if (e000Cluster && typeof e000Cluster.on === 'function') {
      try {
        // E000 buttonPress : payload encode [button, action] (0=single,1=double,2=long)
        e000Cluster.on('buttonPress', (payload) => {
          const action = (Array.isArray(payload) ? payload[1] : payload?.action) ?? 0;
          const button = (Array.isArray(payload) ? payload[0] : payload?.button) ?? ep;
          const type = action === 0 ? 'single' : action === 1 ? 'double' : 'long';
          this._dispatchButtonPress(button, type);
        });
        e000Cluster.on('buttonEvent', (payload) => {
          const action = typeof payload === 'number' ? payload : (payload?.action ?? 0);
          const type = action === 0 ? 'single' : action === 1 ? 'double' : 'long';
          this._dispatchButtonPress(ep, type);
        });
        this.log?.(`[LEGACY-BTN] ✅ E000 listeners EP${ep}`);
      } catch (_e) { /* cluster E000 non disponible */ }
    }

    // 6. v9.0.47: attr.32772 (0x8004) mode-change listener (régression #7)
    // stable-v5 écoutait ce changement de mode pour auto-sync le setting button_mode.
    const onOffAttrCluster = endpoint.clusters.onOff || endpoint.clusters[6];
    if (onOffAttrCluster && typeof onOffAttrCluster.on === 'function') {
      try {
        onOffAttrCluster.on('attr.32772', (mode) => {
          this.log?.(`[LEGACY-BTN] EP${ep} attr.32772 (scene mode) → ${mode}`);
          // Auto-sync du setting button_mode si la méthode existe
          if (typeof this.setSettings === 'function' && mode !== undefined) {
            const modeStr = mode === 1 ? 'scene' : 'auto';
            this.setSettings({ button_mode: modeStr }).catch(() => {});
          }
        });
      } catch (_e) { /* non supporté */ }
    }
  }

  /**
   * L3 : State machine single/double/long/multi click
   * Porté de stable-v5 ButtonDevice.handleButtonCommand().
   *
   * @param {number} endpoint - Numéro d'endpoint (1-based)
   * @param {string} command - 'on' | 'off' | 'toggle' | 'commandButtonRelease'
   * @param {Object} timing - Constantes temporelles (TIMING par défaut)
   */
  async handleButtonCommand(endpoint, command, timing = TIMING) {
    if (this._destroyed) return;
    const now = Date.now();

    // Debounce commande
    if (now - this._clickState.lastClick < timing.DEBOUNCE_TIME) return;
    this._clickState.lastClick = now;

    // Pression détectée
    if (command === 'on' || command === 'off' || command === 'toggle') {
      this._clickState.buttonPressed = true;
      this._clickState.activeButton = endpoint;

      // Timer pression longue
      this._clickState.longPressTimer = this.homey.setTimeout(() => {
        if (this._destroyed) return;
        if (this._clickState.buttonPressed && this._clickState.activeButton === endpoint) {
          this.log?.(`[LEGACY-BTN] 🔘 LONG PRESS (EP${endpoint})`);
          this._dispatchButtonPress(endpoint, 'long');
          this._clickState.buttonPressed = false;
          this._clickState.clickCount = 0;
          this._clickState.activeButton = null;
          if (this._clickState.clickTimer) {
            this.homey.clearTimeout(this._clickState.clickTimer);
            this._clickState.clickTimer = null;
          }
        }
      }, timing.LONG_PRESS_DURATION);
    }
    // Relâchement
    else if (command === 'commandButtonRelease' || this._clickState.buttonPressed) {
      this._clickState.buttonPressed = false;
      if (this._clickState.longPressTimer) {
        this.homey.clearTimeout(this._clickState.longPressTimer);
        this._clickState.longPressTimer = null;
      }

      this._clickState.clickCount++;

      if (this._clickState.clickTimer) {
        this.homey.clearTimeout(this._clickState.clickTimer);
      }

      // Fenêtre d'attente pour multi-clic
      this._clickState.clickTimer = this.homey.setTimeout(() => {
        if (this._destroyed) return;
        const clicks = Math.min(this._clickState.clickCount, TIMING.MULTI_CLICK_MAX);
        const button = this._clickState.activeButton || endpoint;
        this._clickState.clickCount = 0;
        this._clickState.clickTimer = null;
        this._clickState.activeButton = null;

        const type = clicks === 1 ? 'single'
          : clicks === 2 ? 'double'
          : clicks >= 3 ? 'multi' : 'single';
        this._dispatchButtonPress(button, type, clicks);
      }, timing.DOUBLE_CLICK_WINDOW);
    }
  }

  /**
   * Dispatch unifié : utilise triggerButtonPress (ButtonDevice) si dispo,
   * sinon _triggerPhysicalFlow (PhysicalButtonMixin).
   */
  _dispatchButtonPress(button, pressType, clicks) {
    if (typeof this.triggerButtonPress === 'function') {
      return this.triggerButtonPress(button, pressType, clicks);
    }
    if (typeof this._triggerPhysicalFlow === 'function') {
      return this._triggerPhysicalFlow(button, pressType, clicks ? { clicks } : {});
    }
    this.log?.(`[LEGACY-BTN] ⚠️ Aucun dispatcher de bouton disponible (EP${button} ${pressType})`);
  }

  /**
   * Nettoyage timers (appelé par onDeleted/onUninit)
   */
  _cleanupLegacyButtonDetection() {
    if (this._clickState) {
      if (this._clickState.clickTimer) this.homey.clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) this.homey.clearTimeout(this._clickState.longPressTimer);
      this._clickState = null;
    }
    this._legacyButtonInited = false;
  }

  onDeleted() {
    this._cleanupLegacyButtonDetection();
    if (super.onDeleted) super.onDeleted();
  }

  onUninit() {
    this._cleanupLegacyButtonDetection();
    if (super.onUninit) super.onUninit();
  }
};

module.exports = LegacyButtonDetectionMixin;
module.exports.TIMING = TIMING;
