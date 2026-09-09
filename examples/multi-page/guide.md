# Choose a workflow

All three views use the same service registry. Different pages do not mean different services or separate deployments.

- [Checkout](#workflow=checkout-run): the full recorded path.
- [Check stock](#workflow=stock-roundtrip): one stock request/reply pair.
- [Calculate pricing](#workflow=pricing-roundtrip): one pricing request/reply pair.

## Shared context

The [architecture](#graph=services) shows the dependencies. [Orchestrator in the stock view](#workflow=stock-roundtrip&node=orchestrator) and [Orchestrator in the pricing view](#workflow=pricing-roundtrip&node=orchestrator) refer to the same canonical component.

See [the recording limits](reading.md#limits-of-this-recording). Return to [this section](#shared-context) using a normal Markdown heading link.

## Limits

This is a fictional current implementation. The focused excerpts do not claim independent upstream triggers or prove completeness.
