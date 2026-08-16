# P153 — Mike/Sven pairing exchange: agree Homey, refuse substitution (2026-08-16)

## Exchange (T140352 #2162–#2163)
- **Mike_Nono**: wall-socket ID as motion detector = bad.
- **smarthomesven**: Homey ignores the picker tile; binds by manufacturer/model ID.

## Verdict
1. Sven’s Homey mechanics: **correct**.
2. Mike’s pain: **valid** when compose dual-claims / wrong couples exist.
3. Proposed “intelligent substitution” (detect → try many drivers → validate caps → pick): **Homey SDK3 cannot do this after pair**. Rejected (same as P147).

## Project response
- Keep fixing **manifest** sacred couples + dual-claim gate + misattribution registry.
- User path when already wrong-paired: **delete + re-pair** after tip.
- No forum paste of this analysis unless Dylan asks for a short human note.
