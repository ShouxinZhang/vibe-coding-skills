# 智能体系统的抽象基础

## 一、智能体的形式化定义

### 1.1 感知-决策-行动循环

智能体（Agent）的经典定义来自 Russell & Norvig：一个能够通过传感器感知环境、通过执行器作用于环境的实体。其行为由 **Agent 函数** 决定——从感知历史到动作的映射：

$$
f: \mathcal{P}^* \rightarrow \mathcal{A}
$$

其中 $\mathcal{P}^*$ 是所有可能的感知序列集合，$\mathcal{A}$ 是动作空间。Agent 函数决定了 Agent 在任何感知历史下的行为，是 Agent 的完整行为规范。

实际系统中，Agent 函数通过 **Agent 程序**（Agent Program）实现——运行在物理架构上的具体算法。Agent 程序接收当前感知（而非完整历史），结合内部状态做出决策。

### 1.2 理性智能体

**理性智能体（Rational Agent）** 的目标是最大化期望效用。给定性能度量 $U$、环境知识、感知历史和可执行动作集，理性 Agent 选择能最大化期望性能的动作：

$$
a^* = \arg\max_{a \in \mathcal{A}} \mathbb{E}[U \mid a, \text{percepts}, \text{knowledge}]
$$

理性不等于全知。理性 Agent 在信息不完整时做出**当前最优**的决策，并通过信息收集行为（Exploration）主动减少不确定性。

### 1.3 Agent 的核心属性

| 属性 | 定义 | 在多 Agent 系统中的意义 |
|------|------|----------------------|
| 自主性（Autonomy） | 不依赖人类直接干预，自主做出决策 | 系统的可扩展性基础 |
| 反应性（Reactivity） | 感知环境变化并及时响应 | 实时协调的前提 |
| 主动性（Pro-activeness） | 主动采取行动以实现目标，而非被动响应 | 涌现行为的驱动力 |
| 社会性（Social Ability） | 通过通信协议与其他 Agent 交互 | 多 Agent 协作的核心 |

---

## 二、环境建模

### 2.1 环境分类维度

环境的性质直接决定了 Agent 的设计策略。经典分类维度：

| 维度 | 类型 | 描述 | 示例 |
|------|------|------|------|
| 可观测性 | 完全可观测 / 部分可观测 | Agent 能否感知环境全部状态 | 国际象棋 vs 扑克 |
| 确定性 | 确定 / 随机 | 下一状态是否完全由当前状态和动作决定 | 数独 vs 骰子游戏 |
| 时间性 | 静态 / 动态 | 环境是否在 Agent 思考时变化 | 填字游戏 vs 自动驾驶 |
| 离散性 | 离散 / 连续 | 状态空间和动作空间是否有限 | 棋盘游戏 vs 机器人控制 |
| Agent 数量 | 单 Agent / 多 Agent | 环境中是否存在其他 Agent | 迷宫求解 vs 多人博弈 |

### 2.2 马尔可夫决策过程（MDP）

**马尔可夫决策过程（Markov Decision Process, MDP）** 是完全可观测、单 Agent 环境的标准形式化框架：

$$
\text{MDP} = \langle S, A, T, R, \gamma \rangle
$$

- $S$：状态空间
- $A$：动作空间
- $T: S \times A \times S \rightarrow [0, 1]$：状态转移函数，$T(s, a, s') = P(s' \mid s, a)$
- $R: S \times A \rightarrow \mathbb{R}$：奖励函数
- $\gamma \in [0, 1)$：折扣因子

Agent 的目标是找到最优策略 $\pi^*: S \rightarrow A$，使期望累积折扣回报最大化：

$$
\pi^* = \arg\max_\pi \mathbb{E}\left[\sum_{t=0}^{\infty} \gamma^t R(s_t, a_t) \mid \pi\right]
$$

### 2.3 部分可观测 MDP（POMDP）

现实中 Agent 很少能完全观测环境状态。**部分可观测马尔可夫决策过程（POMDP）** 在 MDP 基础上引入观测函数：

$$
\text{POMDP} = \langle S, A, T, R, \Omega, O, \gamma \rangle
$$

新增 $\Omega$（观测空间）和 $O: S \times A \times \Omega \rightarrow [0, 1]$（观测函数）。Agent 无法直接获取 $s$，只能根据观测 $o$ 维护对状态的**信念（Belief）** 分布 $b(s) = P(s \mid h_t)$，其中 $h_t$ 是历史观测-动作序列。

### 2.4 马尔可夫博弈

**马尔可夫博弈（Markov Game）**，也称**随机博弈（Stochastic Game）**，是 MDP 到多 Agent 环境的自然推广：

$$
\text{MG} = \langle N, S, \{A_i\}_{i \in N}, T, \{R_i\}_{i \in N}, \gamma \rangle
$$

- $N = \{1, 2, \ldots, n\}$：Agent 集合
- $\{A_i\}$：每个 Agent 的动作空间
- $T: S \times A_1 \times \ldots \times A_n \times S \rightarrow [0, 1]$：联合状态转移函数
- $\{R_i\}$：每个 Agent 各自的奖励函数

