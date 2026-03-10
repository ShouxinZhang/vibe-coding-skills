# 免费部署

这个站点默认采用 `GitHub Pages` 免费发布，适合公开仓库长期维护。

## 为什么选 GitHub Pages

- 免费：公开仓库即可使用
- 省事：和 GitHub Actions 集成，推送到主分支就能自动发布
- 适合当前项目：站点以静态内容为主，不需要额外后端

## 站点如何发布

仓库里已经补好了 GitHub Actions 工作流：

- 安装 `site/` 模块依赖
- 构建 VitePress 静态站点
- 上传构建产物到 GitHub Pages
- 自动部署到 Pages 环境

## 发布前需要你在 GitHub 做的唯一操作

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 将 Source 设置为 `GitHub Actions`

## 部署路径说明

工作流会自动判断仓库类型：

- 如果仓库名是 `xxx.github.io`，站点根路径使用 `/`
- 如果是普通仓库，站点会自动使用 `/<repo-name>/` 作为基础路径

这样本地开发和 GitHub Pages 发布都能兼容。

## 本地运行

```bash
cd site
npm install
npm run docs:dev
```

## 本地构建

```bash
cd site
npm run docs:build
```
