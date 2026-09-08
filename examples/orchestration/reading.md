# Reading repeated participation

The [connectivity view](#graph=services) has one box per service. It answers which services invoke which operations. It does not record the order of those operations.

The [checkout workflow](#workflow=checkout-run) answers a different question: where does this one recorded interaction path go next?

[Orchestrator](#workflow=checkout-run&node=orchestrator) appears three times. Each appearance refers to the **same service**, not a replica, separate deployment, or new owner. Select one to inspect its participation and the shared source record.

The [stock result](#workflow=checkout-run&step=stock-result) is a reply to the stock request. It creates no new Stock → Orchestrator architecture dependency.

## Limits of this recording

The upstream trigger is explicitly unknown. The run stops after the payment request; no payment success or final response is implied. Neither the spacing nor a message arrow establishes elapsed time or blocking.
