# WHY interrogation doctrine (P215)

Before adding, changing, or deleting **any** feature, line, workflow step, rule, or catalog
entry, answer these questions. Writing the answers (in the PR, commit body, or a short
comment near the code) is how we investigate and enrich the whole project.

## The five questions (mandatory)

| # | Question | Forces you to… |
|---|----------|----------------|
| 1 | **Pourquoi ?** Why does this exist / why this shape? | Kill cargo-cult and copy-paste |
| 2 | **Comment ?** How does it work at runtime (path, DP, cluster)? | Prefer reuse over a new mega system |
| 3 | **Pour qui ?** Who benefits (user / CI / bot / which track)? | Dual-app BOTH vs MASTER_ONLY |
| 4 | **Quand ?** When does it run (pair / report / publish / enrich)? | Avoid boot storms & wrong hooks |
| 5 | **Contre quoi ?** What fails if we remove or invert it? | Regression = gate or test |

Optional sixth (device work): **Quel couple ?** Exact `manufacturerName` + `productId` —
never invent a pid; Google/Z2M/ZHA/forum by the couple. Look up
`docs/knowledge/DEVICE_TRUTH.md` + `docs/knowledge/device-truth.json` first.

## How to use this to enrich the repo

1. **Code** — Prefer a one-line `// WHY:` above non-obvious branches (sacred zcl_only,
   brightness clamp, refuse wrong pid).
2. **Workflows** — Every new CI step: why hard-fail vs soft; who it protects; when it runs.
3. **Rules / `.cursorrules` / `.cursor/rules`** — State the failure mode the rule prevents.
4. **Docs / reports** — Session reflections use the table (why/how/who/when/cross/verdict).
5. **Catalogs** — Fingerprint edits: why this driver; which couples forbidden; external proof.
6. **Enrich bots** — After apply: anti-bot + matrix gates (they encode “contre quoi”).

## Worked examples (session 2026-08-17)

### Sacred couple lock (`m1cvyneb`+`TS0601` → `wall_dimmer_tuya`)
- **Pourquoi :** mfr alone was routed to climate; controls dead.
- **Comment :** compose + compound DB + mfs_db + registry + anti-bot together.
- **Pour qui :** PresentSky / BSEED Click owners on Homey Test.
- **Quand :** pairing match + after remove/re-pair (Homey never hot-swaps).
- **Contre quoi :** inventing `TS0201` or climate reclaim → matrix gate fails.
- **External :** Z2M #28658 same interview clusters.

### Brightness clamp (`TuyaBrightnessScale`)
- **Pourquoi :** MCU reboot if write >1000 (Z2M #32305 / Avatto).
- **Comment :** Homey 0–1 → round×1000 → clamp 0–1000.
- **Pour qui :** all Tuya MCU dimmers.
- **Quand :** every `dim` TX (and RX scale-back).
- **Contre quoi :** `Math.floor(value*1000)` without clamp.

### `IntelligentProtocolDetect` order
- **Pourquoi :** Unified* detectors disagreed (BSEED forced DP vs zcl_only).
- **Comment :** sacred → cluster truth → heuristics → hybrid listen.
- **Pour qui :** every `TuyaZigbeeDevice` lineage.
- **Quand :** `onNodeInit` / bootstrap; optimizer learns ~15 min.
- **Contre quoi :** multi-gang DP probing cross-links gangs on BSEED.

### Blind ZCL battery `/2` (100% → 50%)
- **Pourquoi :** spec ZCL 0–200 half-percent; Tuya often already 0–100.
- **Comment :** `normalizeZclBatteryPercent` — keep ≤100, ÷2 only if >100, 200=100%, 255=unknown.
- **Pour qui :** tous les sensors/boutons batterie.
- **Quand :** chaque rapport `batteryPercentageRemaining`.
- **Contre quoi :** `Math.round(raw / 2)` inconditionnel (forum T140352 SOS, SmartThings #2679, Z2M dontDividePercentage).

### Backlight settings as **strings** (`off`/`normal`/`inverted`)
- **Pourquoi :** Layer 11 / numeric comparisons caused wrong DP enums.
- **Comment :** map string → 0/1/2 only at `writeEnum` boundary.
- **Pour qui :** UI settings users.
- **Quand :** `onSettings` + inbound DP21.
- **Contre quoi :** comparing `=== 0` / `'0'` in device logic.

### Workflow matrix gate (P2138 / P214)
- **Pourquoi :** enrich/Blakadder re-pollute catalogs after manual locks.
- **Comment :** hard-fail scripts in syntax / unified / pr / publish / enrich.
- **Pour qui :** CI bots + future agents.
- **Quand :** every PR and post-enrich.
- **Contre quoi :** silent climate reclaim of dimmer couples.

## Agent checklist (paste into investigations)

```
[ ] Pourquoi cette feature / cette ligne existe-t-elle ?
[ ] Comment le runtime l’exécute-t-il (ZCL / EF00 / settings / CI) ?
[ ] Pour qui (user Homey / CI / master-only / BOTH) ?
[ ] Quand (pair / RX / TX / cron / publish) ?
[ ] Contre quoi (quel bug ou invent) ?
[ ] Couple mfr+pid vérifié en interne + Z2M/ZHA/forum/Google ?
[ ] Rules / workflows / docs / knowledge mis à jour si la réponse change ?
```

## Canonical links

- Reflection: `reports/SESSION_REFLECTION_2026-08-17.md`
- Layers: `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`
- Dual-app: `docs/rules/DUAL_APP_VISION.md`
- Workflows: `.github/WORKFLOW_GUIDELINES.md` §N / §O
