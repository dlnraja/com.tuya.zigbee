# Homey Developer Portal — Cartography (2026-08-05)

Mapped live via browser session + network capture. Source of truth for the
CI/CD scripts that talk to Athom services.

## Portal structure (tools.developer.homey.app)

| Section | Path | Notes |
|---|---|---|
| Home | `/` | Overview + doc links |
| My Account | `/me` | Profile |
| My Apps | `/apps` | App list: `com.dlnraja.tuya.zigbee` + `com.dlnraja.tuya.zigbee.stable` |
| App detail | `/apps/app/{appId}` | Local/Cloud installs graph, **Builds table** (state Draft/Test/Live, crashes), per-build actions SUBMISSION / INSTALL |
| My API Clients | `/api/clients` | OAuth clients |
| My Webhooks | `/webhooks` | Webhooks *into* Homey apps (not CI notifications) |
| Tools | `/tools/system` `/tools/pair` `/tools/devices` `/tools/images` `/tools/videos` | Device/tooling utilities |
| Wireless | `/tools/ble` `/tools/ir` `/tools/signals` `/tools/zigbee` `/tools/zwave` | Protocol inspectors (need an online Homey) |
| Web API Playground | `/tools/api-playground` | Runs `Homey.*` calls on a paired online Homey |

## API endpoints (captured from the portal SPA)

- `POST https://api.athom.com/delegation/token?audience=apps` — exchanges an
  OAuth **account** token for an apps-scoped JWT (raw JSON string body).
- `https://apps-api.athom.com/api/v1/app/{appId}` — app detail
- `…/build` — builds list (id, version, state, crashes, installs)
- `…/drivers/stats`, `…/install/stats`, `…/settings`, `…/suggestion`
- `GET https://api.athom.com/user/me` — account info; **embeds `homeys[]`**
  (there is NO `/user/me/homey` endpoint — it 404s)
- `https://{homeyId}.connect.athom.com/api/manager/...` — live Homey API;
  HTTP 417 means the Homey is offline, not an auth failure

## Auth chains used by this repo's CI

1. **Apps API (publish/promote/builds)** — `HOMEY_PAT` (portal PAT) →
   `AthomApi.createDelegationToken({audience:'apps'})` → apps JWT.
   Fallback (`.github/scripts/homey-apps-api-client.js`):
   `HOMEY_REFRESH_TOKEN` → account token → direct delegation POST.
2. **Account API (/user/me, homeys, live diagnostics)** — portal PATs 401
   here by design. `scripts/ci/homey-token-refresh.js` exchanges
   `HOMEY_REFRESH_TOKEN` → 1h account token (masked via `::add-mask::`,
   exported as `HOMEY_ACCOUNT_TOKEN`, rotated refresh written back to the
   secret and to the local CLI session).

## Doc links (from the portal)

- Apps SDK: `https://apps.developer.homey.app/` · JS ref: `https://apps-sdk-v3.developer.homey.app/`
- Web API: `https://api.developer.homey.app/` · ref: `https://athombv.github.io/node-homey-api/`
- Drivers: node-homey-zigbeedriver / node-homey-zwavedriver / node-zigbee-clusters (athombv.github.io)
