# Couple moves and flow recovery (P3374 / t1015u)

When a workflow or repair **moves a couple** to another driver:

1. Prefer **in-place migration** first: `onMapDeviceClass` / class maps, additive
   capabilities. Do not ask the user to re-pair if the same device id can keep working.
2. Never remove a published driver or flow id. Never invent manufacturer or product ids.
3. If a re-pair is still required (or capability ids change, e.g. `onoff`/`dim` to
   `windowcoverings_set`), the digest, the reply-candidate, the changelog, and the
   in-app repair hint must mention that **Flow Converter** can remap Flows, Advanced
   Flows, timers and Insights. It is an optional third-party app, never a dependency.
   Forum: https://community.homey.app/t/154906
4. Keep identical capability ids and flow-card ids/args across the three apps and
   across drivers of the same family (`button.1`..`button.N`, `button_up`, etc.) so a
   remap is possible. The CI family report flags divergences; it does not remove ids.

Intake / investigation: check whether an in-place map is possible before proposing a
re-pair. See also `docs/rules/FLOW_REMAP_AND_API_PERMISSION.md`.
