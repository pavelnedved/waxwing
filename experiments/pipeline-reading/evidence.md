# Synthetic image pipeline specification

This file stipulates the current implementation in `pipeline-fixture-1`.
It describes no real person, company, repository, or production system.

Upload API, Resize Worker, and Index Worker are deployed services. Upload Queue
and Resized Queue are deployed queues. Index DB is a deployed datastore.

For one successfully processed image:

1. Upload API publishes its job to Upload Queue.
2. Resize Worker consumes that job from Upload Queue.
3. After resizing the image, Resize Worker publishes its result to Resized Queue.
4. Index Worker consumes that result from Resized Queue.
5. Index Worker writes the image's index record to Index DB.

These five relationships and this per-image causal sequence are established by
construction. The fixture does not establish ordering between different images,
delivery guarantees, ownership, network boundaries, or any retry/failure behavior.
The experiment intentionally excludes those questions from its partial scope.
