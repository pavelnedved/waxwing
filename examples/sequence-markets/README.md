# Collection loop with nested if/else

```sh
npm run demo:sequence:markets
```

Open [the HTML](generated/diagram.html), then inspect the **Configured markets**
loop or **Select the quote source** conditional. Their attached document explains
repetition, exclusive branches, and the unknown iteration count/order.

The save interaction is inside the loop but outside the conditional. Completion
is outside the loop. The renderer shows definitions once, without unrolling an
invented number of iterations or treating both arms as consecutive calls.

- [JSON 1](model.json), [fictional evidence](evidence.md), [Markdown](reading.md).
- [JSON 2](generated/layout.json), [SVG](generated/diagram.svg), [HTML](generated/diagram.html).
- [Behavior contract](../../docs/sequence-behavior.md).

The [original basic sequence demo](../sequence/README.md) and the
[architecture demo](../subgraphs/README.md) remain separate and supported.
