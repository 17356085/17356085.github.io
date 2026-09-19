---
title: 'Git笔记'
published: 2025-08-13
description: '一些git常用的指令。'
author: 'Astro 学习者'
tags: ["git", "后端开发"]
category: 后端 
image: /img/祥子.png
updated: 2025-08-13
---

以下是 Git 最常用的核心指令清单，分为 **基础操作**、**分支管理**、**撤销操作** 和 **远程协作** 四类，附带通俗解释：

---

### 一、基础操作（每天必用）

| 命令 | 说明 | 示例 |
|------|------|------|
| `git init` | 初始化新仓库 | `git init` |
| `git clone <url>` | 克隆远程仓库 | `git clone https://github.com/user/repo.git` |
| `git add <file>` | 添加文件到暂存区 | `git add index.html` |
| `git add .` | 添加**所有改动**（含新增/修改/删除） | `git add .` |
| `git commit -m "msg"` | 提交暂存区内容 | `git commit -m "修复登录bug"` |
| `git status` | 查看工作区状态 | `git status` |
| `git log` | 查看提交历史 | `git log --oneline`（简洁版） |

---

### 二、分支管理（多人协作核心）

| 命令 | 说明 | 示例 |
|------|------|------|
| `git branch` | 查看本地分支 | `git branch` |
| `git branch <name>` | 创建新分支 | `git branch feature` |
| `git checkout <branch>` | 切换分支 | `git checkout main` |
| `git checkout -b <branch>` | 创建并切换分支 | `git checkout -b hotfix` |
| `git merge <branch>` | 合并分支到当前分支 | `git merge feature` |
| `git branch -d <branch>` | 删除分支 | `git branch -d feature` |

---

### 三、撤销操作（救命必备）

| 命令 | 说明 | 场景 |
|------|------|------|
| `git restore <file>` | 丢弃**工作区**修改 | 改乱了文件想复原 |
| `git restore --staged <file>` | 将文件移出**暂存区** | `git add` 后反悔 |
| `git reset --soft HEAD^` | 撤销 commit（保留改动到暂存区） | 提交信息写错了 |
| `git reset --hard HEAD^` | **彻底**回退到上一版本（慎用！） | 想完全放弃最近提交 |

---

### 四、远程协作（GitHub 同步）

| 命令 | 说明 | 示例 |
|------|------|------|
| `git remote -v` | 查看远程仓库地址 | `git remote -v` |
| `git pull` | 拉取远程更新（= fetch + merge） | `git pull origin main` |
| `git push` | 推送到远程仓库 | `git push origin main` |
| `git fetch` | 仅下载远程变更（不自动合并） | `git fetch origin` |

---

### 🚀 高效组合技

1. **一键提交**：  

   ```bash
   git add . && git commit -m "更新" && git push
   ```

2. **紧急修复**（跳过暂存）：  

   ```bash
   git commit -am "紧急修复" && git push
   ```

3. **撤销未提交的改动**：  

   ```bash
   git restore .  # 丢弃所有工作区修改
   ```

---

### ⚠️ 注意避坑

1. `git add .` 会添加所有文件（包括临时文件），建议用 `.gitignore` 过滤
2. `git push -f` （强制推送）会覆盖远程历史，团队协作时禁用！
3. 提交前一定用 `git status` 确认文件状态

> 💡 建议配置别名简化操作（在 `~/.gitconfig` 添加）：  
>
> ```ini
> [alias]
>   co = checkout
>   br = branch
>   st = status
>   ci = commit
>   df = diff
> ```
