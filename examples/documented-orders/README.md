# Order Processing with Markdown documents

This extends the fictional order-processing example with three documents in
different directories. It changes no established architecture facts:

- `guides/system.md` attaches to the graph.
- `services/worker/README.md` attaches to Order Worker.
- `interfaces/submission.md` attaches to both Fulfillment call edges.

These paths are examples, not a required folder structure. Relative links between
the files become portable internal links. Documents also link to nodes, edges,
the graph, and headings in other documents. The original fictional evidence
remains in `../order-processing/evidence.md`.

```sh
node bin/waxwing.mjs build examples/documented-orders/model.json examples/documented-orders/generated --group system-structure
python3 -m http.server 4179 --bind 127.0.0.1 --directory examples/documented-orders/generated
```

Open `http://127.0.0.1:4179/diagram.html`, select Order Worker, and open its guide.
Follow Submission details, then a link back to a node. Browser Back/Forward
should revisit those destinations. The document catalog is also in the header.

The [complete rules](../../docs/documents.md) describe registration, references,
supported Markdown/assets, validation, snapshot updates, and standalone exports.
