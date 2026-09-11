# Consult an existing explanation

`query` reads validated, document-resolved JSON 1. It does not scan repositories,
call an LLM, or infer behavior from connectivity.

```sh
waxwing query /path/to/model.json search "payment retry"
waxwing query /path/to/model.json search "stock" --kind component
waxwing query /path/to/model.json inspect payments
waxwing query /path/to/model.json neighbors payments --direction incoming
waxwing query /path/to/model.json neighbors orchestrator --relation calls
waxwing query /path/to/model.json workflows payments
waxwing query /path/to/model.json workflow checkout-run --budget 32000
```

For a standalone sequence, use its model ID with `workflow` to retrieve the
recorded scenario, including order, replies, and behavior blocks. `neighbors`
operates on architecture relationships; it does not flatten a sequence into a
call graph.

`workflows <component-id>` returns compact workflow summaries and matching step
IDs. Follow up with `workflow <workflow-id>` for the full qualified scenario.

Results include model ID, digest revision, scope, and operation semantics.
Inspection preserves qualified claims and source references, with matching
source metadata in the response. A component in several views is one canonical
record. Unknown IDs are errors; empty results mean nothing matching was recorded,
not that something cannot exist in reality.

## Bound the context

- `--limit`: maximum result items, default 20, range 1–1000.
- `--offset`: skip this many matching items, default 0.
- `--budget`: maximum characters in compact serialized `results`, default 12000,
  range 256–1000000. This is not a token or whole-response limit; scope, source
  metadata, envelope, and pretty-print whitespace are additional.

Records are returned whole. `total`, `omitted`, `truncated`, and `nextOffset`
explain pagination. If the next item exceeds the budget, the response reports
`minimumNextItemCharacters`; increase the budget to retrieve it. No claim is
silently shortened or stripped of qualification to fit a result.

Search requires all whitespace-separated terms, case-insensitively, anywhere
in a record's text or title. Exact titles rank first, followed by title-term
matches. Results include matching context. This is text retrieval, not semantic
question answering. `--kind` filters records such as `component`, `relationship`,
`workflow`, `step`, `document`, `source`, or `note`.

Neighbors use `--direction incoming|outgoing|both` (default `both`) and optional
`--relation` for a recorded operation kind. Each result retains the relationship
and neighboring component. Connectivity does not prove execution order or impact.

Agents can search, inspect IDs, and request a workflow instead of loading the
whole model. Retrieve more evidence or investigate original sources when the
current scope cannot answer the question.

Module API: `queryModel(model, operation, value, options)` from
`@felixfelicis/waxwing/query`, expecting resolved JSON 1. The CLI adds `ok` and
structured errors. MCP, workspace-wide queries, and code indexing are not
implemented by this command.
