# Troubleshooting

## `Permission denied (publickey)`

说明 GitHub 没认出当前私钥。

排查顺序：

1. 公钥是否已经加到正确的 GitHub 账号
2. `~/.ssh/config` 是否指向了正确私钥
3. `ssh -T git@github.com` 走的是不是预期 key

可用命令：

```bash
ssh -vT git@github.com
```

## 现有 key 不知道能不能复用

不要猜。

先测试：

```bash
ssh -T git@github.com
```

如果失败，再创建 GitHub 专用 key，而不是改坏原 key。

## Chrome 或浏览器里已经登录 GitHub，但终端还是不能 push

浏览器登录态和 Git SSH 没关系。

Git SSH 只认：

- 本地私钥
- GitHub 账号里登记过的公钥
- 仓库 remote 是否使用 SSH 协议

## remote 还是 HTTPS

即便 SSH 已配置成功，只要 remote 还是 `https://github.com/...`，`git push` 仍可能要求 HTTPS 凭据。

检查：

```bash
git remote -v
```

如果不是 `git@github.com:...`，就切换。

## 想让 agent 后续也能直接 push

要满足两件事：

1. 这台机器已经能 `ssh -T git@github.com`
2. 目标仓库 remote 已切成 SSH

只有这样，agent 在终端里执行 `git push` 才能真正复用这套能力。
