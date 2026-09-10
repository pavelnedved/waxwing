# Multi-page export: fixed folders, automatic links

Use a site when one model has many views or documents. Keep the existing
single-file export for an attachment containing everything. This is a publishing
choice; JSON 1 and JSON 2 keep their existing contracts.

## Commands and fixed structure

```sh
node bin/waxwing.mjs build-site /path/to/model.json /path/to/export
# Or start from already generated JSON 2:
node bin/waxwing.mjs render-site /path/to/layout.json /path/to/export
```

`build-site` accepts the same architecture `--group` and `--direction` options as
`build`. Sequence models reject those options. The initial site exporter publishes
**all** included graphs, workflows and documents from **one** validated model;
every view must be drawable. There is no page-selection, custom-path or navigation
configuration yet, and no cross-model ID registry. It neither discovers models
by scanning folders nor infers relationships from their locations.

```text
export/
  index.html
  graphs/<graph-id>.html
  workflows/<workflow-id>.html
  documents/<document-id>.html
  assets/site.css
  assets/site.js
  source/model.json
  source/layout.json
  waxwing-site.json
```

Empty page categories need no directory. A standalone sequence uses
`graphs/<model-id>.html`; a workflow here means an architecture workflow record.
Filenames use stable IDs, not titles. Titles can change without changing URLs;
renaming an ID changes its URL. The generated index groups by record kind and
lists records in their source collection order. This is navigation order, never
an execution-order or containment claim. The index has a title/question filter.

Source files stay in their own locations. `build-site` uses the existing document
loader: Markdown paths resolve relative to the authoring model, and Markdown
links/images relative to their originating Markdown file. Resolved canonical
source is retained in the export, with original Markdown and embedded local
images. The output is not a new authoring directory.

## Reference identity becomes a generated URL

Authors keep using existing typed references and Markdown targets. Examples:

| Authored reference | From a document page |
|---|---|
| `#workflow=checkout-run` | `../workflows/checkout-run.html` |
| `#workflow=checkout-run&node=orchestrator` | `../workflows/checkout-run.html#record-orchestrator` |
| `#step=stock-result` | `../workflows/checkout-run.html#record-stock-result` |
| `#graph=services` | `../graphs/services.html` |
| A registered `.md` link with a heading | `other-document.html#ww-doc-<document-id>--<heading-slug>` |

Links within the current page can use just the fragment. Users do not manually
configure each HTML link. The exporter resolves validated record identity and
explicit graph/workflow context into the fixed destination. Ambiguous graph
references still require `graphRef`; location in a folder does not choose one.
An attachment to a component shown in several architecture graphs lists those
graph destinations. Attachments to records in no view are labeled as not shown.

Each page links to Contents. Graph pages link to their parent/child graphs and
workflows; workflow pages link back to their architecture graph. Documents link
to their attachments, and diagram records link to attached documents. Ordinary
browser Back/Forward and reload preserve page and record/heading destinations.
Missing fragment targets show an explicit notice instead of silently selecting a
record. Public external links are unchanged.

## Reading and portability

Diagram pages use the existing SVG geometry and styles. They provide zoom,
record/evidence inspection, attached documents, uncertainty highlighting, and
style/theme selectors. Each page renders one diagram and the relevant records;
it does not embed every sibling SVG or the complete JSON 2 payload. Shared
components keep their canonical IDs. Graph/workflow readability warnings use a
stated reference viewport. The single-file viewer retains its richer operation
and boundary highlighting controls; the first site viewer highlights unknown,
disputed and qualified claims, plus the selected record.

CSS and plain JavaScript are local shared files. No framework, CDN, runtime
source fetch, Waxwing service, router rewrite or network discovery is needed.
Plain relative URLs work under a static host's subdirectory. Publish or move the
**whole directory** with the relative structure intact. Moving one HTML page
alone cannot preserve sibling links or shared assets. No automatic redirects
are generated for previously published URLs whose IDs change.

Direct-file opening is intended, but browser policy may block it; this session's
browser verification used localhost because its `file://` check was rejected.
Use an allowed local/static preview when needed. Host security policies can also
restrict scripts. Links, rendered Markdown and expandable record details remain
ordinary HTML; zoom and the inspector need JavaScript.

## Source recovery and updates

The **directory** is the complete artifact. `source/layout.json` contains full
JSON 2, including complete JSON 1 and its digest. `source/model.json` is a convenient
separate JSON 1 handoff; source is duplicated there deliberately, not in each
page. Full source includes records and qualifications beyond what any one diagram
visibly draws. The site manifest records page destinations, source digests and
file checksums; it is generated build metadata, not system information.

```sh
node bin/waxwing.mjs recover /path/to/export /path/to/recovered-model.json
# Complete JSON 2 also remains a normal recovery entry point:
node bin/waxwing.mjs recover /path/to/export/source/layout.json /path/to/recovered-model.json
```

Directory recovery checks the manifest, files and consistent source snapshots.
Recover outside the managed directory. Recovering an individual site page fails
with instructions to use the directory or `source/layout.json`; a page does not
claim to be a full model. Existing single-file SVG/HTML recovery is unchanged.

Edit authoring JSON/Markdown, then rerun `build-site`. All output is computed
before publishing. The writer stages a complete directory beside the destination,
then replaces the previous generated directory with rollback on an installation
failure. This is a local build operation, not a zero-downtime hosting/deployment
protocol. Obsolete generated pages are removed when their records disappear.

The destination must be new, empty, or an unchanged Waxwing site. Modified,
missing or extra files, unrelated directories and symlinks are rejected before
replacement. The error names the conflict; choose a new directory or restore the
generated output. Do not put hand-maintained content in the output or move its
pages manually. Inputs may not be inside the destination. Rebuilds do not guess
how to merge manual page edits. Checksums detect accidental changes; they are not
signatures or a claim that source facts are true.

## Module entry point

```js
import { loadModel } from '@felixfelicis/waxwing/documents';
import { layoutModel } from '@felixfelicis/waxwing/layout';
import { renderSite, writeSite, recoverSite } from '@felixfelicis/waxwing/site';

const { model, inputFiles } = loadModel('/path/to/model.json');
const json2 = await layoutModel(model);
const files = renderSite(json2, { skin: 'engineering' }); // Map<relative path, text>
writeSite(files, '/path/to/export', { inputFiles });
const recovered = recoverSite('/path/to/export');
```

`renderSite` validates JSON 2 and does not write files; callers may inspect the
complete output map before writing. `writeSite` enforces the managed-directory
rules. `recoverSite` verifies the exported directory before returning JSON 1.
The only render option is `skin` (`standard`, `engineering`, `editorial`). Do not
edit rendered files between `renderSite` and `writeSite`: the manifest must match.

Run `npm run demo:site` for the [three-workflow example](../examples/multi-page/README.md).
