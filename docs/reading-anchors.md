# Architecture reading anchors

A generation-time reading anchor names the component from which to begin
reading one architecture view. It is a layout preference, not a claim that
execution starts there. It does not infer a workflow from the reading question.

```sh
node bin/waxwing.mjs build examples/multi-page/model.json /tmp/anchored-checkout --anchor services=orchestrator
node bin/waxwing.mjs build-site examples/subgraphs/model.json /tmp/anchored-orders --anchor overview=payments --anchor order-internals=worker
```

`--anchor graph-id=node-id` works with `layout`, `build`, and `build-site`.
Repeat it for different graphs. For a single-graph model, the graph ID is the
model's ID. Each node must be included in its specified view; explicit external
context can be an anchor too. Unknown graphs, non-component IDs, components
outside a graph, malformed values and duplicate graph assignments are errors.
Sequence diagrams use their source entry declaration instead.

The equivalent API is:

```js
const layout = await layoutModel(model, {
  direction: 'RIGHT',
  readingAnchors: { services: 'orchestrator' },
});
```

Only specified connectivity views change. Workflow layouts continue to follow
their explicit source order. Omitting the option leaves the default placement
policy unchanged. JSON 1 is preserved exactly; optional `layout.readingAnchorRef`
in each affected JSON 2 drawing records the choice, so rendering the saved
layout or moving an export retains it. Regeneration from JSON 1 needs the same
options. This is an additive extension of the experimental architecture JSON 2
drafts; older Waxwing validators may reject the new optional field.

## Placement rule

ELK's native layered layout puts the anchor in the first layer. Its enclosing
frames are also constrained first at each hierarchy level. The outermost
anchor unit uses `FIRST_SEPARATE`; nested units use `FIRST` because ELK's
cross-hierarchy ports may enter those layers. Anchored views disable separate
connected-component packing so unrelated islands cannot be packed before the
anchor. No helper nodes, fake edges, changed operation directions, coordinate
repairs, seed searches or LLM calls are used.

The observable contract is that no component begins before the anchor on the
chosen axis: left for RIGHT, top for DOWN. Other components can share that
leading position in grouped views. Existing grouping remains intact. All other
placement and routing remain ELK's responsibility; this does not promise
shortest-hop columns, chronological ordering, or a compact layout for every
graph. Incoming arrows may point back toward the anchor. Crossings remain
allowed subject to the existing readability warnings.

The validator checks the anchor reference, leading placement, cue space, and
all existing source and geometry invariants. A candidate that cannot satisfy
these checks fails rather than silently moving the anchor or dropping grouping.
The input and any previous export remain available for choosing another view.

## Viewer and export

HTML names the anchor above the diagram and provides **Go to starting node**,
which zooms to 100%, brings the node into view, and opens its details. The node
has an accent outline and a **Start reading here** cue in both HTML and SVG.
Its category, existence, uncertainty alerts and expansion hint remain visible.
Anchor controls follow graph switches and disappear in workflow views.
Multi-page exports retain the same cue and navigation.

## Evaluation

The [reading-anchor experiment](../experiments/reading-anchor/README.md) retains
baseline and anchored exports for grouped incoming dependencies, a shared hub,
a queue pipeline, and nested containment. It records dimensions, fit scale,
crossings and preservation. These are geometry observations, not a reader study.
Use the [layout warning signs](layout-warning-signs.md) to decide when further
deterministic tuning deserves investigation rather than more special cases.
