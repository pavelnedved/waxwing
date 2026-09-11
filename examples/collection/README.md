# A parent page for architecture and separate sequences

From the repository root:

```sh
node bin/waxwing.mjs build-collection examples/collection/collection.json /tmp/waxwing-library
```

Open `/tmp/waxwing-library/index.html`. This packages the existing checkout
architecture, an independently authored timeout/retry sequence, and a separate
market-data sequence. Their fictional scopes remain distinct.

Select Checkout in the architecture to open the linked retry example. In the
retry diagram, select Checkout to follow the link back. Search the collection
for `Deduplication` to jump to its document section.

See [collection publishing](../../docs/collections.md) for existing-site inputs,
navigation targets, updates, and per-model recovery.
