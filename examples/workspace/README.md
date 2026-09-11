# Cross-location review example

This fixture registers the existing collection's independent explanations and
adds an illustrative external organization model and design decision. The
`docs.example.com` URLs are placeholders, never fetched. Their status deliberately
remains external/unverified so the example demonstrates an incomplete review.
The local README sources and elaboration relationships are illustrative, not
new architectural findings about any real system.

From the repository root:

```sh
node bin/waxwing.mjs workspace check examples/workspace/workspace.json
node bin/waxwing.mjs workspace affected examples/workspace/workspace.json --source retry-design --format markdown
```

Expected: retry is selected directly, checkout through its parent link, and the
organization overview through checkout. The external overview stays in the
queue with an access gap; markets is not reached. Starting instead with
`--source platform-decision` reaches the same three explanations from above.

No models are copied into this directory. The paths can cross clone boundaries;
moving a model only requires changing its location, preserving its registration
ID and canonical `modelId`. You can publish the three local models independently
using [the collection example](../collection/README.md). The external overview
does not have to become a collection member.

See [the workspace contract and review workflow](../../docs/workspace.md).
