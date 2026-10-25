#!/usr/bin/env bash
# Idempotent incremental KB refresh: fetch each mirror, rebuild only when a HEAD moved (state in $KB_DIR/index/state.json).
set -euo pipefail
KB_DIR="${KB_DIR:-/workspace/kb}"; export KB_DIR; HERE="$(cd "$(dirname "$0")" && pwd)"
declare -A R=([z2m-site]=Koenkk/zigbee2mqtt.io [zhc]=Koenkk/zigbee-herdsman-converters [zha]=zigpy/zha-device-handlers [deconz]=dresden-elektronik/deconz-rest-plugin [blakadder]=blakadder/zigbee [tuya-local]=make-all/tuya-local [tinytuya]=jasonacox/tinytuya [localtuya]=rospogrigio/localtuya [johan]=JohanBendz/com.tuya.zigbee [zigbee-clusters]=athombv/node-zigbee-clusters [ota]=Koenkk/zigbee-OTA [hubitat]=kkossev/Hubitat [smartthings]=SmartThingsCommunity/SmartThingsEdgeDrivers [st-mariano]=Mariano-Github/Edge-Drivers-Beta [iobroker]=ioBroker/ioBroker.zigbee [domoticz-cert]=zigbeefordomoticz/z4d-certified-devices)
mkdir -p "$KB_DIR"
for d in "${!R[@]}"; do
  if [ -d "$KB_DIR/$d/.git" ]; then git -C "$KB_DIR/$d" fetch -q --depth 1 origin HEAD && git -C "$KB_DIR/$d" reset -q --hard FETCH_HEAD || echo "warn: $d fetch failed"
  else git clone -q --depth 1 "https://github.com/${R[$d]}" "$KB_DIR/$d" || echo "warn: $d clone failed"; fi
done
# sitemap: conditional GET (ETag) so unchanged sitemaps are not re-downloaded
curl -sf --etag-compare "$KB_DIR/sitemap.etag" --etag-save "$KB_DIR/sitemap.etag" -o "$KB_DIR/z2m-sitemap.new" https://www.zigbee2mqtt.io/sitemap.xml && [ -s "$KB_DIR/z2m-sitemap.new" ] && grep -o '<loc>[^<]*' "$KB_DIR/z2m-sitemap.new" | sed 's/<loc>//' > "$KB_DIR/z2m-sitemap.txt" || true
rm -f "$KB_DIR/z2m-sitemap.new"
# P3039: Tasmota is huge; only its Zigbee plugin folder (.zb device templates) is needed.
if [ -d "$KB_DIR/tasmota/.git" ]; then git -C "$KB_DIR/tasmota" fetch -q --depth 1 --filter=blob:none origin HEAD && git -C "$KB_DIR/tasmota" reset -q --hard FETCH_HEAD || echo "warn: tasmota fetch failed"
else git clone -q --depth 1 --filter=blob:none --sparse https://github.com/arendst/Tasmota "$KB_DIR/tasmota" && git -C "$KB_DIR/tasmota" sparse-checkout set tasmota/zigbee || echo "warn: tasmota clone failed"; fi
# P3039: the published herdsman-converters package gives exact exposes + tuyaDatapoints per definition.
# Installed under $KB_DIR (never into the app's package.json); reinstalled only when npm has a newer version.
ZHC_PKG="$KB_DIR/zhc-pkg"; mkdir -p "$ZHC_PKG"; [ -f "$ZHC_PKG/package.json" ] || echo '{"name":"zhc-pkg","private":true}' > "$ZHC_PKG/package.json"
ZHC_LATEST="$(npm view zigbee-herdsman-converters version 2>/dev/null || true)"
ZHC_HAVE="$(node -p "try{require('$ZHC_PKG/node_modules/zigbee-herdsman-converters/package.json').version}catch(e){''}" 2>/dev/null || true)"
if [ -n "$ZHC_LATEST" ] && [ "$ZHC_LATEST" != "$ZHC_HAVE" ]; then
  (cd "$ZHC_PKG" && npm i -q --no-audit --no-fund --ignore-scripts "zigbee-herdsman-converters@$ZHC_LATEST" >/dev/null) || echo "warn: zhc package install failed"
fi
node "$HERE/kb-import.js"
mkdir -p "$KB_DIR/z2m" && node "$HERE/z2m-outputs.js"
node "$HERE/build-compact.js"
node "$HERE/enrich-candidates.js"
node "$HERE/build-homey-kb.js"
node "$HERE/open-leads.js" || echo "warn: open-leads scan failed"
# P3018: exact couple → DP name + converter (Z2M tuyaDatapoints) and ZHA DP numbers → catalogue v2 →
# DP/endpoint coverage doc. Deterministic; files are rewritten only when the upstream facts change.
node "$HERE/../data/harvest-z2m-tuya-dps.js" || echo "warn: tuyaDatapoints harvest failed"
# P3018b: remaining generic DPs — exact per-quirk ZHA builders + deCONZ DDF (fill-only into the catalogue).
node "$HERE/../data/harvest-zha-quirk-dps.js" || echo "warn: ZHA per-quirk DP harvest failed"
node "$HERE/../data/harvest-deconz-tuya-dps.js" || echo "warn: deCONZ DDF DP harvest failed"
node "$HERE/../data/build-unknown-dp-catalog.js" || echo "warn: DP catalogue build failed"
node "$HERE/../data/build-inferred-dp-family.js" || echo "warn: inferred DP family build failed"
node "$HERE/dp-endpoint-coverage.js" || echo "warn: DP/endpoint coverage doc failed"
# P3039: multi-source Tuya coverage matrix (Z2M, ZHA, deCONZ, Johan, Blakadder, Hubitat, SmartThings, ioBroker,
# Domoticz, Tasmota) against master / stable-v5 / bastien-home, source and rebuilt payload.
node "$HERE/z2m-coverage.js" --kb "$KB_DIR" --zhc-pkg "$ZHC_PKG/node_modules/zigbee-herdsman-converters" || echo "warn: coverage matrix failed"
