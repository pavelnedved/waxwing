# Upgrading Waxwing specs and exports

This guide uses commands that exist today. There is no automatic `migrate`
command and no required source transformation for the current Unreleased changes.
Read the target version's [release notes](../CHANGELOG.md) before upgrading.

## Keep the previous result

Keep your original spec, export, and the Waxwing commit or release used to
generate it. Install the target checkout's pinned dependencies with `npm ci`.
Run the commands below from that checkout, using your own input/output paths.
Write to a fresh output directory so you can compare or return to the old export.

The Waxwing release version identifies the software. `schemaVersion` identifies
the file format. `scope.snapshot` describes the represented system state. Do not
change either field merely because you installed newer software, and do not
upgrade a file by changing its version string alone.

## Choose the upgrade you need

| What you want | Starting point | Action |
|---|---|---|
| New viewer controls or styling, same diagram geometry | JSON 2 (`layout.json`) | Validate and re-render. |
| New placement or an architecture reading anchor | JSON 1 (`model.json`) | Validate and rebuild. |
| Rebuild when only an old export remains | Single-file HTML/SVG, or the whole exported site directory | Recover JSON 1, then validate and rebuild. |
| Use a future incompatible source format | An older JSON 1 file | Follow the version-specific migration entry below. |

### Re-render saved JSON 2

```sh
node bin/waxwing.mjs check-layout /path/to/old/layout.json
node bin/waxwing.mjs render /path/to/old/layout.json /path/to/new/diagram.html
node bin/waxwing.mjs render /path/to/old/layout.json /path/to/new/diagram.svg
```

For a multi-page export:

```sh
node bin/waxwing.mjs render-site /path/to/old/source/layout.json /path/to/new-site
```

Rendering retains the saved layout and source. The default standalone
architecture SVG shows the root graph; use `--graph` or `--workflow` to select
another view. HTML includes all views. Rendering does not adopt newer placement
algorithms or infer a starting point.

### Rebuild from JSON 1

```sh
node bin/waxwing.mjs validate /path/to/model.json
node bin/waxwing.mjs build /path/to/model.json /path/to/new-export
```

Use `build-site` instead of `build` to generate a linked site. Reapply the intended
architecture options: `--group`, `--direction`, and any `--anchor` choices.
They can be read from the old JSON 2's per-view `layout` fields; they are not
automatically restored from recovered JSON 1. Sequence models take no layout
options and use their declared source order and entry.

If the spec registers documents with relative `file` paths, keep those files and
their registered local assets available. Layout may change between software
versions even when source meaning and the selected options remain the same.

### Recover when only an export remains

From a supported single-file HTML/SVG export:

```sh
node bin/waxwing.mjs recover /path/to/old/diagram.html /path/to/recovered-model.json
node bin/waxwing.mjs validate /path/to/recovered-model.json
node bin/waxwing.mjs build /path/to/recovered-model.json /path/to/new-export
```

The same recovery command accepts `.svg`, JSON 2, or a complete multi-page
export directory. For a site, pass the directory itself, not an individual page.
Write the recovered model outside that directory. Keep the whole site together,
including its `source/` files and manifest.

Recovery produces JSON 1, not the old coordinates or layout preferences. Bundled
documents and supported assets remain embedded in that recovered model. If the
target Waxwing cannot read the old artifact, use the original generator version
to recover its source first, then follow the target release's migration notes.
Do not guess field replacements when validation rejects a format.

## Check the result

Continue only after validation succeeds. Read any diagnostics before proceeding.
Compare the old and new views at readable zoom: check important connections,
qualifications, document links, grouping, and the chosen starting point.
For a rebuild without a source migration, recovered JSON 1 should match the
original resolved model; formatting and JSON key order need not match.
Keep the older export available until the new one is accepted.

## Version-specific migrations

### Current development snapshots → Unreleased

**Required source changes: none for supported formats.** Re-render or rebuild
using the instructions above. To use an architecture anchor, add a generation
option such as `--anchor services=orchestrator` when those IDs exist in your
model. To use a sequence entry, author its evidence-backed declaration following
the [entry contract](sequence-entry.md); no tool should guess that information.

### What each future breaking change must document

Record the exact source and target schema identifiers, supported Waxwing
versions, before/after JSON examples, transformation steps, and validation
commands. State which facts require human input, which information might be
lost, and how to retain the old result. Say explicitly when no migration is
required. Give changed formats distinct identifiers rather than relying on
silent edits to an already released schema definition.

Begin with these written instructions. Automate mechanical transformations
when real migrations make that useful; adding new system knowledge still
requires evidence.
