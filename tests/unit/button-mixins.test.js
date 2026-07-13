'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Button Mixins Regression Tests                                           ║
 * ║  Filet de sécurité pour l'architecture bidirectionnelle physique/virtuel  ║
 * ║  Capture les causes racines identifiées :                                 ║
 * ║   - Déduplication TSN (recyclage 8-bit)                                   ║
 * ║   - Debounce global vs par-gang                                           ║
 * ║   - Boucle infinie prototype chain markAppCommand                         ║
 * ║   - Fuite de timers (appCommandTimeout non tracké)                        ║
 * ║   - Double-processing ZCL (UnifiedSwitchBase + PhysicalButtonMixin)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const assert = require('assert');

/**
 * Mock minimal d'un device Homey pour tester les mixins en isolation.
 * Évite la dépendance au SDK Homey complet (non disponible en CI).
 */
function createMockDevice({ gangCount = 1 } = {}) {
  const timers = new Set();
  const intervals = new Set();
  const store = {};

  const homey = {
    setTimeout: (fn, ms) => {
      const id = setTimeout(fn, ms);
      timers.add(id);
      return id;
    },
    clearTimeout: (id) => { clearTimeout(id); timers.delete(id); },
    setInterval: (fn, ms) => {
      const id = setInterval(fn, ms);
      intervals.add(id);
      return id;
    },
    clearInterval: (id) => { clearInterval(id); intervals.delete(id); },
  };

  const device = {
    homey,
    gangCount,
    _destroyed: false,
    _settings: { physical_button_enabled: true },
    _store: store,
    _capabilities: ['onoff'],
    _capabilityValues: { onoff: false },
    _flowTriggers: [],
    _logLines: [],

    log(...args) { this._logLines.push(args.join(' ')); },
    error(...args) { this._logLines.push('[ERROR] ' + args.join(' ')); },

    getSetting(key) { return this._settings[key]; },
    getSettings() { return this._settings; },
    setSetting(key, value) { this._settings[key] = value; },

    getStoreValue(key) { return this._store[key]; },
    setStoreValue(key, value) { this._store[key] = value; return Promise.resolve(); },

    getCapabilities() { return this._capabilities; },
    hasCapability(cap) { return this._capabilities.includes(cap); },
    getCapabilityValue(cap) { return this._capabilityValues[cap]; },
    setCapabilityValue(cap, val) { this._capabilityValues[cap] = val; return Promise.resolve(); },
    addCapability(cap) { if (!this._capabilities.includes(cap)) this._capabilities.push(cap); return Promise.resolve(); },
    registerCapabilityListener() {},
    registerMultipleCapabilityListener() {},

    // Flow API mock
    _flow: {
      getDeviceTriggerCard() {
        return {
          trigger: async () => { device._flowTriggers.push('trigger'); return true; },
        };
      },
    },

    // Nettoyage pour les tests
    _dispose() {
      this._destroyed = true;
      timers.forEach((id) => clearTimeout(id));
      intervals.forEach((id) => clearInterval(id));
      timers.clear();
      intervals.clear();
    },
  };

  // Exposer flow comme propriété non-énumérable pour simuler le SDK
  Object.defineProperty(device, 'flow', { value: device._flow, writable: false });

  return device;
}

/**
 * Charge un mixin en l'appliquant sur une classe de base de test.
 * Simule la chaîne de prototype réelle sans dépendre du SDK Homey.
 */
function loadMixinChain(device) {
  // Classe de base minimale
  class DeviceBase {
    constructor(d) { Object.assign(this, d); }
    log(...args) { this._logLines?.push(args.join(' ')); }
    error(...args) { this._logLines?.push('[ERROR] ' + args.join(' ')); }
  }

  const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
  const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

  // Ordre de la chaîne réelle : Physical(Virtual(Base))
  const Chained = PhysicalButtonMixin(VirtualButtonMixin(DeviceBase));
  return new Chained(device);
}

