/**
 * CONSOLIDATED TUYA DATAPOINTS DATABASE
 * 
 * Auto-generated from:
 * - Zigbee2MQTT
 * - Blakadder Database
 * - Existing DataPoints
 * 
 * Generated: 2025-11-01T02:33:18.932Z
 * Total DataPoints: 135
 */

module.exports = {
  "COMMON": {
    "1": {
      "name": "motion",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "illuminance",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "button",
      "type": "enum",
      "capability": "alarm_button",
      "values": {
        "0": "single",
        "1": "double",
        "2": "hold"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "14": {
      "name": "battery_low",
      "type": "bool",
      "capability": "alarm_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "15": {
      "name": "battery_state",
      "type": "enum",
      "capability": "alarm_battery",
      "values": {
        "0": "low",
        "1": "medium",
        "2": "high"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "MOTION_SENSOR": {
    "1": {
      "name": "occupancy",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "illuminance",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "101": {
      "name": "illuminance_lux",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "102": {
      "name": "occupancy_timeout",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "103": {
      "name": "sensitivity",
      "type": "enum",
      "values": {
        "0": "low",
        "1": "medium",
        "2": "high"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "PIR_RADAR": {
    "1": {
      "name": "presence",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "illuminance",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "101": {
      "name": "presence_state",
      "type": "enum",
      "values": {
        "0": "none",
        "1": "presence"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "102": {
      "name": "radar_sensitivity",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "104": {
      "name": "detection_distance",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "105": {
      "name": "fading_time",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "MULTI_SENSOR": {
    "1": {
      "name": "motion",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "illuminance",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "101": {
      "name": "tamper",
      "type": "bool",
      "capability": "alarm_tamper",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "102": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "103": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "104": {
      "name": "illuminance",
      "type": "value",
      "capability": "measure_luminance",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "105": {
      "name": "motion",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "SMOKE_DETECTOR": {
    "1": {
      "name": "smoke",
      "type": "bool",
      "capability": "alarm_smoke",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "11": {
      "name": "smoke_value",
      "type": "value",
      "capability": "measure_smoke",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "14": {
      "name": "battery_low",
      "type": "bool",
      "capability": "alarm_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "15": {
      "name": "self_test",
      "type": "bool",
      "capability": "alarm_tamper",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "16": {
      "name": "silence",
      "type": "bool",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "101": {
      "name": "fault_alarm",
      "type": "bool",
      "capability": "alarm_fault",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "GAS_DETECTOR": {
    "1": {
      "name": "gas",
      "type": "bool",
      "capability": "alarm_co",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "values": {
        "0": "low",
        "1": "medium",
        "2": "high"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "11": {
      "name": "gas_value",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "self_test",
      "type": "bool",
      "capability": "alarm_co",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "14": {
      "name": "mute",
      "type": "bool",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "WATER_LEAK": {
    "1": {
      "name": "water_leak",
      "type": "bool",
      "capability": "alarm_water",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "14": {
      "name": "battery_low",
      "type": "bool",
      "capability": "alarm_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "15": {
      "name": "water_leak",
      "type": "bool",
      "capability": "alarm_water",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "DOOR_WINDOW": {
    "1": {
      "name": "contact",
      "type": "bool",
      "capability": "alarm_contact",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "tamper",
      "type": "bool",
      "capability": "alarm_tamper",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "14": {
      "name": "battery_low",
      "type": "bool",
      "capability": "alarm_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "BUTTON": {
    "1": {
      "name": "action",
      "type": "enum",
      "capability": "alarm_button",
      "values": {
        "0": "single",
        "1": "double",
        "2": "hold"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "button_number",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "SOS_BUTTON": {
    "1": {
      "name": "sos",
      "type": "bool",
      "capability": "alarm_generic",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "action",
      "type": "enum",
      "values": {
        "0": "single",
        "1": "double",
        "2": "hold"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "TEMPERATURE": {
    "1": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "min_temperature",
      "type": "value",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "max_temperature",
      "type": "value",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "temperature_alarm",
      "type": "enum",
      "values": {
        "0": "lower",
        "1": "upper",
        "2": "cancel"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "HUMIDITY": {
    "1": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "CO2_SENSOR": {
    "1": {
      "name": "co2",
      "type": "value",
      "capability": "measure_co2",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "18": {
      "name": "co2_alarm",
      "type": "bool",
      "capability": "alarm_co2",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "AIR_QUALITY": {
    "1": {
      "name": "voc",
      "type": "value",
      "capability": "measure_voc",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "pm25",
      "type": "value",
      "capability": "measure_pm25",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "humidity",
      "type": "value",
      "capability": "measure_humidity",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "formaldehyde",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "15": {
      "name": "co2",
      "type": "value",
      "capability": "measure_co2",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "18": {
      "name": "co2",
      "type": "value",
      "capability": "measure_co2",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "19": {
      "name": "voc",
      "type": "value",
      "capability": "measure_voc",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "22": {
      "name": "formaldehyde",
      "type": "value",
      "capability": "measure_formaldehyde",
      "divide": 1000,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "VIBRATION": {
    "1": {
      "name": "vibration",
      "type": "bool",
      "capability": "alarm_motion",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "sensitivity",
      "type": "enum",
      "values": {
        "0": "low",
        "1": "medium",
        "2": "high"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "THERMOSTAT": {
    "2": {
      "name": "target_temperature",
      "type": "value",
      "capability": "target_temperature",
      "divide": 10,
      "values": {
        "0": "auto",
        "1": "manual",
        "2": "holiday"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "current_temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "mode",
      "type": "enum",
      "capability": "thermostat_mode",
      "values": {
        "0": "auto",
        "1": "manual",
        "2": "away",
        "3": "off"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "valve_position",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "7": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "8": {
      "name": "child_lock",
      "type": "bool",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "16": {
      "name": "target_temperature",
      "type": "value",
      "capability": "target_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "24": {
      "name": "current_temperature",
      "type": "value",
      "capability": "measure_temperature",
      "divide": 10,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "45": {
      "name": "fault",
      "type": "bitmap",
      "capability": "alarm_fault",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "107": {
      "name": "child_lock",
      "type": "bool",
      "capability": "lock_child",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "SWITCH": {
    "1": {
      "name": "state_l1",
      "type": "bool",
      "capability": "onoff",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "state_l2",
      "type": "bool",
      "capability": "onoff.2",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "state_l3",
      "type": "bool",
      "capability": "onoff.3",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "state_l4",
      "type": "bool",
      "capability": "onoff.4",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "state_l5",
      "type": "bool",
      "capability": "onoff.5",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "6": {
      "name": "state_l6",
      "type": "bool",
      "capability": "onoff.6",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "9": {
      "name": "countdown_1",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "10": {
      "name": "countdown_2",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "11": {
      "name": "countdown_3",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "12": {
      "name": "countdown_4",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "DIMMER": {
    "1": {
      "name": "state",
      "type": "bool",
      "capability": "onoff",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "brightness",
      "type": "value",
      "capability": "dim",
      "max": 1000,
      "divide": 1000,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "min_brightness",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "4": {
      "name": "countdown",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "6": {
      "name": "light_mode",
      "type": "enum",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "RGB_LIGHT": {
    "1": {
      "name": "state",
      "type": "bool",
      "capability": "onoff",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "mode",
      "type": "enum",
      "values": {
        "0": "white",
        "1": "color",
        "2": "scene"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "brightness",
      "type": "value",
      "capability": "dim",
      "divide": 1000,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "color_data",
      "type": "hex_color",
      "capability": "light_hue",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "8": {
      "name": "scene",
      "type": "enum",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "20": {
      "name": "onoff",
      "type": "bool",
      "capability": "onoff",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "21": {
      "name": "mode",
      "type": "enum",
      "values": {
        "white": "white",
        "colour": "color",
        "scene": "scene"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "22": {
      "name": "brightness",
      "type": "value",
      "capability": "dim",
      "max": 1000,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "24": {
      "name": "color",
      "type": "hex_color",
      "capability": "light_hue",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "25": {
      "name": "color_temp",
      "type": "value",
      "capability": "light_temperature",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "CURTAIN": {
    "1": {
      "name": "position",
      "type": "value",
      "capability": "windowcoverings_set",
      "divide": 100,
      "values": {
        "0": "open",
        "1": "stop",
        "2": "close"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "state",
      "type": "enum",
      "values": {
        "0": "open",
        "1": "stop",
        "2": "close"
      },
      "capability": "windowcoverings_set",
      "max": 100,
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "3": {
      "name": "mode",
      "type": "enum",
      "values": {
        "0": "morning",
        "1": "night"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "motor_direction",
      "type": "enum",
      "values": {
        "0": "forward",
        "1": "back"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "7": {
      "name": "work_state",
      "type": "enum",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "VALVE": {
    "1": {
      "name": "state",
      "type": "bool",
      "capability": "onoff",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "11": {
      "name": "water_consumed",
      "type": "value",
      "capability": "meter_water",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "LOCK": {
    "1": {
      "name": "state",
      "type": "bool",
      "capability": "locked",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "2": {
      "name": "battery",
      "type": "value",
      "capability": "measure_battery",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "6": {
      "name": "unlock_method",
      "type": "enum",
      "values": {
        "0": "fingerprint",
        "1": "password",
        "2": "card",
        "3": "key",
        "4": "app",
        "5": "temporary_password"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "10": {
      "name": "wrong_finger",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "11": {
      "name": "wrong_password",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "12": {
      "name": "wrong_card",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  },
  "SIREN": {
    "1": {
      "name": "alarm",
      "type": "bool",
      "capability": "alarm_generic",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "5": {
      "name": "duration",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "7": {
      "name": "volume",
      "type": "enum",
      "values": {
        "0": "low",
        "1": "medium",
        "2": "high"
      },
      "sources": [
        "existing"
      ],
      "confidence": "high"
    },
    "13": {
      "name": "melody",
      "type": "value",
      "sources": [
        "existing"
      ],
      "confidence": "high"
    }
  }
};
