---
name: github-ssh-auth
description: '为 GitHub 仓库配置 SSH 推送能力的复用技能。Use when: 终端无法通过 HTTPS push、需要把仓库 remote 切到 SSH、需要生成或复用 SSH key 并挂到 GitHub 账号。'
---

# GitHub SSH Auth

这个技能用于把“本地仓库无法 push”升级为“终端可稳定通过 SSH 推送到 GitHub”。

它聚焦一个很具体的业务结果：让当前机器对目标 GitHub 仓库具备可复用的推送能力，而不是临时手输凭据。

## 何时使用

1. `git push` 因为 HTTPS 凭据缺失而失败。
2. 需要给某台机器配置长期可复用的 GitHub 推送权限。
3. 需要把仓库 remote 从 `https://github.com/...` 切换到 `git@github.com:...`。

## 强制原则

1. 先检查是否已有可用 SSH key，不要无脑覆盖。
2. 优先为 GitHub 单独创建专用 key，避免影响已有 SSH 用途。
3. 修改 `~/.ssh/config` 前，先理解现有配置，不要破坏其他主机条目。
4. 在真正 `git push` 前，先完成 `ssh -T git@github.com` 验证。
5. 任何仓库 remote 变更后，都要再次核对 `git remote -v`。

## 最小工作流

### 1) 盘点现状

- 查看 `~/.ssh/` 下已有 key
- 查看 `~/.ssh/config`
- 查看当前仓库 `git remote -v`
- 先测试一次 `ssh -T git@github.com`

### 2) 决定 key 策略

- 如果现有 key 已能通过 GitHub 验证，直接复用
- 如果现有 key 无法通过 GitHub 验证，创建 GitHub 专用 key
- 不要复用用途不明、已经绑定其他主机职责的 key

### 3) 配置 GitHub 专用 SSH 条目

- 在 `~/.ssh/config` 中添加 `Host github.com`
- 指向目标私钥
- 设置 `User git`
- 打开 `IdentitiesOnly yes`

### 4) 把公钥加到 GitHub

- 打开 GitHub SSH keys 页面
- `Key type` 选 `Authentication Key`
- `Title` 用可识别的设备名或用途名
- 粘贴公钥完整内容

### 5) 切换仓库 remote

- 把 remote 从 HTTPS 改成 SSH
- 目标格式：`git@github.com:<owner>/<repo>.git`
- 改完后立刻复查 `git remote -v`

### 6) 验证并推送

- 先跑 `ssh -T git@github.com`
- 再执行 `git push origin <branch>`
- 如果 push 成功，说明这台机器的 GitHub SSH 能力已经落地

## 任务路由

- 命令与标准顺序：先读 [references/commands.md](references/commands.md)
- 常见失败与修复：遇到权限、key 冲突、host 配置问题时读 [references/troubleshooting.md](references/troubleshooting.md)

## 交付标准

完成后至少满足这四点：

1. 目标仓库 remote 已切到 SSH
2. `ssh -T git@github.com` 成功
3. `git push` 成功
4. 记录当前使用的是哪把 key，以及它对应的 GitHub 用途