与单 Agent MDP 的关键区别：每个 Agent 的奖励和最优策略依赖于**所有其他 Agent 的策略**。这导致环境从 Agent 视角是**非平稳的（Non-stationary）**——其他 Agent 的策略变化使得"环境"本身在变化。

---

## 三、通信与协调

### 3.1 通信模型

多 Agent 系统的通信分为两大类：

**直接通信（Direct Communication）**：Agent 之间通过消息传递直接交换信息。消息可以是结构化的（FIPA-ACL 消息）或非结构化的（自然语言）。优点：信息传递精确、延迟低。缺点：通信开销随 Agent 数量增长。

**间接通信（Indirect Communication）**：Agent 通过共享环境交换信息，无需直接对话。典型模式是**黑板系统（Blackboard System）**——所有 Agent 读写同一个共享数据空间；以及**信息素机制（Stigmergy）**——Agent 在环境中留下标记，其他 Agent 感知这些标记做出反应，蚁群算法是经典案例。

### 3.2 言语行为理论

**言语行为理论（Speech Act Theory）** 源自语言哲学，被 Agent 通信协议广泛采用。一个言语行为包含三个层次：

- **言内行为（Locution）**：说了什么——消息的字面内容
- **言外行为（Illocution）**：想做什么——请求、承诺、声明、询问
- **言后行为（Perlocution）**：实际效果——接收方是否被说服、是否采取行动

FIPA-ACL（Foundation for Intelligent Physical Agents - Agent Communication Language）是基于言语行为理论设计的标准 Agent 通信语言，定义了 `inform`、`request`、`propose`、`accept-proposal` 等标准消息执行式。

### 3.3 LLM 时代的通信

LLM 驱动的 Agent 系统带来了通信范式的根本变化：**自然语言成为通信协议**。

传统 Agent 通信依赖形式化协议（FIPA-ACL、KQML），消息结构刚性、语义受限。LLM Agent 直接用自然语言对话，表达力极强但歧义性高。当前的工程实践通常采用折中方案——用结构化模板约束自然语言输出，例如 JSON 格式包裹自然语言内容，兼顾可解析性与表达力。

### 3.4 协调机制分类

| 机制 | 原理 | 优点 | 缺点 | 典型应用 |
|------|------|------|------|---------|
| 集中式协调 | 中央控制器收集信息、统一决策 | 全局最优 | 单点故障、瓶颈 | 交通信号控制 |
| 合同网协议 | 任务发布→竞标→中标→执行 | 分布式、灵活 | 通信开销大 | 任务分配 |
| 拍卖机制 | Agent 对资源竞价，市场均衡分配 | 激励相容 | 策略操纵风险 | 资源分配 |
| 社会规范 | Agent 遵循预定义的角色与行为准则 | 低通信成本 | 适应性差 | 角色扮演系统 |

---

## 四、博弈论基础

### 4.1 博弈的表示形式

**标准形式（Normal Form）**：用收益矩阵表示。对于二人博弈，矩阵的行代表玩家 1 的策略，列代表玩家 2 的策略，每个格子包含双方收益。

**扩展形式（Extensive Form）**：用博弈树表示。节点代表决策点，边代表动作，叶节点标注收益。扩展形式能表达序贯决策和信息集。

### 4.2 纳什均衡

**纳什均衡（Nash Equilibrium）** 是多 Agent 系统中最基本的均衡概念。在纳什均衡下，任何 Agent 单方面偏离当前策略都无法改善自身收益：

$$
\forall i \in N, \quad u_i(\sigma_i^*, \sigma_{-i}^*) \geq u_i(\sigma_i, \sigma_{-i}^*), \quad \forall \sigma_i \in \Sigma_i
$$

其中 $\sigma_i^*$ 是 Agent $i$ 的均衡策略，$\sigma_{-i}^*$ 是其他所有 Agent 的均衡策略组合。

Nash 定理保证了每个有限策略博弈至少存在一个**混合策略纳什均衡**（Mixed Strategy Nash Equilibrium），即 Agent 以概率分布选择动作而非确定性选择。

### 4.3 合作博弈 vs 非合作博弈

**非合作博弈**：每个 Agent 独立决策，不存在有约束力的协议。分析工具是纳什均衡。

**合作博弈**：Agent 可以形成联盟（Coalition），联盟成员共同行动并分享收益。核心问题是**如何公平分配联盟收益**。

### 4.4 典型博弈模型

| 博弈 | 结构 | 纳什均衡 | 启示 |
|------|------|---------|------|
| 囚徒困境 | 合作优于互叛，但个体理性导致互叛 | 双方背叛 | 理性个体可能导致集体次优 |
| 协调博弈 | 双方选择相同策略时收益最高 | 多个均衡 | 需要通信或惯例来协调 |
| 鹰鸽博弈 | 双方都凶（鹰）则两败，一方退让（鸽）则可共存 | 混合策略均衡 | 冲突中的退让策略 |

