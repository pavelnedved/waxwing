# Submission details

Both [Checkout API](#node=checkout-api) and [Order Worker](#node=order-worker)
have implemented calls to Fulfillment in this fictional snapshot.

## Route selection

The selection conditions for the direct and queued routes are **unknown**.
Whether one order can take both routes is also unknown. No primary/fallback
description is established.

## Interface details

The fixture does not supply the request schema, endpoint path, authentication
mechanism, response codes, or retry contract. This document deliberately leaves
those unspecified rather than inventing a plausible API.

An actual interface contract could be written in an ordinary document like this;
the tool does not treat contracts as a special type.

[Read the worker guide](../services/worker/README.md#responsibilities).
