---
description: "Role presets and a model pool for dsh: the model delegates to a role, the operator's rules pick the model, and a failure walks the role's chain."
---

# dsh-role-config

English | [中文](README.zh.md)

A dsh bundle that gives delegation two ways in and one decision layer:

- **Role presets.** The model delegates to a role (`role: "premium"`) and never
  learns which model serves it. Each role carries a description the model
  reads, a priority chain, and the operator's own routing rules.
- **Model pool.** Models the model may name directly, each with the
  description the operator wrote for it. A direct route is used as given and
  never fails over.
- **Routing rules.** Before a role's chain head serves, its conditions run in
  order: prompt substrings, a regular expression, required input modalities,
  a minimum context window, or the operator's own capability tags. Nothing
  matched and AI routing is on, one bounded router call decides; if it fails,
  the chain head serves.
- **Priority failover.** A delegated child whose request fails terminally
  retries the same request on the next member of its role's chain, and the
  original failure stands once the chain is exhausted.
- **Function bindings.** Context compaction and session titles can follow a
  role instead of the session's route, or keep the harness default.

## Install

```sh
dsh plugin --profile <profile> add github:snnh/dsh-role-config
```

A git install runs this package's `prepare` script, which pnpm refuses until
you allow it (`allowBuilds` in the profile's `pnpm-workspace.yaml`); nothing
here runs at install time beyond the TypeScript build.

## The one prerequisite

This plugin registers its delegation tool under the official `subagent` name,
which shadows the official tool only while that tool lives in an outer scope.
Set `modelSelectionSettings: false` on the official `tool-subagent` row (both
in the shipped presets and in any preset you added):

```yaml
- id: tool-subagent
  config:
    provider: spawn
    toolName: subagent
    modelSelectionSettings: false
```

With model selection on, the official tool registers inside every agent's own
scope, where a same-named tool cannot exist: the plugin logs which row to fix
and leaves the official tool in place. `delegate.toolName` renames this
plugin's tool instead, if you would rather keep the official configuration.

## Configure

Open **Plugins** in the Web sidebar and select **Role Config**. The page edits
one `role-config` settings section: the pool with its descriptions, the role
presets with their chains and rules, the switches (which surfaces exist,
failover, AI routing), the function bindings, and the delegation wiring.

## What the model sees

| Surface | Content | When |
| --- | --- | --- |
| `list_model_roles` | Role ids with descriptions, and pool routes with descriptions | Only when the model calls it |
| System prompt | The same catalog, compact | Only with `exposure.sessionStart` |
| `subagent` (`role`) | Nothing about the chosen model | Always |

A role's members, rules, and the router's answer never reach the model.

## Limits

- A role never fails over for a directly named route, and the main agent's own
  requests never fail over.
- Agent-team members inherit the lead's route; this plugin can only fail them
  over, not choose their model.
- Function bindings write the target row's configuration and have no failover
  of their own.
