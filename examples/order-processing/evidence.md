# Fictional evidence packet

Every name, component, source, and statement in this example is invented for
Waxwing. There is no underlying private repository, customer, or organization.
“Established” in the fixture means supported by these stipulated facts, not
discovered or verified against running software. This packet is the whole
available evidence for snapshot `fixture-1` in fictional production.

## Runtime inventory

There are five deployed runtime entities: Checkout API (service), Orders DB
(datastore), Order Queue (queue), Order Worker (service), and Fulfillment
(service).

Checkout API contains request handling, order persistence, and submission
adapters. Orders DB stores order records. Order Queue carries order submissions.
Order Worker contains a queue consumer and fulfillment adapter. Fulfillment
contains order acceptance and dispatch operations.

Database schemas, queue internals, replica counts, and fulfillment internals
are not supplied. These service-level abstractions are intentionally partial.

## Runtime connections

Checkout API writes orders to Orders DB. It can publish orders to Order Queue
and can call Fulfillment directly. Order Worker consumes Order Queue and calls
Fulfillment. These five relationships exist in the current implementation.

The selection condition for either submission route is not available. Whether
the same order can use both routes is not established. The packet does not
establish call timing, message delivery guarantees, retry behavior, idempotency,
or transaction ordering. The listed relationships are not a complete execution
trace. In particular, the queue is not proven to be a fallback on direct-call
failure, and the two routes are not proven mutually exclusive.

## System boundary

The current service catalog defines Order Processing as Checkout API, Orders
DB, Order Queue, and Order Worker. Fulfillment belongs to a separate system,
Fulfillment Platform. These are system boundaries, not network, security, or
team-ownership boundaries. Fulfillment is external relative to Order Processing;
this does not establish an Internet crossing or a third-party provider.

## Commerce ownership report

An invented Commerce representative reports that Commerce currently has exclusive authority to approve production deployments
of the whole Order Worker service in fictional production at fixture-1. No corroborating ownership record is supplied.

## Operations ownership report

An invented Operations representative reports that Operations currently has exclusive authority to approve production
deployments of the whole Order Worker service in fictional production at fixture-1. The fixture does not resolve this conflict or establish joint
ownership. Nothing establishes that the worker has moved system boundaries.

## Queue rationale report

An invented maintainer reports that the queue was introduced to absorb
Fulfillment outages. This is a reported explanation for an existing component,
not evidence that outage handling works and not a proposed future topology.
