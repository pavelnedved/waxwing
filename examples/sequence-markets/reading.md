# Reading the loop and conditional

This [behavior diagram](#graph=market-collection) shows a family of possible
executions. It does not claim that both quote sources were called in one iteration.

## The loop

The declared entry is [loading configured markets](#edge=load-markets), performed
by Market Collector. That declaration places the collector on the left; its
position is derived from evidence-backed source meaning. The upstream trigger
remains unknown, and the other columns do not imply a left-to-right call order.

The [market loop](#block=market-loop) repeats its body for each configured market,
one at a time. The drawing shows that body once. The actual collection size and
the ordering of individual markets are not supplied. An empty collection runs
the body zero times.

## The conditional

The [quote-source conditional](#block=quote-route) tests whether `market.isOpen`
is true. The true arm calls Live Data; the false arm calls Historical Data.
Read downward within the selected arm, not from the true arm into the false arm.
Each reply belongs to the request in its own arm.

The [save step](#edge=save-quote) follows whichever arm was selected and remains
inside the loop. The [completion event](#edge=complete) is outside the loop and
follows the collection pass.

## What an established claim means here

Both arms are established behavior definitions. That does not mean both execute
in one iteration. The runtime condition chooses an arm; no knowledge dispute is
being resolved. A diagram author does not need the runtime value of `market.isOpen`
to document the condition and both arms honestly.
