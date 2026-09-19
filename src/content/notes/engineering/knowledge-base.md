---
title: 公开知识库的主干与边界
created: 2026-09-19
updated: 2026-09-19
description: 用 Markdown 保存公开知识，用 GitHub main 作为主干，并明确公开与私人的边界。
tags:
  - 知识管理
  - Markdown
  - Git
category: 工程实践
status: stable
draft: false
---

## 核心结论

公开知识库的核心资产是可迁移的 Markdown 文件，而不是某个平台里的数据库。GitHub `main` 保存公开知识的主干版本，本地仓库和 Obsidian 用于同步后的阅读与编辑。

## 三条边界

- ChatGPT 负责解释、整理和维护知识；只有在明确表达“记一下”“整理成笔记”或“发布成文章”时，才准备写入。
- Posts 是成熟的正式文章，Notes 是可以持续补充的知识单元；不要因为一次讨论就创建多个重复文件。
- 公开仓库中的内容默认所有人可见。私人日记、聊天记录、账号信息、密钥和内部资料必须留在独立的 Personal Vault。

## 日常维护

先用 `pnpm sync` 获取 GitHub 上的最新版本，再编辑、预览、提交和推送。同步遇到未提交修改、本地领先或分叉时，应停下来人工审查，而不是自动覆盖或解决冲突。
