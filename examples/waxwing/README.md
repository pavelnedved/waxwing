# Waxwing, explained by Waxwing

A real, curated model of Waxwing's source at
[`00f3021`](https://github.com/pavelnedved/waxwing/tree/00f30217513433cbb1fb83318ed469e19f890621).
It includes a package overview, an expansion of architecture layout, a successful
build workflow, and a linked reading guide. This is static source analysis, not
a runtime trace or a claim of complete repository coverage.

From a checkout:

```sh
npm ci
npm run demo:self
```

Open `examples/waxwing/generated/index.html`. The generated directory is ignored
by Git and can be rebuilt from the checked-in model and reading guide.

From an installed npm package:

```sh
waxwing build-site "$(npm root -g)/waxwing/examples/waxwing/model.json" ./waxwing-demo --direction DOWN
```

Open `waxwing-demo/index.html`. Start with the overview, select Layout engine,
and inspect its detailed graph. Open the build workflow for execution order.
Source evidence uses immutable GitHub revision URLs. See [the reading guide](reading.md)
for the boundaries and the explicit unknown about scale.

To regenerate a single-file HTML/SVG instead, use `waxwing build` with the same
input and a separate output directory. The recovered model includes resolved
Markdown, so compare it with `waxwing prepare` output rather than the authoring
model's local document paths.
