# Three workflows, one shared model

This fictional demo extends the orchestration fixture with two explicitly scoped
request/reply excerpts. It has one architecture graph, three workflows, and two
Markdown documents. All views share one canonical service registry.

```sh
npm ci
npm run demo:site
python3 -m http.server 4184 --bind 127.0.0.1 --directory examples/multi-page/generated
```

Open `http://127.0.0.1:4184/index.html` or the
[generated index](generated/index.html). Use another port if that one is occupied.

1. Open **Check stock**. Only that request/reply workflow is rendered.
2. Select **Orchestrator** for its shared claims and evidence.
3. Open **Choose a workflow** and follow **Orchestrator in the pricing view**.
   The page changes, but the component ID remains `orchestrator`.
4. Follow **the recording limits** to a heading in the other document.
5. Use **Contents** to open the architecture graph or the full checkout path.

The upstream triggers remain explicitly unknown. View names and navigation
categories do not assert independent service implementations or extra operations.
Source inputs and Markdown stay outside the generated directory. Rerunning the
command replaces an unchanged generated site. Do not manually edit its files.

```sh
node bin/waxwing.mjs recover examples/multi-page/generated /tmp/checkout-model.json
```

The directory, including `source/`, is the recoverable artifact. See the
[fixed publishing and linking rules](../../docs/site-export.md).
