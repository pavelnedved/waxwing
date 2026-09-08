# Reading the two levels

The [overview](#graph=overview) compresses Order Processing into one box.
Its [detailed graph](#graph=order-internals) shows the API, queue, worker, and database.
The graph is partial; it is not an inventory of everything inside the service.

## Where the calls land

- **Known:** [Submit order](#graph=overview&edge=checkout-orders) corresponds to the [API call](#graph=order-internals&edge=checkout-api).
- **Unknown:** the overview records a payment call, but its internal caller has not been identified. The Payment Provider remains visible as external context with no invented detailed payment edge.
- **Disputed:** the operations console is reported to repair orders through either the API or worker. Both candidate edges and their qualifications are retained.

The [same Checkout component](#graph=order-internals&node=checkout) appears as external context in the detailed graph. It shares its identity with the overview node; it has not become part of Order Processing.

## Documents have no required level

This Markdown document explains both graphs, the Order Processing node, and the overview repair edge. A document can explain any graph, node, or edge.
