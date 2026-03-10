# 新世纪科幻：从新世纪科学到严格想象

## 模块定位

`NewCenturySciFi` 不再只是一组并列的世界观随笔，而是一个面向长期扩写的创作母模块。它的目标不是简单堆叠“未来感概念”，而是先整理新世纪科学中最值得调用的前沿结构，再把这些结构转译为世界机制，最后产出可继续展开的故事原核。

这里所谓“新世纪科幻”，指的是在新世纪科学基础上的严格但有趣的想象力延伸。它既重视科学约束，也重视叙事可读性；既允许提出大胆假设，也要求每个假设带着代价、误差和制度后果一起出现。

## 这次重构解决什么问题

本模块此前已经积累了若干质量不错的主题文章，但仍有两个明显瓶颈。

第一，模块层级过浅。所有主题都直接并列在根目录，导致“科学依据”“世界机制”“故事应用”被写在同一平面上，不利于持续扩写。

第二，科学底座偏薄。世界观推演已经开始成形，但数学、AI、物理、化学、生物学等可被 agent 直接调用的前沿研究素材还不够丰富，因此后续创作容易重复既有设定，而难以稳定生成新的陌生感。

这次重构之后，模块将按三层组织：

1. 科学前沿层：整理值得进入科幻写作的前沿研究母题。
2. 世界机制层：讨论主体、文明、感知、时空等结构如何被这些母题改写。
3. 故事引擎层：把前两层压缩为可直接展开的故事原核。

## 模块结构

| 文件 | 内容简介 |
| --- | --- |
| [setting_premise.md](./setting_premise.md) | 整个模块共用的前提合同，规定哪些是假设、哪些是边界、哪些是推演。 |
| [scientific_foundations/introduction.md](./scientific_foundations/introduction.md) | 科学前沿层入口，整理数学、AI、物理化学、生物学等创作底座。 |
| [civilization_and_subjects/introduction.md](./civilization_and_subjects/introduction.md) | 主体与文明层入口，讨论生命、智能、意识、Agent 文明的制度化后果。 |
| [spacetime_and_perception/introduction.md](./spacetime_and_perception/introduction.md) | 时空与感知层入口，讨论高维感知、多元时空与观测边界。 |
| [story_engine/introduction.md](./story_engine/introduction.md) | 故事引擎层入口，把前提和机制压缩为可继续扩写的叙事种子。 |

## 为什么要把科学前沿单独拆出来

新世纪科幻的写作主体越来越多地由 agent 承担，这意味着模块不能只提供“写好的世界观”，还要提供“可被调用的科学材料库”。如果没有这层底座，agent 容易把高维、意识、文明这些词当成标签，而不是把它们写成由具体研究推动出来的制度后果。

因此，科学前沿层优先覆盖五类最适合进入本模块的材料：

- 数学：代数学、拓扑学、分析学、概率与优化，为结构、边界、稳定性和不确定性提供语言。
- AI：强化学习（Reinforcement Learning）、大语言模型（Large Language Models）、多智能体系统，为人工主体、协商和治理提供原型。
- 物理：时空结构、信息传播、能量约束、观测与测量，为硬边界提供底线。
- 化学：材料、反应、合成与环境耦合，为陌生生命和工业生态提供机制。
- 生物学：进化、发育、生态、神经与共生，为生命定义和适应压力提供现实模板。

## 阅读顺序

推荐按以下顺序阅读：

1. 先读 [setting_premise.md](./setting_premise.md)，接受整个模块的讨论合同。
2. 再读 [scientific_foundations/introduction.md](./scientific_foundations/introduction.md)，先建立“可调用的科学母体”。
3. 然后读 [civilization_and_subjects/introduction.md](./civilization_and_subjects/introduction.md) 和 [spacetime_and_perception/introduction.md](./spacetime_and_perception/introduction.md)，理解科学前沿如何改写主体、制度、感知和时空。
4. 最后读 [story_engine/introduction.md](./story_engine/introduction.md)，检查这些机制能否稳定长出故事，而不是只剩设定表演。

## 对 agent 写作者的价值

从业务角度看，这个结构的意义很直接。

第一，它提高创作一致性。agent 可以先选科学前提，再选世界机制，再落到故事冲突，减少“灵感很好但推演发散”的问题。

第二，它提高扩写效率。后续新增文章不需要继续塞在根目录，只需判断自己属于哪一层、哪个子模块。

第三，它提高内容密度。数学前沿、RL、LLM、复杂生命这些内容被拆成独立入口后，后续可以持续增强而不打乱已有世界观主线。

## 使用方式

这个模块最适合被当成一种创作协议，而不是一次性设定展示：

- 先从科学前沿层选择一个真实研究母题。
- 再判断这个母题会改变哪一类主体、制度、感知或时空结构。
- 最后把变化压缩成一个角色必须承担代价的故事冲突。

如果一条设定无法回答“它源自哪类前沿研究”“它改变了什么制度”“角色为此承担什么成本”，那么它还不够像新世纪科幻。
