# Fictional market collection behavior

This example describes invented current behavior, not a real service or an
observed execution.

At the scope of one collection pass, the workflow starts with Market Collector
loading the configured markets. What launches the pass is not stipulated.

The Market Collector loads configured markets, then processes each item
sequentially. An empty collection runs the loop body zero times. The number of
markets and their visitation order are not stipulated. Sequential execution does
not establish which market comes first.

For each market, `market.isOpen` is a boolean condition. When true, the collector
requests a live quote from Live Data and receives its reply. Otherwise, it
requests a closing quote from Historical Data and receives that reply. These
are mutually exclusive branches of this condition, not conflicting accounts.

After either branch, the collector saves the selected quote to Quote Storage.
After all iterations, it records that the collection pass is complete.

Failure paths, retries, concurrent iterations, execution durations, and actual
market values are outside this fixture. None is inferred from the diagram.
