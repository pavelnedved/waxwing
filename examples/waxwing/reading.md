# Waxwing, explained by Waxwing

This example models real Waxwing source at [commit 00f3021](https://github.com/isought/waxwing/tree/00f30217513433cbb1fb83318ed469e19f890621). It was authored through static source inspection. It is a partial explanation, not an automatically discovered call graph or observed execution trace.

## Start with the responsibilities

Open the [overview](#graph=overview). The CLI loads registered documents, obtains a layout, and renders exports. Its separate recovery command extracts the embedded model. Select a node or arrow to inspect the source evidence. These boxes are logical modules within one process; the draft model's service category does not mean separate network services.

## Follow a successful build

Open the [build workflow](#workflow=build). The CLI loads the model, awaits layout, computes SVG, then computes HTML. Each repeated CLI appearance refers to the same component. The CLI writes layout JSON, SVG and HTML after all contents have been computed. Filesystem writes and failure branches are outside this view. The evidence is the [build command implementation](https://github.com/isought/waxwing/blob/00f30217513433cbb1fb83318ed469e19f890621/bin/waxwing.mjs#L95-L111).

## Inspect the checks

Open [layout details](#graph=layout-details). The [layout module](https://github.com/isought/waxwing/blob/00f30217513433cbb1fb83318ed469e19f890621/modules/layout/index.mjs) validates JSON 1, asks ELK for placement, and validates the result against the original model. Rendering also checks the layout again through assertLayout; that separate dependency is outside the selected layout-detail graph.

This clarifies an important boundary: ELK places the diagram, but Waxwing checks the model and preserves it. Re-rendering an existing JSON 2 does not need to run layout again. Single-file recovery returns a clone of the embedded model after validation. See [source recovery](https://github.com/isought/waxwing/blob/00f30217513433cbb1fb83318ed469e19f890621/modules/render/artifacts.mjs).

## What this example does not prove

The source snapshot predates release packaging. Sequence dispatch, workflow layout internals, exhaustive imports and failure branches are omitted. No performance trace or large-repository benchmark was collected. The layout node retains an explicit unknown about practical scale. The links remain pinned even as main changes.

The exported site contains this reading guide and the model; it does not include the full Waxwing repository. Internet access is needed to open the external evidence links.
