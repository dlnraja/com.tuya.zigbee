# TREAT — Homey tip emails + publish CI/CD (2026-09-25)

Silent only (T157628). No forum POST. No invent pid.

## Gmail Homey tip map (live)

| Track | Healthy | Failed (socket hang) | Action |
|-------|---------|----------------------|--------|
| Universal | **#3371** testing **9.0.1252** | #3365–#3367, **#3370** | Soft-continue P139 — tip OK |
| Bastien | **#113** testing **1.0.103** | **#114** (1.0.105) | Soft-continue; house still **1.0.93** until Install Test |
| Stable | **#247** testing **5.12.339** | #245 earlier | Soft-continue; #248 watch |

## House diag (Bastien)

- UUID `ed627371` @ **v1.0.93** — remotes paired / nothing works (IAS enroll storm + tip-lag).
- Code tip ≥**1.0.103** has P2729 skip IAS + P2733–P2736 bi-dir/snappy.
- Owner must **Install Test** on house my.homey (store senetmarne may lack Pro ID).

## Root cause (publish)

Homey **CLI** `app publish` always `createBuild` — bypassed soft-expect → PF flood while older tip healthy.

## Fix shipped (P2738)

1. `bastien-publish.yml` — soft-expect **direct-api first** (no CLI); `Wait Athom` + skip promote when PF; early soft `HOMEY_DRAFT_EARLY_FAIL_MS=60000`.
2. `publish-ssot.json` flood 2026-09-25 PM + `p2738` lock.
3. `dual-app-tracks.json` tipHealthy floors: U **9.0.1252** / B **1.0.103** / S **5.12.339**.
4. Contre quoi: `p2732` + `p2728` extended.

## Do next (ops)

1. Soft-continue current Bastien run (wait-draft on #114).
2. After Athom cooldown (~15–30m): **one** `workflow_dispatch` force_publish for **1.0.105** only.
3. House: Install Bastien Test ≥1.0.103 (prefer 1.0.105 when lands).
4. Do **not** spam Universal republish while #3371 healthy.

Gates: `npm run check:p2732` · `npm run check:p2728` · `npm run check:publish`.
