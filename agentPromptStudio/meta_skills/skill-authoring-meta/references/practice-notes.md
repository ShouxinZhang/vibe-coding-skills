# 实践经验（本仓库）

## 基础规范

- 先把"主入口"与"细节文档"分离，避免 SKILL 过长。
- `references/` 应该是多文件模块化，不是单个 README 承载所有内容。
- `scripts/` 应保持纯脚本目录，便于直接执行与自动化调用。
- 脚本创建后要执行 `chmod +x`。
- 主入口中的路径要写到具体文件，避免模糊描述。

## 脚本编写经验（ppt-review 创建总结）

### 路径计算

- `SCRIPT_DIR` 到 repo root 的层级要数清楚：`.agents/skills/<name>/scripts/` = 4 层 `..`。
- 推荐加 debug 输出确认路径正确：`echo "📍 Repo root: $REPO_ROOT"`。
- 先手动验证核心命令能跑通，再组装到脚本里。

### 依赖声明

- 如果脚本依赖 npx 包（如 `serve`、`playwright-chromium`），在 SKILL.md 的"默认约束"或独立 `references/dependencies.md` 中声明。
- 区分"项目已有依赖"（如 `@slidev/cli`）和"脚本独立依赖"（如 `serve`），后者用 `npx -y` 自动安装。

### 后台进程管理

- 启动后台服务器的脚本**必须**用 `trap cleanup EXIT` 确保退出时 kill 进程。
- 端口选择使用不常见端口（如 31731），并在脚本开头加检测端口占用。
- 服务就绪检测用轮询 `curl + http_code`，设合理超时（30s）。

### bash + node heredoc 模式

- 前端工具链常需在 bash 中嵌入 Node.js 代码，用 `node - <<'NODEJS' ... NODEJS` heredoc。
- heredoc 标签加**单引号**（`'NODEJS'`）防止 bash 变量展开。
- Node 脚本通过 `process.argv` 接收 bash 传入的参数。

### 构建策略

- 对 Slidev/Vite 项目，"build → serve 静态文件"比"启动 dev server"更可靠。
- dev server 在后台 `&` 模式下可能不输出日志、不正常启动。

## 闭环验证模式

- **脚本产生产出物（截图/PDF）→ Copilot 用多模态能力分析产出物 → 对照 checklist 审阅**。
- 这种"自动化 + 多模态"闭环是技能设计的新范式，适用于 UI/布局类检查。
- 产出物存放路径应在 `output/` 下的子目录，不污染源码目录。

## SKILL.md description 设计

- `description` 字段是 Copilot 发现和调用技能的关键触发词。
- 推荐格式：`"技能名称。Use when: 场景1、场景2、场景3。"`
- 多写动词短语（检查、截图、对比、走查），帮助 Copilot 匹配用户意图。
