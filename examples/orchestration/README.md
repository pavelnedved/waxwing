# Repeated orchestration, with canonical identity

This example is entirely invented. [Evidence](evidence.md) states five service
responsibilities, four architecture operations, and six interactions in one
recorded checkout path. [JSON 1](model.json) records those facts explicitly,
including order, scoped entry, and an unknown upstream trigger. [Markdown](reading.md)
links the graph, workflow, shared orchestrator and stock reply.

From the repository root with Node 20.19+ and dependencies installed:

```sh
npm ci
npm run demo:workflow
node bin/waxwing.mjs check-layout examples/orchestration/generated/layout.json
node bin/waxwing.mjs render examples/orchestration/generated/layout.json /tmp/checkout-workflow.svg --workflow checkout-run
node bin/waxwing.mjs recover /tmp/checkout-workflow.svg /tmp/checkout-recovered.json
```

Open [diagram.html](generated/diagram.html) and use **View**:

1. **Connectivity** has one Orchestrator box with its three outgoing operations.
2. **Workflow — Checkout through the orchestrator** opens at readable size.
   Scroll to follow Checkout → Orchestrator → Stock → Orchestrator → Pricing →
   Orchestrator → Payment. Use **Fit** to see the entire path.
3. Select an Orchestrator appearance. All three share the `orchestrator` ID;
   the inspector lists each participation and the same canonical evidence.
4. Select **Workflow entry & order** to inspect the qualified start, explicit
   order and unknown trigger. Selecting a reply shows its original request.
5. Open **Documents → Reading repeated participation**. Links return to the
   connectivity graph, the workflow, a canonical node or a specific step.

The default standalone `diagram.svg` is connectivity. The `--workflow` command
above exports the unfolded path. Both SVGs and the one HTML contain complete
source and document content, so recovery does not depend on these input files.

## Recorded result

Baseline: Node v25.8.0, pinned `elkjs` 0.12.0, default `RIGHT`, no grouping perspective, fixture
v1. One build yields five canonical entities and four operations in connectivity;
the workflow adds seven appearances and six step edges. It does not add services
or reverse architecture dependencies. All six transitions progress rightward in
the declared order. Repeat generation preserves geometry.

The following canvas measurements come from the generated JSON 2. The Fit estimate
uses the existing advisory checker at a fixed 1200 × 520 viewport, not the user's
possibly narrower preview. It is a geometry measurement, not a reading study.

| View | Canvas | Fit scale | Estimated smallest text at Fit |
|---|---|---|---|
| Connectivity | 1448.8 × 604 | 82.8% | 8.3 px |
| Workflow | 4056 × 308 | 29.6% | 3.0 px |

The wider path produces a `readability/small-text` warning. At the narrow in-app
preview it needs still more scrolling at 100%. This demonstrates explicit order
and identity preservation, plus a compactness/readability tradeoff. It does not
establish improved human comprehension or an advantage for LLM layout; neither
was compared. See [warning signs](../../docs/layout-warning-signs.md).

For a top-to-bottom alternative using the same semantic source:

```sh
node bin/waxwing.mjs build examples/orchestration/model.json /tmp/checkout-down --direction DOWN
```

The two directions preserve the same source. Neither spacing nor orientation
establishes duration, blocking, ownership, or an unrecorded next interaction.
The last recorded interaction is the payment request; no successful payment
response is implied. Loops, branches and discontinuous interaction paths are
outside this first architecture workflow presentation. See the
[contract](../../docs/architecture-workflows.md) for exact limits.
