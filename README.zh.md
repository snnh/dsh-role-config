---
description: "dsh 的角色预设与模型池：模型只选角色，由用户的规则决定用哪个模型，失败按角色链逐级回退。"
---

# dsh-role-config

[English](README.md) | 中文

这个 dsh bundle 给委派加了两条入口和一层决策：

- **角色预设**：模型按角色委派（`role: "premium"`），永远不知道背后是哪个模型。每个角色带模型可读的描述、优先级链，以及用户自己写的路由规则。
- **模型池**：模型可以直接点名的模型，每个都带用户写的描述。直连按原样执行，不参与回退。
- **路由规则**：在角色链首之前按顺序求值——提示词包含、正则、必需模态、最小上下文窗口、用户自己的能力标签。全不命中且开启 AI 路由时，由一次有界的路由器调用裁决；失败则回落链首。
- **优先级回退**：角色路径创建的子代理请求终局失败后，用同一请求改走链上下一个成员；链走完则原失败照常上报。
- **功能绑定**：上下文压缩与会话标题可以跟随某个角色，或保持 dsh 默认。

## 安装

```sh
dsh plugin --profile <profile> add github:snnh/dsh-role-config
```

git 安装会运行本包的 `prepare` 脚本，pnpm 默认拒绝，需在 profile 的 `pnpm-workspace.yaml` 里用 `allowBuilds` 放行；除 TypeScript 构建外，安装期不执行任何东西。

## 唯一的前置条件

本插件用官方 `subagent` 同名注册委派工具，只有当官方工具位于外层作用域时才能遮蔽它。请把官方 `tool-subagent` 行的 `modelSelectionSettings` 设为 `false`：

```yaml
- id: tool-subagent
  config:
    provider: spawn
    toolName: subagent
    modelSelectionSettings: false
```

开启模型选择时，官方工具会注册进每个 agent 自己的作用域，同作用域无法存在同名工具：插件会打印需要修改的行号并保留官方工具。若你更想保留官方配置，可用 `delegate.toolName` 改本插件的工具名。

## 配置

Web 侧栏打开 **Plugins**，选择 **Role Config**。页面编辑同一份 `role-config` 设置：模型池与描述、角色预设与链/规则、开关（暴露面、回退、AI 路由）、功能绑定、委派接线。

## 模型能看到什么

| 暴露面 | 内容 | 时机 |
| --- | --- | --- |
| `list_model_roles` | 角色 id + 描述；池内路由 + 描述 | 仅模型主动调用时 |
| 系统提示 | 同一份目录的紧凑版 | 仅开启 `exposure.sessionStart` |
| `subagent`（`role`） | 不含所选模型的任何信息 | 始终 |

角色的成员、规则与路由器的裁决**从不**到达模型。

## 限制

- 直接指定路由不走回退；主 agent 自身的请求也不回退。
- agent team 成员继承 Lead 的路由，本插件只能对成员做失败回退，不能挑模型。
- 功能绑定写的是目标行的配置，本身没有回退。
