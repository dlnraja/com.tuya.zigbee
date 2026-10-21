# `docs/`: documentation sources

The public documentation is published at **https://dlnraja.github.io/com.tuya.zigbee/docs/**.
It is generated, so do not edit the HTML: edit the sources below.

| Path | What |
|---|---|
| [`site-src/`](site-src/) | Hand-written pages: [FAQ](site-src/faq.md), [request a device](site-src/request-device.md), [architecture](site-src/architecture.md), [contributing](site-src/contributing.md) |
| [`knowledge/`](knowledge/) | Engineering notes and the knowledge base (`knowledge/KB/`), published under *Knowledge base* |
| [`tools/`](tools/) | Generators: `build-site.js` (site), `build-readme.js` (root README), `check-links.js` (link checker), tests in `tools/test/` |

What is generated from data:
- supported devices pages and `devices-<branch>.json` from each branch's `app.json`;
- the root `README.md` counts, top drivers and latest changes;
- the changelog page from `.homeychangelog.json`;
- knowledge-base, credits (`CREDITS.md`) and sources (`KB_SOURCES.md`) pages.

Build locally:

```
node docs/tools/build-site.js --out /tmp/site && node docs/tools/check-links.js /tmp/site
node docs/tools/build-readme.js
node --test docs/tools/test/
```

The *Deploy Device Finder to GitHub Pages* workflow rebuilds and link-checks the site on every
change to drivers, `app.json` or `docs/`, and daily. Docs-only changes never trigger an app publish.

Report problems through [GitHub issues](https://github.com/dlnraja/com.tuya.zigbee/issues).
