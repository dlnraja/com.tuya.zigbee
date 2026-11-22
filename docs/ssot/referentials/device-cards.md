# Device reference cards (index, bounded)

Freshness: see manifest.json.

- `_TZ3000_wkai4ga5|TS0044` driver=? sources=johan-issue-864 quirks=duplicate trigger per press; missing long press: two cluster-6 frames per press (commandOn/Off/Toggle + Tuya 0xFD); transport-keyed dedup and double listener registration after re-init/migration: dedup per endpoint+action in a short window; bind listeners once per zclNode; forward release only when sent (MOES long press about 5s)
