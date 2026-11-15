# Shipped JavaScript Latin-1 and package images (P3320, 2026-11-15)

Permanent rule, all three apps (master 9.x, stable-v5 5.x, bastien-home 1.x).

## Shipped JavaScript

JavaScript that ships in the Homey package (everything not excluded by `.homeyignore`: `app.js`, `lib/`, `drivers/**/*.js`, `api`, `settings`, widgets, and any other packaged `.js` / `.cjs`) must be Latin-1 source text: **no raw character above U+00FF**.

V8 keeps every loaded module's source for the life of the process. A single emoji, typographic arrow or box-drawing character turns that whole file into a two-byte string and roughly doubles its retained size (P3312 / Bastien OOM, heap abort near 62 MB).

Use:

- ASCII tags for decorative marks: `[OK]`, `[WARN]`, `[ERR]`, `[INFO]`, `->`, `<-`, `-`, `...`
- `\uXXXX` or `\u{XXXXX}` escapes when the exact character is required (Tuya protocol constants, genuine language or currency strings such as `€`, `zł`, `CO₂`)

Accented Latin-1 letters (`é`, `à`, `ç`, `°`) stay as they are.

Do **not** change user-facing meaning in `locales/*.json` or in `app.json` / `.homeycompose` titles and hints. Those files are not rewritten by this rule.

P3312 still Latin-1-escapes payload JS at publish time as a safety net. The source tree itself must already satisfy this rule so local boots and the published package stay small.

## Package images / logos

The packaged app must not include unreferenced or heavy logos or images.

- Keep Athom-required app and driver images (`small` / `large` / `xlarge`) and every image actually referenced by the manifest, driver compose, pairing HTML/CSS, or custom-capability icon convention (`assets/capabilities/<capabilityId>.svg`).
- Do not ship stray `learnmode.svg` / `learn.svg` / product photos / templates that nothing references.
- Development scaffolding such as `assets/templates` belongs in `.homeyignore`, not in the upload.

The P3310 pre-upload completeness guard must still pass (required images remain present).

## Enforcement

Fail-closed, same path as other standing rules:

- Gate: `tools/ci/p3320-shipped-latin1-assets-gate.js`
- Shared runner: `scripts/ci/rules-gates.js` id `p3320-latin1` (core and full profiles, so pre-push and CI both run it)
- Test: `test/critical/p3320-shipped-latin1-assets.test.js`
- Source rewrite helper: `scripts/maintenance/p3320-latin1-source.cjs`
- Optional allowlist (path + reason only, keep it empty unless a character cannot be escaped): `tools/ci/p3320-latin1-allowlist.json`

A new raw character above U+00FF in shipped JS, or a new unreferenced packaged image, blocks the push. Do not weaken or skip the test. Do not use `--no-verify`.
