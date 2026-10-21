#!/usr/bin/env bash
# P2936: shallow, cached reference clones for cross-research (read-only use; fingerprints only).
# Incremental: an existing clone is fast-forwarded with depth 1; failures leave the old copy.
set -u
REF="${XR_REF:-.cache/xr-ref}"; mkdir -p "$REF/ext"
clone() { # dir url [sparse paths...]
  local d="$1" u="$2"; shift 2
  if [ -d "$d/.git" ]; then git -C "$d" fetch -q --depth 1 origin HEAD && git -C "$d" reset -q --hard FETCH_HEAD || echo "[refs] keep old $d"; return; fi
  git clone -q --depth 1 --filter=blob:none --sparse "$u" "$d" && git -C "$d" sparse-checkout set "$@" || echo "[refs] clone failed $u"
}
clone "$REF/zhc" https://github.com/Koenkk/zigbee-herdsman-converters src/devices
clone "$REF/ext/zha-device-handlers" https://github.com/zigpy/zha-device-handlers zhaquirks
clone "$REF/ext/deconz-rest-plugin" https://github.com/dresden-elektronik/deconz-rest-plugin devices
clone "$REF/ext/zigbee" https://github.com/blakadder/zigbee _zigbee
clone "$REF/ext/tuya-local" https://github.com/make-all/tuya-local custom_components/tuya_local/devices
curl -fsSL -m 60 https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/master/app.json -o "$REF/johan-app.json.tmp" && mv "$REF/johan-app.json.tmp" "$REF/johan-app.json" || echo "[refs] johan app.json kept"