### 4.5 Shapley 值

**Shapley 值（Shapley Value）** 是合作博弈中公平分配联盟收益的解概念。Agent $i$ 的 Shapley 值定义为其对所有可能联盟的边际贡献的加权平均：

$$
\phi_i(v) = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|!\,(|N|-|S|-1)!}{|N|!} \left[v(S \cup \{i\}) - v(S)\right]
$$

其中 $v(S)$ 是联盟 $S$ 的价值函数。Shapley 值满足四条公理：对称性、效率性、虚拟玩家、可加性，是唯一满足这四条公理的分配方案。

### 4.6 不完全信息博弈

**贝叶斯博弈（Bayesian Game）** 是 Agent 不完全了解其他 Agent 特征（类型）时的博弈模型。每个 Agent 有一个**类型（Type）**，类型决定其收益函数。Agent 知道自己的类型，但只知道其他 Agent 类型的**先验概率分布**。

均衡概念扩展为**贝叶斯纳什均衡（Bayesian Nash Equilibrium）**：每个 Agent 在给定自身类型和对他人类型的信念下，选择最大化期望收益的策略。

---

## 五、多智能体强化学习（MARL）概览

### 5.1 独立学习者

最简单的多 Agent RL 方法：每个 Agent 独立运行标准 RL 算法（如 DQN、PPO），**将其他 Agent 视为环境的一部分**。

问题：其他 Agent 也在学习和改变策略，导致环境从单个 Agent 视角是非平稳的。这违反了 MDP 的马尔可夫假设，使得收敛性无法保证。独立 Q-Learning 在实践中经常震荡或发散。

### 5.2 CTDE 范式

**集中训练、分散执行（Centralized Training with Decentralized Execution, CTDE）** 是当前 MARL 的主流范式：

- **训练时**：可以访问全局信息（所有 Agent 的观测和动作），使用全局价值函数或联合策略进行优化
- **执行时**：每个 Agent 仅根据自己的局部观测做决策，不需要全局通信

CTDE 解决了独立学习的非平稳性问题（训练时考虑了其他 Agent），同时保持了执行时的可扩展性。

### 5.3 代表性算法

**QMIX**：每个 Agent 学习独立的 Q 函数 $Q_i(o_i, a_i)$，然后用一个单调混合网络（Mixing Network）将它们组合为全局 Q 值 $Q_{tot}$。单调性约束保证个体最优动作的组合即为全局最优。

**MAPPO**：Multi-Agent PPO，每个 Agent 运行独立的 PPO 策略，共享一个全局价值网络（Centralized Critic）。实践中在多种基准环境上表现稳健。

**MADDPG**：Multi-Agent DDPG，适用于连续动作空间。每个 Agent 有独立的 Actor 和一个集中式 Critic（输入所有 Agent 的观测和动作）。

### 5.4 核心挑战

**非平稳性（Non-stationarity）**：每个 Agent 都在学习，导致环境动态持续变化。一个 Agent 的最优策略在其他 Agent 更新后可能不再最优。

**信用分配（Credit Assignment）**：团队获得了全局奖励，但如何判断每个 Agent 的贡献？QMIX 的值分解、Shapley 值都是这一问题的解决方案。

**通信学习（Learning to Communicate）**：Agent 是否应该学习何时通信、传递什么信息？CommNet、TarMAC 等工作探索了让 Agent 学习通信策略的方法。

---

## 六、LLM 驱动的智能体架构

### 6.1 从 RL Agent 到 LLM Agent

传统 MARL Agent 通过奖励信号学习策略，需要大量交互数据；LLM Agent 通过自然语言推理做决策，具备零样本泛化能力。两种范式的对比：

| 维度 | RL Agent | LLM Agent |
|------|---------|-----------|
| 决策依据 | 学习到的价值函数/策略 | 自然语言推理链 |
| 数据需求 | 海量交互数据 | 预训练知识 + 少量提示 |
| 泛化能力 | 任务特定 | 跨任务泛化 |
| 可解释性 | 低（黑箱策略） | 高（推理过程可读） |
| 精确度 | 高（在训练分布内） | 中（幻觉风险） |

### 6.2 LLM Agent 的基本组件

- **规划（Planning）**：将复杂目标分解为子任务序列。如 Chain-of-Thought、Tree-of-Thought、ReAct
- **记忆（Memory）**：短期记忆（上下文窗口）+ 长期记忆（向量数据库检索）
- **工具使用（Tool Use）**：调用 API、执行代码、搜索网络——扩展 Agent 的能力边界
- **反思（Reflection）**：评估自身行为，从错误中学习。如 Reflexion 框架

### 6.3 当前局限

**幻觉（Hallucination）**：LLM 可能生成看似合理但实际错误的内容，在多 Agent 系统中错误会被放大和传播。

**上下文窗口限制**：即便是 128K token 的模型，在复杂多轮多 Agent 交互中也会迅速耗尽上下文。

**一致性维护**：多个 LLM Agent 在长期交互中保持角色、立场、策略的一致性极具挑战。
