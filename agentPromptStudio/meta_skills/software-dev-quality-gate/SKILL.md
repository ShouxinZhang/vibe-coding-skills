---
name: software-dev-quality-gate
description: '通用软件研发质量门禁技能。根据任务类型选择静态检查、真实运行、GUI 交互或行为证据，要求 agent 在交付前留下与开发意图一致的验证结果。'
---

# Software Dev Quality Gate

这个技能用于把“开发完成”变成“有证据地完成”。

它不是某一种语言或框架专用门禁，而是一套通用方法论：先识别任务类型，再选择最贴近业务意图的验证方式，并留下可复验证据。

## 何时使用

1. 任何代码改动准备交付前。
2. 任何 agent 自主完成开发任务后。
3. 需要判断“代码看起来对”是否已经升级为“行为上真的对”时。

## 强制原则

1. 不能只做静态检查；要尽量做真实运行或行为验证。
2. 不能只说“应该可行”；必须留下证据工件。
3. 验证方式必须与任务类型匹配，而不是机械套一个命令。
4. 如果无法做 live 验证，必须明确记录阻塞原因、已验证到哪里、还缺什么证据。

## 工作流

### 1) 识别任务类型

- 后端 / API / 消息系统
- 前端 / Web GUI
- 桌面 GUI / 模拟器
- CLI / 自动化脚本
- 库 / 算法 / 纯逻辑
- 数据处理 / pipeline

### 2) 选择最贴近业务意图的证据

- 后端：真实请求、响应、状态变化、日志、副作用
- 前端：页面抓取、交互前后对比、关键控件状态变化
- 桌面 GUI：窗口截图、按键/点击/拖拽后的画面变化
- CLI：真实命令、退出码、生成文件、摘要输出
- 库 / 算法：样例输入输出、边界样例、严格测试
- pipeline：输入样本、输出样本、关键统计或中间结果

### 3) 执行最小可接受门禁

- 静态检查：lint / typecheck / build
- 运行检查：程序是否真正启动、请求是否真正返回
- 行为检查：业务动作后界面或状态是否真的变化
- 回归检查：关键已有路径是否仍成立

### 4) 产出证据

至少明确这四件事：

- 做了什么验证
- 看到了什么结果
- 结果是否与开发意图一致
- 还剩哪些风险或未覆盖项

## 任务类型路由

- **后端 / API / 消息系统**
  先读 [references/backend.md](references/backend.md)。
- **前端 / Web GUI**
  先读 [references/frontend.md](references/frontend.md)。
- **桌面 GUI / 模拟器**
  先读 [references/gui.md](references/gui.md)。
- **库 / 算法 / 纯逻辑**
  先读 [references/library.md](references/library.md)。
- **CLI / 脚本 / pipeline**
  先读 [references/cli.md](references/cli.md)。

## 复用现有技能

在当前仓库内，优先复用已有技能，而不是重写验证逻辑：

- Python 改动：`python-quality-gate`
- Java 逆向改动：`java-quality-gate`
- FreeJ2ME 构建：`freej2me-build-gate`
- X11 视觉取证：`x11-window-check`
- FreeJ2ME 剧情验证：`freej2me-story-check`

## 失败处理

如果门禁失败：

1. 不要把失败说成完成。
2. 记录失败点和证据。
3. 明确是代码问题、环境问题还是验证能力缺失。
4. 给出下一步最小修复动作。
