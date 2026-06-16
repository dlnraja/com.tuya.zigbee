'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

/**
 * WiFiRobotVacuumDevice - Idea #25: Full Robot Vacuum Features
 *
 * Tuya WiFi robot vacuum with comprehensive DP mapping:
 * DP 1:  Power on/off (writable)
 * DP 2:  Vacuum mode (writable): 0=silent, 1=standard, 2=strong, 3=super, 4=custom
 * DP 3:  Vacuum state (report): standby/cleaning/paused/goto_charge/charging/charged/sleep/fault
 * DP 4:  Fan speed / suction level (writable): 1-4 or percentage
 * DP 5:  Cleaning mode (writable): 0=sweep, 1=mop, 2=sweep+mop
 * DP 6:  Battery level (report): 0-100%
 * DP 7:  Cleaning area (report): m2 x10
 * DP 8:  Cleaning time (report): minutes
 * DP 9:  Water tank level (report): 0-100%
 * DP 10: Brush life (report): 0-100%
 * DP 11: Filter life (report): 0-100%
 * DP 12: Side brush life (report): 0-100%
 * DP 14: Fault/error code (report)
 * DP 15: Do Not Disturb mode (writable)
 * DP 16: Volume (writable): 0-100
 * DP 17: Carpet mode (writable): auto boost on carpet
 * DP 18: Find robot command (writable): trigger beep
 * DP 19: Edge clean mode (writable)
 * DP 20: Clean count / repetitions (writable): 1-3
 * DP 21: Area clean coordinates (writable): zone cleaning boundary
 * DP 22: Point clean coordinates (writable): spot clean target
 * DP 23: Map data (report): binary map
 * DP 25: Main brush runtime (report): hours
 * DP 26: Side brush runtime (report): hours
 * DP 27: Filter runtime (report): hours
 * DP 28: Sensor clean reminder (report)
 */
class WiFiRobotVacuumDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      // Core controls
      '1':  {
        capability: 'onoff',
        writable: true,
        transform: (v) => !!v,
        reverseTransform: (v) => !!v
      },
      '3':  {
        capability: 'vacuumcleaner_state',
        transform: (v) => {
          const map = {
            standby: 'stopped', cleaning: 'cleaning', paused: 'stopped',
            goto_charge: 'docked', charging: 'docked', charged: 'docked',
            sleep: 'stopped', fault: 'stopped'
          };
          return map[v] || 'stopped';
        }
      },
      '6':  { capability: 'measure_battery' },

      // Idea #25: Extended vacuum capabilities
      // DP 2: Vacuum mode (silent/standard/strong/super/custom)
      '2':  {
        capability: 'vacuum_mode',
        writable: true,
        transform: (v) => {
          const map = { 0: 'silent', 1: 'standard', 2: 'strong', 3: 'super', 4: 'custom' };
          return map[v] || 'standard';
        },
        reverseTransform: (v) => {
          const map = { silent: 0, standard: 1, strong: 2, super: 3, custom: 4 };
          return map[v] ?? 1;
        }
      },
      // DP 4: Fan speed level
      '4':  {
        capability: 'vacuum_fan_speed',
        writable: true,
        transform: (v) => {
          if (typeof v === 'number') return v;
          const map = { low: 1, medium: 2, high: 3, max: 4 };
          return map[v] || v;
        },
        reverseTransform: (v) => {
          if (typeof v === 'number') return v;
          const map = { low: 1, medium: 2, high: 3, max: 4 };
          return map[v] ?? v;
        }
      },
      // DP 5: Cleaning mode (sweep/mop/both)
      '5':  {
        capability: 'vacuum_cleaning_mode',
        writable: true,
        transform: (v) => {
          const map = { 0: 'sweep', 1: 'mop', 2: 'sweep_and_mop' };
          return map[v] || 'sweep';
        },
        reverseTransform: (v) => {
          const map = { sweep: 0, mop: 1, sweep_and_mop: 2 };
          return map[v] ?? 0;
        }
      },
      // DP 7: Cleaning area (m2 x10)
      '7':  {
        capability: 'vacuum_clean_area',
        transform: (v) => v / 10
      },
      // DP 8: Cleaning time (minutes)
      '8':  {
        capability: 'vacuum_clean_time'
      },
      // DP 9: Water tank level (%)
      '9':  {
        capability: 'vacuum_water_level'
      },
      // DP 10: Brush life (%)
      '10': {
        capability: 'vacuum_main_brush_life'
      },
      // DP 11: Filter life (%)
      '11': {
        capability: 'vacuum_filter_life'
      },
      // DP 12: Side brush life (%)
      '12': {
        capability: 'vacuum_side_brush_life'
      },
      // DP 14: Fault code
      '14': {
        capability: 'vacuum_fault',
        transform: (v) => v
      },
      // DP 15: DND mode
      '15': {
        capability: 'vacuum_dnd_mode',
        writable: true,
        transform: (v) => v === 1 || v === true,
        reverseTransform: (v) => !!v
      },
      // DP 16: Volume (0-100)
      '16': {
        capability: 'vacuum_volume',
        writable: true
      },
      // DP 17: Carpet mode (auto boost)
      '17': {
        capability: 'vacuum_carpet_mode',
        writable: true,
        transform: (v) => v === 1 || v === true,
        reverseTransform: (v) => !!v
      },
      // DP 18: Find robot (writable trigger)
      '18': {
        capability: 'vacuum_find_robot',
        writable: true,
        reverseTransform: () => true
      },
      // DP 19: Edge clean mode
      '19': {
        capability: 'vacuum_edge_clean',
        writable: true,
        transform: (v) => v === 1 || v === true,
        reverseTransform: (v) => !!v
      },
      // DP 20: Clean repetitions
      '20': {
        capability: 'vacuum_repeat_count',
        writable: true
      },
      // DP 25: Main brush runtime (hours)
      '25': {
        capability: 'vacuum_main_brush_hours'
      },
      // DP 26: Side brush runtime (hours)
      '26': {
        capability: 'vacuum_side_brush_hours'
      },
      // DP 27: Filter runtime (hours)
      '27': {
        capability: 'vacuum_filter_hours'
      },
      // DP 28: Sensor clean reminder
      '28': {
        capability: 'vacuum_sensor_clean_reminder',
        transform: (v) => v === 1 || v === true
      },
    };
  }

  async onInit() {
    await super.onInit();

    // Idea #25: Ensure all extended capabilities exist
    const extendedCaps = [
      'measure_battery',
      'vacuum_mode',
      'vacuum_fan_speed',
      'vacuum_cleaning_mode',
      'vacuum_clean_area',
      'vacuum_clean_time',
      'vacuum_water_level',
      'vacuum_main_brush_life',
      'vacuum_filter_life',
      'vacuum_side_brush_life',
      'vacuum_fault',
      'vacuum_dnd_mode',
      'vacuum_volume',
      'vacuum_carpet_mode',
      'vacuum_find_robot',
      'vacuum_edge_clean',
      'vacuum_repeat_count',
      'vacuum_main_brush_hours',
      'vacuum_side_brush_hours',
      'vacuum_filter_hours',
      'vacuum_sensor_clean_reminder',
    ];
    for (const cap of extendedCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }

    // Register writable capability listeners for vacuum controls
    this._setupVacuumCapabilityListeners();

    this.log('[WIFI-ROBOT-VACUUM] Ready with full features (Idea #25)');
  }

  /**
   * Idea #25: Setup writable capability listeners for vacuum commands
   */
  _setupVacuumCapabilityListeners() {
    // Vacuum mode selection
    this.registerCapabilityListener('vacuum_mode', async (value) => {
      this.log('[VACUUM] Setting mode:', value);
      // Handled by dpMappings reverseTransform + parent _setDP
    });

    // Fan speed selection
    this.registerCapabilityListener('vacuum_fan_speed', async (value) => {
      this.log('[VACUUM] Setting fan speed:', value);
    });

    // Cleaning mode
    this.registerCapabilityListener('vacuum_cleaning_mode', async (value) => {
      this.log('[VACUUM] Setting cleaning mode:', value);
    });

    // DND mode
    this.registerCapabilityListener('vacuum_dnd_mode', async (value) => {
      this.log('[VACUUM] Setting DND:', value);
    });

    // Volume
    this.registerCapabilityListener('vacuum_volume', async (value) => {
      this.log('[VACUUM] Setting volume:', value);
    });

    // Carpet mode
    this.registerCapabilityListener('vacuum_carpet_mode', async (value) => {
      this.log('[VACUUM] Carpet mode:', value);
    });

    // Find robot
    this.registerCapabilityListener('vacuum_find_robot', async () => {
      this.log('[VACUUM] Find robot triggered');
    });

    // Edge clean
    this.registerCapabilityListener('vacuum_edge_clean', async (value) => {
      this.log('[VACUUM] Edge clean:', value);
    });

    // Repeat count
    this.registerCapabilityListener('vacuum_repeat_count', async (value) => {
      this.log('[VACUUM] Repeat count:', value);
    });
  }

  /**
   * Idea #25: Expose DP overrides for zone/area cleaning
   * Sends raw coordinate data for area or zone cleaning.
   */
  async startAreaClean(coords) {
    if (!coords || !Array.isArray(coords)) return;
    // DP 21: Area cleaning coordinates
    const buf = Buffer.from(coords.map(c => c & 0xFF));
    await this._setDP(21, buf);
    this.log('[VACUUM] Area clean started with', coords.length, 'coordinates');
  }

  async startPointClean(x, y) {
    // DP 22: Point/spot clean coordinates
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(Math.round(x * 10), 0);
    buf.writeInt16BE(Math.round(y * 10), 2);
    await this._setDP(22, buf);
    this.log('[VACUUM] Spot clean at', x, y);
  }

  async onDeleted() {
    this.log('[WIFI-ROBOT-VACUUM] Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}

module.exports = WiFiRobotVacuumDevice;
