# Reading this system

This is a **fictional, partial model** of the current Order Processing system.
It explains what is established about order submission and what remains open.

## Two implemented routes

Checkout API can submit to Fulfillment directly, or publish an order submission
that Order Worker consumes before calling Fulfillment. The model does **not**
establish which route is primary, which is a fallback, or whether they are exclusive.

Read the [worker guide](../services/worker/README.md) and the
[submission details](../interfaces/submission.md#route-selection).

| Question | Recorded state |
|---|---|
| Does the worker consume from Order Queue? | Established |
| What selects each submission route? | Unknown |
| Who approves production deployments of the worker? | Disputed |

## How to read the arrows

Arrows describe operations from actor to resource. For consumption, the
[worker](#node=order-worker) points to the queue it consumes from.
Position does not establish execution order.

> These documents explain the fixture. Their attachment does not make every
> sentence a separately validated architectural claim.

[Return to the graph](#graph=order-processing).
