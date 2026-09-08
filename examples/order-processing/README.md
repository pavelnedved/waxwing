# Fictional order-processing example

Start with [model.json](model.json). All its sources point to the invented
[evidence packet](evidence.md) in this directory. No private project material
was used. The packet stipulates the example's facts; no code extraction or
runtime verification has taken place.

The current implementation has Checkout API, Orders DB, Order Queue, Order
Worker, and Fulfillment. Checkout API writes orders, publishes submissions to a
queue, and can also call Fulfillment directly. The worker consumes the queue
and calls Fulfillment.

We intentionally do not know which condition selects each submission route,
whether one order can take both, or the queue's delivery/retry guarantees.
These produce four explicit unknowns. We do not call either route the primary,
fallback, legacy, or replacement path.

The worker's system membership is established: it belongs to Order Processing.
Its exclusive production-deployment approval authority is disputed between
Commerce and Operations for the same service and snapshot. These are different
named grouping perspectives. The ownership dispute must not move the worker outside
its known system boundary or imply joint ownership.

A maintainer's explanation for the queue—absorbing Fulfillment outages—is
reported rationale, not an established guarantee.

## What a reader should be able to answer

| Question | Honest answer from JSON 1 |
|---|---|
| Does the direct submission connection exist? | Established within the fictional packet. |
| When is it used? | Unknown. |
| Is the queue a fallback when the direct call fails? | Not established. |
| Can an order be submitted twice? | Unknown. |
| Which system contains the worker? | Order Processing. |
| Which team owns the worker? | Disputed; both reports and their sources are retained. |
| Does the queue successfully absorb outages? | Not established by the reported rationale. |
| Does a missing edge prove there is no connection? | No; scope is explicitly partial. |

## Direction is explicit

The draft uses subject-to-object relationships. `Order Worker → Order Queue`
with kind `consumes` means “the worker consumes the queue.” It describes a
consumer dependency, not the direction in which payload bytes move.

This operation/dependency convention is accepted for the MVP. An eventual
data-flow view might want the opposite direction, but must declare that
transformation. A layout
engine cannot reverse this relationship for aesthetics. The current graph is
not an execution trace, and reachability does not prove runtime order or
causality.

## Reconstruct and change it

No positions, grid cells, colors, sizes, or routes occur in the model. A future
layout stage must preserve both submission connections, retain uncertainty on
their conditions, and expose the ownership dispute without selecting a winner.

As a manual review exercise, suppose a second worker is added to the fixture.
Add its supplied facts and relationships to JSON 1. Do not assume it inherits
the first worker's owner, behavior, or guarantees. The additions should not
require recovering any hidden coordinate-based meaning. Automatic layout and exact cross-stage model recovery are now implemented and
tested. This manual expansion exercise remains useful for reviewing meaning.


## Generated artifacts

Run `npm run demo` from the repository root to rebuild:

- [JSON 2](generated/layout.json): complete source model plus checked geometry.
- [Interactive HTML](generated/diagram.html): select elements for evidence,
  qualifications, perspective definitions, and raw records.
- [SVG](generated/diagram.svg): standalone vector drawing with embedded source.

The HTML uses inline assets and includes the inspector and JSON/SVG download
controls. Both rendered artifacts support verified recovery through the CLI.
See [verification notes](../../docs/verification.md) for browser-test limitations.
