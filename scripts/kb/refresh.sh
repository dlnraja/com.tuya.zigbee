#!/usr/bin/env bash
# Idempotent incremental KB refresh: fetch each mirror, rebuild only when a HEAD moved (state in $KB_DIR/index/state.json).
set -euo pipefail
KB_DIR="${KB_DIR:-/workspace/kb}"; export KB_DIR; HERE="$(cd "$(dirname "$0")" && pwd)"
declare -A R=([z2m-site]=Koenkk/zigbee2mqtt.io [zhc]=Koenkk/zigbee-herdsman-converters [zha]=zigpy/zha-device-handlers [deconz]=dresden-elektronik/deconz-rest-plugin [blakadder]=blakadder/zigbee [tuya-local]=make-all/tuya-local [tinytuya]=jasonacox/tinytuya [localtuya]=rospogrigio/localtuya [johan]=JohanBendz/com.tuya.zigbee [zigbee-clusters]=athombv/node-zigbee-clusters [ota]=Koenkk/zigbee-OTA)
mkdir -p "$KB_DIR"
for d in "${!R[@]}"; do
  if [ -d "$KB_DIR/$d/.git" ]; then git -C "$KB_DIR/$d" fetch -q --depth 1 origin HEAD && git -C "$KB_DIR/$d" reset -q --hard FETCH_HEAD || echo "warn: $d fetch failed"
  else git clone -q --depth 1 "https://github.com/${R[$d]}" "$KB_DIR/$d" || echo "warn: $d clone failed"; fi
done
# sitemap: conditional GET (ETag) so unchanged sitemaps are not re-downloaded
curl -sf --etag-compare "$KB_DIR/sitemap.etag" --etag-save "$KB_DIR/sitemap.etag" -o "$KB_DIR/z2m-sitemap.new" https://www.zigbee2mqtt.io/sitemap.xml && [ -s "$KB_DIR/z2m-sitemap.new" ] && grep -o '<loc>[^<]*' "$KB_DIR/z2m-sitemap.new" | sed 's/<loc>//' > "$KB_DIR/z2m-sitemap.txt" || true
rm -f "$KB_DIR/z2m-sitemap.new"
node "$HERE/kb-import.js"
mkdir -p "$KB_DIR/z2m" && node "$HERE/z2m-outputs.js"
node "$HERE/build-compact.js"
node "$HERE/enrich-candidates.js"
node "$HERE/build-homey-kb.js"
node "$HERE/open-leads.js" || echo "warn: open-leads scan failed"
