# A basic sequence diagram

```sh
npm run demo:sequence
```

Open [the self-contained HTML](generated/diagram.html). It contains three
participants, five ordered steps, an unanswered retry question, and attached
Markdown. Select the payment reply to inspect `replyTo`, or the order evidence
button to see why the vertical order is asserted. Select Documents to read the
explanation and follow links to individual steps. Scroll down within the canvas
to read later steps; Fit width preserves more readable text than fitting the
entire tall scenario on one screen.

- [Authoring JSON 1](model.json), [fictional evidence](evidence.md), and
  [attached document](reading.md).
- [JSON 2](generated/layout.json), [HTML](generated/diagram.html), and
  [SVG](generated/diagram.svg).
- [Sequence contract and current limits](../../docs/sequence.md).

The example does not assert that the retry produces a duplicate charge. It ends
before retry handling; that uncertainty survives source recovery.
