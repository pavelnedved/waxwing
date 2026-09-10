# Contributing to Waxwing

Waxwing is personally maintained and experimental. Focused bug reports,
documentation improvements, and small fixes are welcome. For larger behavior or
format changes, open an issue describing the problem before implementing them.
Response times depend on maintainer availability.

## Develop locally

Use Node.js 20.19.0 or newer (CI also checks Node 22 and 24).

```sh
git clone https://github.com/pavelnedved/waxwing.git
cd waxwing
npm ci
npm test
npm run demo
```

Open `examples/subgraphs/generated/diagram.html`. To inspect Waxwing's own
pipeline, run `npm run demo:self` and open `examples/waxwing/generated/index.html`.
`npm run test:package` additionally packs and installs Waxwing in a temporary
directory; it needs access to the npm registry.

## Report or change something

- Include Node/Waxwing versions, the exact command, expected and actual behavior,
  and a minimal model when reporting a bug. Remove sensitive source information:
  exported artifacts contain their model and registered documents.
- Keep changes focused. Add regression coverage for behavior changes and run
  `npm test`; run the package check when changing packaging, exports or assets.
- For viewer changes, inspect the affected demo at readable zoom and a narrow
  viewport. State what you actually verified in the pull request.
- Keep source meaning intact. Do not drop unknowns, rewrite relationships, or
  invent ordering just to improve a drawing. Update relevant contracts and
  migration notes when behavior changes.

See [the roadmap](ROADMAP.md), [module boundaries](docs/modules.md), and
[the agent guide](AGENT_GUIDE.md). Contributions are provided under the project's
[MIT license](LICENSE).