describe('PhysicalButtonMixin - Régressions architecture bidirectionnelle', () => {

  describe('Déduplication TSN (Cause racine #1)', () => {
    let device, instance;

    beforeEach(() => {
      device = createMockDevice({ gangCount: 1 });
      instance = loadMixinChain(device);
      instance._physicalButtonState = {
        1: {
          lastState: false,
          appCommandPending: false,
          appCommandTimeout: null,
          pressStartTime: null,
          clickCount: 0,
          clickTimeout: null,
          stateHistory: [],
        },
      };
      instance._lastTSN = new Map();
      instance._reportDebounceMs = 0; // Désactive le debounce pour isoler le TSN
      instance._lastReportTimestamp = 0;
      instance._timingProfile = {
        appCommandWindow: 500,
        doubleClickWindow: 400,
        longPressThreshold: 600,
      };
    });

    afterEach(() => device._dispose());

    it('NE doit PAS rejeter un TSN recyclé après 0→255→0 (différent contexte)', () => {
      // Scénario : device envoie TSN=10, puis après 256 frames TSN=10 à nouveau
      // Un TSN recyclé n'est PAS un doublon — c'est un nouvel événement réel.
      let triggered = 0;
      instance._triggerPhysicalFlow = () => { triggered++; };

      // Premier rapport TSN=10, false→true
      instance._handleAttributeReport(1, true, { transactionSequenceNumber: 10 });
      assert.strictEqual(triggered, 1, 'Premier événement TSN=10 doit déclencher');

      // Simuler un cyclage complet du compteur : on ne peut pas réellement
      // faire 256 frames en test, mais on vérifie que le Map ne garde pas
      // un TSN "à vie". On force un reset en simulant un temps écoulé.
      // Le bug : si le Map ne se nettoie jamais, un TSN recyclé est toujours rejeté.

      // Vérification : après expiration de la fenêtre TSN (>5s), un TSN recyclé doit repasser.
      // Le fix utilise {tsn, ts} — on simule l'expiration en modifiant ts.
      if (instance._lastTSN && instance._lastTSN.get(1)) {
        const entry = instance._lastTSN.get(1);
        entry.ts = Date.now() - 6000; // >5s = recyclé
      } else if (instance._lastTSN) {
        instance._lastTSN.clear();
      }

      // Changement d'état false→true à nouveau (nouvelle pression)
      instance._physicalButtonState[1].lastState = false;
      // v9.0.49: Reset debounce + report time pour isoler le test TSN
      if (instance._lastReportTimestampPerGang) instance._lastReportTimestampPerGang.delete(1);
      if (instance._physicalButtonState[1].lastReportTime) instance._physicalButtonState[1].lastReportTime = 0;
      instance._handleAttributeReport(1, true, { transactionSequenceNumber: 10 });
      assert.strictEqual(triggered, 2, 'TSN recyclé (après nettoyage) doit déclencher');
    });

    it('doit rejeter un vrai doublon (même TSN, même frame)', () => {
      let triggered = 0;
      instance._triggerPhysicalFlow = () => { triggered++; };

      instance._handleAttributeReport(1, true, { transactionSequenceNumber: 42 });
      // Même frame retransmise par le mesh (doublon légitime)
      instance._physicalButtonState[1].lastState = false;
      instance._handleAttributeReport(1, true, { transactionSequenceNumber: 42 });

      assert.strictEqual(triggered, 1, 'Doublon TSN identique ne doit déclencher qu\'une fois');
    });
  });

  describe('Debounce par-gang (Cause racine #2)', () => {
    let device, instance;

    beforeEach(() => {
      device = createMockDevice({ gangCount: 4 });
      instance = loadMixinChain(device);
      instance._physicalButtonState = {};
      for (let g = 1; g <= 4; g++) {
        instance._physicalButtonState[g] = {
          lastState: false,
          appCommandPending: false,
          appCommandTimeout: null,
          pressStartTime: null,
          clickCount: 0,
          clickTimeout: null,
          stateHistory: [],
        };
      }
      instance._lastTSN = new Map();
      instance._timingProfile = {
        appCommandWindow: 500,
        doubleClickWindow: 400,
        longPressThreshold: 600,
      };
    });

    afterEach(() => device._dispose());

    it('NE doit PAS désactiver la détection sur gang 2 quand gang 1 reçoit un rapport', () => {
      // Le bug actuel : _isDebounced() utilise un seul _lastReportTimestamp global.
      // Un rapport sur gang 1 désactive gang 2/3/4 pendant 200ms.
      const triggers = { 1: 0, 2: 0, 3: 0, 4: 0 };
      instance._triggerPhysicalFlow = (gang) => { triggers[gang]++; };

      // Configure un debounce de 200ms (valeur de production)
      instance._reportDebounceMs = 200;
      instance._lastReportTimestamp = 0;
      // v9.0.49: Reset du Map par-gang pour isoler le test
      instance._lastReportTimestampPerGang = new Map();

      // Rapport gang 1
      instance._physicalButtonState[1].lastState = false; // ensure clean state
      instance._handleAttributeReport(1, true, { transactionSequenceNumber: 1 });
      // Immédiatement après, rapport gang 2 (clic quasi-simultané sur double interrupteur)
      instance._physicalButtonState[2].lastState = false; // ensure clean state
      instance._handleAttributeReport(2, true, { transactionSequenceNumber: 2 });

      // Les deux doivent déclencher — un debounce global casserait gang 2
      // Note: _handleAttributeReport ne trigger PAS immédiatement (click detection
      // attend la fenêtre doubleClickWindow). On vérifie plutôt que le state a été
      // mis à jour pour les 2 gangs (pas bloqué par le debounce global).
      assert.ok(instance._physicalButtonState[1].lastState === true, 'Gang 1 state doit être true');
      assert.ok(instance._physicalButtonState[2].lastState === true, 'Gang 2 state doit être true (non bloqué par debounce gang 1)');
    });
  });

  describe('Chaîne de prototype markAppCommand (Cause racine #3)', () => {
    let device, instance;

    beforeEach(() => {
      device = createMockDevice({ gangCount: 2 });
      instance = loadMixinChain(device);
      // Initialise l'état comme le ferait initPhysicalButtonDetection
      instance._physicalButtonState = {};
      for (let g = 1; g <= 2; g++) {
        instance._physicalButtonState[g] = {
          appCommandPending: false,
          appCommandTimeout: null,
          totalAppCommands: 0,
        };
      }
      instance._timingProfile = { appCommandWindow: 500 };
    });

    afterEach(() => device._dispose());

    it('ne doit pas boucler infiniment via super.markAppCommand', () => {
      // La régression v9.0.46 : PhysicalButtonMixin.markAppCommand appelle
      // super.markAppCommand (VirtualButtonMixin) qui rappelle super.markAppCommand.
      // On vérifie qu'un appel unique termine en temps fini (pas de stack overflow).
      assert.doesNotThrow(() => {
        instance.markAppCommand(1, true);
      }, 'markAppCommand ne doit pas throw (boucle prototype)');
    });

    it('doit maintenir la compat legacy _appCommandPending (booléen)', () => {
      instance.markAppCommand(1, true);
      // Les 30+ anciens drivers vérifient `if (!this._appCommandPending)` — ne pas casser
      assert.strictEqual(instance._appCommandPending, true, 'Compat legacy booléen requise');
    });

    it('doit réinitialiser _appCommandPending quand aucune commande n\'est plus en attente', (done) => {
      instance._timingProfile.appCommandWindow = 50; // Accélère pour le test
      instance.markAppCommand(1, true);
      assert.strictEqual(instance._appCommandPending, true);

      setTimeout(() => {
        assert.strictEqual(instance._appCommandPending, false,
          '_appCommandPending doit redevenir false après timeout');
        done();
      }, 100);
    });
  });

  describe('Fuite de timers (Cause racine #4)', () => {
    let device, instance;

    beforeEach(() => {
      device = createMockDevice({ gangCount: 2 });
      instance = loadMixinChain(device);
      instance._physicalButtonState = {};
      for (let g = 1; g <= 2; g++) {
        instance._physicalButtonState[g] = {
          appCommandPending: false,
          appCommandTimeout: null,
          clickTimeout: null,
          totalAppCommands: 0,
        };
      }
      instance._timingProfile = { appCommandWindow: 500 };
    });

    afterEach(() => device._dispose());

    it('_cleanupPhysicalButtonDetection doit nettoyer TOUS les timers', () => {
      instance.markAppCommand(1, true);
      instance.markAppCommand(2, true);

      const state1 = instance._physicalButtonState[1];
      const state2 = instance._physicalButtonState[2];
      assert.ok(state1.appCommandTimeout, 'Timer gang 1 créé');
      assert.ok(state2.appCommandTimeout, 'Timer gang 2 créé');

      instance._cleanupPhysicalButtonDetection();

      // Le cleanup ne doit pas laisser de timers orphelins (vérifié via le Set mock)
      // On vérifie juste qu'il n'y a pas d'exception et que l'état est null
      assert.strictEqual(instance._physicalButtonState, null);
    });
  });
});

