# Roadmap

Waxwing is an early, personally maintained project. These priorities describe
direction, not promised dates.

1. **First public release — shipped.** [0.1.0](https://github.com/isought/waxwing/releases/tag/v0.1.0)
   includes verified installation, the agent guide, and a source-backed example
   of Waxwing itself.
2. **Real-world validation.** Have an unfamiliar developer try the workflow,
   then evaluate another public codebase. Record omissions and failure cases.
3. **Improvements from use.** Address authoring friction, diagnostics, and
   diagram readability revealed by those trials before expanding the feature set.
4. **Source analysis foundations.** Separate knowledge, presentation, application
   workflows and interfaces; then define source/code/proof contracts and evaluate
   language adapters. [Initial targets](modules/analysis/README.md) include Lean 4.
   This work begins with local analysis and explicit evidence links to explanations.

The current release has no repository scanner, visual editor, or automatic
infrastructure discovery. Current features and limitations are described
in the [README](README.md) and [release notes](CHANGELOG.md).
