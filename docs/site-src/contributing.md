# Contributing

Thanks for helping. The most useful contributions are **device data** and **test reports**.

## Report or request

- Use [GitHub issues](https://github.com/dlnraja/com.tuya.zigbee/issues/new/choose) for bugs and
  device requests; follow the [device request guide](request-device.html).
- Test new versions from the **Test** channel and say in the issue whether the fix works.

## Code and data changes

1. Fork the repository and branch from `master` (new work always lands on master first; `stable-v5`
   and `bastien-home` receive proven fixes later).
2. Keep changes additive: add a couple to the one driver that matches the device, never remove a
   working couple, never invent a model id.
3. Note the source of every couple or data point table (link to the public reference) and credit
   people in `CREDITS.md`.
4. Add unit tests for every fix or new module (`npm test`, mocha, files named `*.test.js`).
5. Run `npm test` and `npx homey app validate --level publish` before opening a pull request.
6. Do not copy code or text from other projects; describe what you learned in your own words and
   link to it.
7. No personal data (names, e-mails, IP addresses, keys, tokens) in code, issues or docs.

## Documentation

The site and README are generated: edit `docs/site-src/*.md`, the knowledge base under
`docs/knowledge/`, or the generators in `docs/tools/`, then run:

```
node docs/tools/build-site.js --out /tmp/site && node docs/tools/check-links.js /tmp/site
node docs/tools/build-readme.js
node --test docs/tools/test/
```

Documentation-only changes do not trigger an app publish.

See also: [architecture](architecture.html), [credits](credits.html), [sources](sources.html).
