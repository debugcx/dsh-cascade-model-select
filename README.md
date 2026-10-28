# dsh-cascade-model-select

[中文](README.zh.md)

A two-level (cascade) model picker for the DeepSeek Harness Web GUI: the composer's model menu lists **providers on the root level**, and each provider opens a **submenu with exactly its own models** — instead of one long flat list with sticky provider headings.

- Root menu: Effort row (when the current model advertises reasoning levels) + one row per provider (model count, ✓ on the provider owning the current selection).
- Provider submenu: that provider's models, with a fuzzy search box when it holds more than six models.
- `/model` keeps the original searchable grouped popup.
- Ships the same `conversation.input.model.label` child slot, so third-party model label badges keep working.

The bundle patch disables the built-in `ui-model-selection` while this bundle is enabled; disabling or removing this bundle restores the stock selector. Do not re-enable the stock selector alongside this plugin — both would compete for the same composer seat.

## Install

Settings/sidebar **Plugins** → install from the absolute path of this directory, e.g. `F:\dsh\dsh-cascade-model-select`. Reload the page (or restart the app) if the seat does not refresh in place.

## Develop

`lib/client.js` is a hand-written client-module bundle — no build step. After editing, toggle the plugin off and on (or restart) to load the new revision.
