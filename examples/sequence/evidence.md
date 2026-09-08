# Fictional sequence evidence

This is an invented current-system scenario, not a production trace or a report
about a real organization. The participants are Checkout (the caller), Orders
(the order service), and Payments (the payment service).

The scoped workflow starts with Checkout's first order request. What launches
that workflow is not stipulated; no upstream user action or caller is inferred.

For this one scenario, the following order is stipulated:

1. Checkout sends an order request to Orders.
2. Orders sends a payment request to Payments.
3. Checkout's wait for the order request times out locally.
4. Payments sends a successful reply to the payment request back to Orders.
5. Checkout sends another request for the same order to Orders.

The timeout is a local event, not a message sent by Orders. The successful
payment reply is received by Orders, not Checkout. No order response to Checkout
is specified here. No behavior after the retry is specified, including whether
Orders deduplicates the request. No elapsed times, blocking behavior, concurrency
model, or other paths are stipulated.
