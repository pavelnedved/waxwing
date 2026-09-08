# Fictional order system across two levels

```sh
npm run demo
```

Open `generated/diagram.html`. Select **Order Processing**, then **Explore Inside
Order Processing**. The overview and detailed graph share component identities.
The child records a known API mapping, an unknown payment caller, and a disputed
repair route. The graph's context labels distinguish outside callers/services
from its internals. Its mapping section explains each overview connection.

The **Reading the two levels** Markdown document attaches to both graphs, the
parent node, and the overview repair edge. It links across graph levels.
Open **Documents** in the header to read it, or find it in the Order Processing
node and Repair order edge inspectors. `npm run demo:subgraphs` is an alias for
the same complete demo.

Direct destinations in the generated HTML:

- [Overview](generated/diagram.html#graph=overview).
- [Subgraph: Inside Order Processing](generated/diagram.html#graph=order-internals).
- [Attached Markdown: Reading the two levels](generated/diagram.html#document=reading-levels).

Files:

- [model.json](model.json): authoring JSON 1 with a registered Markdown file.
- [evidence.md](evidence.md): wholly fictional scenario stipulations.
- [reading.md](reading.md): attached explanatory document.
- [generated/layout.json](generated/layout.json): complete JSON 1 and per-graph geometry.
- [generated/diagram.html](generated/diagram.html): all graphs and the document.
- [generated/diagram.svg](generated/diagram.svg): root picture with complete source.

To export the detailed picture independently:

```sh
node bin/waxwing.mjs render examples/subgraphs/generated/layout.json /tmp/order-internals.svg --graph order-internals
node bin/waxwing.mjs recover /tmp/order-internals.svg /tmp/recovered-model.json
```

Recovery returns the complete original resolved JSON 1, including both graphs
and the original Markdown. See [subgraph rules](../../docs/subgraphs.md) and
[verification status](../../docs/verification.md).
