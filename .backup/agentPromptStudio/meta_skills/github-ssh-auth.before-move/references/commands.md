# Commands

## 1. 盘点现状

```bash
ls -la ~/.ssh
sed -n '1,160p' ~/.ssh/config
git remote -v
ssh -T -o StrictHostKeyChecking=accept-new git@github.com
```

## 2. 生成 GitHub 专用 key

```bash
ssh-keygen -t ed25519 -C "your-github-email@example.com" -f ~/.ssh/id_ed25519_github -N ""
cat ~/.ssh/id_ed25519_github.pub
```

## 3. 配置 `~/.ssh/config`

建议追加如下条目：

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes
```

## 4. 切换 remote 到 SSH

```bash
git remote set-url origin git@github.com:<owner>/<repo>.git
git remote -v
```

## 5. 验证

```bash
ssh -T git@github.com
git push origin main
```

如果默认分支不是 `main`，把最后一条命令替换为实际分支名。
