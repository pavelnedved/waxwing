# Synthetic checkout fixture

Everything in this example is invented. It describes one recorded path in a fictional current implementation.

Checkout submits a basket to Orchestrator. Orchestrator calls Stock; Stock replies that it is available. Orchestrator calls Pricing; Pricing replies with the charge. Orchestrator then calls Payment. The recording ends there. The upstream submission trigger is unknown.

The service registry contains five services and four caller-to-resource operations, as recorded in model.json. Replies are interactions in this run, not additional dependencies in the registry. All qualified claims cite this fixture, not a real production system.

The stock and pricing views are explicitly scoped request/reply excerpts from this same invented recording. They reuse the canonical services and operations; their step IDs are distinct per view.
