# Order Worker

The worker consumes order submissions from Order Queue and calls Fulfillment.
Its internal functions and replica count are outside this diagram's scope.

## Responsibilities

1. Consume a queued order submission.
2. Submit the order to Fulfillment.

This list describes the fixture's responsibilities. It does not specify retries,
idempotency, timing guarantees, or concurrency between orders.

Read [submission details](../../interfaces/submission.md) or inspect the
[worker-to-Fulfillment relationship](#edge=worker-submit).

## Ownership remains disputed

Commerce and Operations report different owners for the same exclusive deployment
approval responsibility, environment, and snapshot. Neither report has been
selected as established ownership.

## Example vocabulary

```json
{
  "from": "order-worker",
  "kind": "consumes",
  "to": "order-queue"
}
```

This is a relationship excerpt, not a complete model or a wire protocol contract.

See the [system guide](../../guides/system.md#two-implemented-routes).
