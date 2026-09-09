# Release notes

Named releases will be recorded here with a version, date, changes, and upgrade
instructions. The package currently reports `0.0.0`; development snapshots are
identified by their Git commit. No named release has been cut yet.

## Unreleased

This section describes the initial release being prepared, not a published version.

### Available functionality

- Validate system models, generate layouts, and export inspectable SVG/HTML.
- Architecture views, subgraphs, explicit workflows, and sequence diagrams with
  loops and conditionals.
- Attached Markdown documents and linked multi-page exports.
- Complete source recovery from supported single-file artifacts or a complete
  multi-page export directory.

### Latest improvements

- Zoom keeps the reading area centered in the architecture and site viewers.
- Details reserve a column on desktop and appear in page flow on narrow screens.
- Sequence diagrams name their declared start, mark it visibly, and offer
  **Go to start** at 100% zoom.
- Architecture generation accepts a per-view `--anchor graph-id=node-id` reading
  preference, with a visible cue and **Go to starting node** navigation.
- Before/after anchor comparisons document the tradeoff between foregrounding a
  component and keeping the layout compact.

### Compatibility and migration

**No source migration is required for currently supported specs.** Existing
specs need no starting-node field to keep working. Sequence entry is an optional
source claim; architecture anchors are generation options recorded in JSON 2.

Re-render saved JSON 2 to adopt viewer improvements while keeping coordinates.
Rebuild from JSON 1 to adopt layout changes or choose architecture anchors.
See the [upgrade instructions](docs/migrations.md) for commands and recovery.

These formats are still experimental drafts. Older Waxwing checkouts may reject
JSON 2 containing the new optional `layout.readingAnchorRef`. Keep the previous
export when evaluating an upgrade. Anchor placement can make diagrams wider or
taller; see the [comparison evidence](experiments/reading-anchor/README.md).

### Checks

The implementation snapshot `6ea6db0` passed all 213 tests. Browser checks covered
anchor navigation, reload, inspector layout, and narrow screens. These checks
do not establish better human comprehension for arbitrary architecture graphs.

## Maintaining these notes

For a release, replace **Unreleased** with its version and date, update the
package version and lockfile, run the checks, and tag the tested commit. Start a
new Unreleased section for later work. A versioned release entry should state
whether migration is needed and link to its exact instructions. Preserve old
entries and release tags; corrections should be explicitly identified.
