# Fictional snapshot v1

This scenario is wholly invented for Waxwing's public example.

Checkout calls Order Processing to submit orders. The call lands on Order API,
which publishes to Order Queue. Order Worker consumes from that queue and writes
to Order Database. Consumption is drawn worker → queue under the actor-to-resource
operation convention.

Order Processing calls Payment Provider, but the internal caller is deliberately
unspecified. Operations Console calls Order Processing to repair an order. Two
fictional accounts disagree: one identifies Order API, the other Order Worker.
Both candidate detailed edges are reported, not established.

The detailed graph expands Order Processing. Checkout, Operations Console, and
Payment Provider remain external context. No ownership claims are stipulated.
All scopes are partial and describe the current fictional implementation.
