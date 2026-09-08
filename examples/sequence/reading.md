# Reading the timeout and retry

This [sequence](#graph=checkout-retry) describes one fictional scenario. Read it
from top to bottom; the distances between steps do not encode elapsed time.

The declared entry is [Checkout's first request](#edge=submit), so Checkout is
placed on the left. The upstream trigger is explicitly unknown. Inspect the
entry participant or step, then **Workflow entry & trigger**, for its evidence.
The remaining columns do not imply a left-to-right execution order.

## What happens

[Checkout](#node=checkout) sends an order request, then Orders requests payment.
The [timeout](#edge=timeout) happens locally at Checkout while the payment result
has not yet arrived at Orders. The [successful payment reply](#edge=paid) goes
to Orders. Checkout then [retries the order request](#edge=retry).

The original request and retry are separate occurrences. Sharing endpoints does
not make them one dependency edge. The reply explicitly names the payment
message it answers; it does not imply a response to Checkout.

## What this does not establish

The model does not say that the retry causes a duplicate charge. Deduplication
and the eventual response are unknown and recorded as such in the note attached
to the retry and Orders. There is no second payment request in the drawing.

This document attaches to the scenario, Checkout, and the retry step. Its links
work in the exported HTML without the source Markdown file.
