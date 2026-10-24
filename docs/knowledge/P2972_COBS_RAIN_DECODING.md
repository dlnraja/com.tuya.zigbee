# P2972 — "cobsyrain decoding" (COBS + rain DP decoder)

## Interpretation (to confirm)
The request "Implémenter cobsyrain decoding" has no match in the repo, the forum thread 140352, the GitHub issues or Z2M. We read it as two things and implemented both, additive only:
1. **COBS** (Consistent Overhead Byte Stuffing, Cheshire & Baker 1999): the framing used by serial / UART dumps of a Tuya MCU. Plus every other shape we see in diags: raw bytes, arrays, hex (any separator), base64, 1- or 2-byte length prefix (BE/LE), the EF00 seq header, and BE or LE numbers.
2. **Rain**: decoding the Tuya rain-sensor DPs for the new layout (RB-SRAIN01) and the old one (TS0601).

If the user meant something else, the libs are standalone and nothing depends on them except the rain driver transforms, which give the same results for plain numbers.

## Files
- `lib/tuya/PayloadNormalizer.js`: `cobsDecode/cobsEncode`, `toBuffer`, `stripLengthPrefix`, `parseDpRecords` (record length read BE, then LE as fallback), `readNumber` (be/le, signed), `toNumber` (LE fallback when BE > max), `normalizePayload`.
- `lib/tuya/RainDpDecoder.js`: `decodeRain(input, {mfr})` → `{layout, values, unknown}`.
- `drivers/rain_sensor/device.js`: numeric DP transforms accept Buffer/hex/base64/LE through `toNumber`; DP105 rain threshold unchanged (50 mV for RB-SRAIN01, >0 for legacy). IAS Zone stays the main rain source.

## DP layouts
| layout | DPs | source |
|---|---|---|
| rb_srain01 (TS0207 `_TZ3210_tgvtvdoc`, `_TZ3210_p68kms0l`) | 4 battery %, 101 solar mV, 102 20-min average mV, 103 daily max mV, 104 cleaning reminder, 105 rain intensity mV | Z2M tuya.ts RB-SRAIN01 |
| legacy_ts0601 (`_TZE200_u6x1zyv2`, etc.) | 1 rain, 2/106 level %, 4/15 battery, 101 illuminance, 105 intensity | this repo, issue #326 |
