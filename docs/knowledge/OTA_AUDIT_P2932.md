# OTA audit (P2932, 2026-10-21)

Scope: master, stable-v5 and bastien-home. `lib/ota/` is the same on the three branches except one case-insensitive lookup (`ciGet`) that is on master only.

## How OTA really works on Homey

Source: Homey SDK, "Zigbee Firmware Updates" (https://apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates), read 21/10.

- Since Homey firmware 13.2.0 and mobile app 9.10.0, **Homey is the Zigbee OTA server**. The device sends `queryNextImageRequest`, then `imageBlockRequest`/`imagePageRequest` and `upgradeEndRequest` (ZCL spec ch. 11). Homey picks the image from `driver.firmwareUpdates`, serves the blocks, detects stalls and aborts, and lets the user retry.
- **The user always starts the update** in the Homey app. It is never forced and the app cannot start it by itself.
- The images must be listed in the manifest. Each one needs `fileVersion`, `imageType`, `manufacturerCode`, `size`, `name` and `integrity`, and the file goes in `drivers/<id>/assets/firmware/`. `wakeInstruction` is shown for sleepy devices.
- In our words (same Athom SDK page, Athom docs team): an uploaded app's firmware files are kept apart from the app itself, and Homey only fetches them at the moment it begins updating a device. So the images are **not** in the runtime app. They count only in the upload package.

Consequence for the asked items:

| Item | Owner on Homey | Status |
|---|---|---|
| imageNotify / queryNextImage / imageBlock / imagePage / upgradeEnd | Homey firmware | Nothing for the app to implement. The app-side code that sent `queryNextImageRequest` TO the device (wrong direction) is removed, see below |
| Bounded block size, page requests, retries with backoff | Homey firmware (device-driven block size) | Not implementable in the app |
| Resume after sleep (battery devices) | Homey + `wakeInstruction` | Added on `water_leak_sensor`. The two TRVs already had it |
| Progress and flows | Homey Device Updates screen | Existing `ota_update_available` trigger and `ota_has_update` condition only cover discovery. Homey has no progress event for apps |
| Never forced | Homey (user starts it) | The app only notifies, with a 6 h discovery that lists and never flashes |

## Gaps found and fixed (master, P2932)

1. **`OTAUpdateManager.performUpdate`** downloaded the image, sent a notification that the firmware update had started, then called `queryNextImageRequest` on the device's own `otaUpdate` cluster. That is a client→server command, sent in the wrong direction. It now returns `OTA_USE_HOMEY_DEVICE_UPDATES` with the shipped version when the driver ships a matching image, and `OTA_NOT_BUNDLED` otherwise. It sends nothing to the device and no false "started" notice.
2. **`findBundledNativeUpdate()`** is new. It applies the SDK selection rules: exact manufacturerName/productId, same manufacturerCode and imageType, min/max file version, strictly newer.
3. **`fetchAndVerifyImage()`** is new. It fetches an indexed image on demand with the index SHA512, then checks the OTA header: magic 0x0BEEF11E, manufacturer code, image type and a newer version. It is bounded by OTARepository (HTTPS only, 2 MB, 60 s) and is for diagnostics only, never for flashing.
4. **Tuya MCU OTA over EF00:** `0x12` mcuOtaNotify, `0x13` mcuOtaBlockDataRequest, `0x14` mcuOtaBlockDataResponse and `0x15` mcuOtaResult. The layout comes from Koenkk/zigbee-herdsman `cluster.ts` (manuSpecificTuya). Before, `0x13`/`0x15` reached the "unknown command → parse as DP" path of `TuyaBoundCluster` and could show up as phantom DP values. They are now recognised by `lib/ota/TuyaMcuOtaFrames.js`, logged and passed to `_onRawFrame`, and never DP-parsed. The app does not serve MCU images, because there is no public Tuya MCU image index.
5. **`0x0B`**: in the Tuya **serial (UART) MCU protocol**, 0x0A starts an MCU OTA and 0x0B transfers a package, with an MTU of 256/512/1024 chosen by the MCU (Tuya developer docs "MCU OTA Update", MCU standard protocol). That traffic stays between the Tuya radio module and the MCU. It is not an EF00 Zigbee command, and zigbee-herdsman has no 0x0B on EF00. The `otaQuery` label in `TuyaZigbeeProtocolProfile.js` stays a **lead** (unsourced). Its existing handling is unchanged.
6. **Manifests:**
   - `thermostatic_radiator_valve` listed only `_tze200_ckud7u2l`. The Koenkk index and the devices use `_TZE200_ckud7u2l`, which is now added. Homey matches `manufacturerName` exactly, so the update was probably never offered.
   - `water_leak_sensor` (battery, `_TZE284_2se8efxh`) had no `wakeInstruction`. It now has one in en/fr/nl.
7. **`scripts/maintenance/ota-images.js`** (`--audit`, `--fetch`, `--index`, `--json`) checks every listed image: present, size, integrity, OTA header against the manifest, the Koenkk index entry (version/code/type) and that our manufacturerName is inside the index target. It also lists bins that no manifest references. `--fetch` downloads missing images from the index URL and writes them only after SHA512 + integrity + header pass. Tested by deleting a bin and re-fetching it: byte-identical.

Audit result 21/10: 9/9 listed images OK against the Koenkk index (985 entries). **1 orphan:** `drivers/plug_smart/assets/firmware/1715138033-tk_common_link_lp_OTA_1.0.13.bin` (227 KB), referenced by no manifest. Not deleted, see below.

## Package size: proposal (not done here; package size and .github/ belong to the other worker)

- The 10 firmware files weigh **2.6 MB** on master and 2.4 MB on stable/Bastien. They are not the main part of the 35.9 MB build. The firmware files are excluded from the runtime app by Homey anyway.
- A runtime "fetch on demand" by the app is **not possible** for native updates, because Homey reads the files from the uploaded package. The workable option is **build-time on-demand fetch**:
  1. Keep the manifests (sha256 integrity) in git and stop committing the `.bin` files, by listing `drivers/*/assets/firmware/*.bin` in `.gitignore`.
  2. In the publish job, before `homey app validate`, run `node scripts/maintenance/ota-images.js --fetch`. Nothing is written unless the index SHA512, the manifest integrity and the header all match, and the job fails otherwise.
  3. Optionally publish without firmware for an app (Bastien) by dropping `firmwareUpdates` in its prune step.
- Can be dropped now without any loss: the orphan `plug_smart` bin (227 KB).

## Sources consulted (credited, no code copied)

- Koenkk/zigbee-OTA `index.json` (fields fileVersion, manufacturerCode, imageType, sha512, manufacturerName, modelId, min/maxFileVersion).
- zigpy `zigpy/ota/providers.py` (ZHA). Providers: Z2M remote/local (Koenkk index, sha512), zigpy-ota channels, IKEA (sha3-256 / signed NGIS container), Ledvance, Sonoff, and stubs for Salus, Inovelli and ThirdReality. It validates size, then checksum, then parses the image, which is the same order as our tool.
- Koenkk/zigbee-herdsman `cluster.ts`, manuSpecificTuya OTA commands 0x12-0x15.
- Tuya developer docs, MCU standard protocol "MCU OTA Update" (0x0A/0x0B, MTU options, 5 s timeout × 3 retries at the module).
- deCONZ OTAU plugin: the gateway serves `.zigbee` files dropped in its otau folder. It is the same server role as Homey Device Updates.
- Homey SDK "Zigbee Firmware Updates"; Homey forum: Device Updates announcement (homey.app/news/introducing-device-updates).
- JohanBendz/com.tuya.zigbee (checkout 4a1702f, 02/10): no OTA implementation and no `firmwareUpdates`, so nothing to reuse.