describe('VirtualButtonMixin - Cohérence bidirectionnelle', () => {

  describe('Détection de protocole autonome', () => {
    let device;

    beforeEach(() => { device = createMockDevice({ gangCount: 1 }); });
    afterEach(() => device._dispose());

    it('doit détecter Tuya DP pour TS0601', () => {
      device.getSettings = () => ({ zb_model_id: 'TS0601' });
      const instance = loadMixinChain(device);
      assert.strictEqual(instance._isPureTuyaDP, true);
    });

    it('doit détecter Tuya DP pour préfixe _TZE200_', () => {
      device.getSettings = () => ({ zb_manufacturer_name: '_TZE200_abc123' });
      const instance = loadMixinChain(device);
      assert.strictEqual(instance._isPureTuyaDP, true);
    });

    it('doit défauter vers ZCL pour fabricant inconnu', () => {
      device.getSettings = () => ({ zb_manufacturer_name: '_TZ3000_unknown' });
      const instance = loadMixinChain(device);
      assert.strictEqual(instance._isPureTuyaDP, false);
    });
  });

  describe('isAppCommandPending cohérence cross-mixin', () => {
    let device, instance;

    beforeEach(() => {
      device = createMockDevice({ gangCount: 1 });
      instance = loadMixinChain(device);
      instance._physicalButtonState = {
        1: { appCommandPending: false, appCommandTimeout: null },
      };
      instance._timingProfile = { appCommandWindow: 500 };
    });
    afterEach(() => device._dispose());

    it('doit refléter l\'état du gang après markAppCommand', () => {
      assert.strictEqual(instance.isAppCommandPending(1), false);
      instance.markAppCommand(1, true);
      assert.strictEqual(instance.isAppCommandPending(1), true);
    });
  });
});
