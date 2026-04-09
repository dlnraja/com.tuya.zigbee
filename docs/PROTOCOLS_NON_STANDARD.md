# 🧬 Non-Standard Protocols & Tuya MCU Deep Dive
*Version: Thinking Opus 4.6 Enhanced*

## 1. Tuya Zigbee-to-MCU (RX/TX)
Tuya Zigbee modules (TYZS, ZS3L, etc.) often act as transparent UART bridges to a main Microcontroller (MCU). 

### Physical Layer
- **UART settings**: Typically 9600 bps or 115200 bps, 8N1.
- **Header**: Serial datagrams start with `0x55 AA`.

### Zigbee Layer (Cluster 0xEF00)
Homey interacts with the MCU via Cluster `0xEF00`. The "Raw" bytes of the serial protocol are mapped to ZCL commands.

#### Command ID 0x01 (Data Report)
When the MCU wants to update a status (RX from Homey's perspective), it sends:
`[Sequence] [DP_ID] [DP_TYPE] [LENGTH] [DATA...]`

#### Common DP Types
- `0x00`: RAW (Custom MCU payload - requires specific parser)
- `0x01`: BOOL
- `0x02`: VALUE (Integer)
- `0x03`: STRING
- `0x04`: ENUM (Map to Homey capability values)
- `0x05`: BITMAP

---

## 2. RAW DP Patterns (Type 0)
Raw DPs are the most "Non-Standard" part of Tuya. Research into ecosystem forks shows several recurring patterns:

### Pattern A: "The Packaged Sensor" (Air Quality)
Devices like `_TZE200_dwcarsat` send a packed buffer on DP 1.
- `[02] [00] [15] [00] [03] ...`
- This is an MCU-internal structure containing CO2, PM2.5, and VOC values in a single burst.
- **Handling**: Create a dedicated `RawDPParser` in `lib/tuya/`.

### Pattern B: "The RTC Sync Request" (Command 0x24)
MCU with LCD screens request time sync via Command `0x24`.
- **Logic**: Homey must respond with a ZCL frame containing `[00] [Time_UTC] [Local_Time]`.
- **Bug**: Some MCUs ignore UTC and only look at the local time bytes.

---

## 3. MCU Versioning & OTA
- **MCU Version**: Often reported on DP 0xFF or via a specific ZCL attribute on endpoint 1.
- **OTA**: Tuya MCU OTA requires a secondary image transfer via cluster `0xEF00`, command `0x1C`. This is currently **EXPERIMENTAL** in this app.

---

## 4. Intelligent Reverse Engineering Rules
1. **Listen First**: Use `TuyaEF00Manager` log trace to identify unknown DP IDs.
2. **Type Inference**: Identify TYPE based on data length (4 bytes = Value, 1 byte = Bool).
3. **Z2M Cross-Ref**: Search `tuya.js` in Zigbee2MQTT for the `toZigbee` and `fromZigbee` converters for similar manufacturerNames.
