# Prism Codex `/goal` Prompt

> 基于本地计划文件：`docs/prism-product-optimization-plan.md`
> 更新日期：2026-05-15
> 用途：在 Codex CLI 中启动可长期运行、可验证、可暂停/恢复的 Prism 优化目标。

## 本地计划文件

产品优化方案已保存到：

```text
docs/prism-product-optimization-plan.md
```

这份计划是 Prism 后续产品优化、工程重构、issue 拆分和 `/goal` 长任务执行的本地事实来源。它不是让 Codex 一次性吞掉的无限 backlog；更合适的使用方式是：每次只推进一个可验证 checkpoint，并按风险分层选择验证强度，避免把发布级 smoke 固定塞进每个开发切片。

当前还有一份核心闭环审计：

```text
docs/verification/prism-1.0x-core-closure-audit.md
```

后续 `/goal` 应优先从这份审计里的“弱验证 / 未闭环但属于核心”的条目开始，而不是继续堆新功能。

## 验证策略：按风险分层，不做每批全量验证

Prism 的验证链路包含前端测试、构建、Rust/Tauri 检查、真实 `.app` smoke、打包、签名、公证和跨平台发布检查。它们不应该全部进入每个小 checkpoint 的固定成本。

推荐分层：

- 文档、计划、审计状态变更：只跑 `git diff --check`。
- TypeScript / React 非关键 UI 或文案变更：优先跑相关测试；阶段收口时再跑 `npm test -- --run` 和 `npm run build`。
- 编辑器、文件安全、导出、命令系统等核心行为变更：跑相关测试，并在本批收口时跑 `npm test -- --run`、`npm run build`、`git diff --check`。
- Rust / Tauri / capabilities / 桌面权限变更：额外跑对应的 `cargo check`、`cargo test <target>` 或局部 Tauri smoke。
- 打包、签名、公证、安装器、updater、file association 变更：才跑 `.app`、DMG、签名、公证或 updater 级验证。
- 真实 Prism.app UI smoke：只在功能闭环、风险较高、发布前，或需要证明人工交互路径时执行；不要作为每个微小 checkpoint 的固定动作。

每次汇报必须说明“为什么选择这组验证”，以及哪些发布级验证被跳过、跳过原因是什么。

## 联网确认的 `/goal` 写法要点

官方 Codex 文档给出的关键约束：

- `/goal` 适合需要跨多轮持续推进、并且有可验证停止条件的长任务。
- 推荐形式是 `/goal Complete [objective] without stopping until [verifiable end state].`
- `/goal` 是 Codex CLI 的实验功能；需要通过 `/experimental` 或在 `config.toml` 的 `[features]` 下开启 `goals = true`。
- CLI 用法是 `/goal <objective>`；也可以用 `/goal` 查看当前目标，用 `/goal pause`、`/goal resume`、`/goal clear` 管理目标。
- 好 prompt 要包含可验证步骤，例如复现方式、功能验收、lint、测试、pre-commit / build 检查。
- 复杂任务要拆成更小、更聚焦的步骤，方便 Codex 测试，也方便人类 review。

来源：

- https://developers.openai.com/codex/use-cases/follow-goals
- https://developers.openai.com/codex/cli/slash-commands
- https://developers.openai.com/codex/prompting

本机已确认：

```text
codex-cli 0.130.0
```

`/Users/Alex/.codex/config.toml` 已包含：

```toml
[features]
goals = true
```

## 推荐 Goal Prompt：Prism 1.0.x 核心闭环持续推进

适用场景：当前仓库已经有产品优化计划、核心审计和多份 smoke 协议，下一步需要让 Codex 继承已有进度，按最小可验证切片继续把“弱验证 / 用户可见缺口 / 可靠性缺口”闭环。

直接粘贴这一段到 Codex CLI：

```text
/goal 在 /Users/Alex/AI/project/Prism 中，基于 docs/prism-product-optimization-plan.md 和 docs/verification/prism-1.0x-core-closure-audit.md，继承已有本地进度并持续推进 Prism 1.0.x 核心本地写作体验闭环，直到核心路径没有用户可见的空壳功能，弱验证项都有自动测试、可复现 smoke 证据或明确环境阻塞说明。不要从头重跑已经闭环的功能；先用 docs/verification/ 下的审计和 smoke 文档、当前 git diff、现有测试结果记录做一次轻量状态对齐，把“已闭环 / 弱验证 / 环境阻塞 / 仍需实现”分清，再从仍需实现或弱验证的最高优先级缺口继续。历史已记录且未受本批改动影响的 smoke 证据可以继承，不要为了刷进度重复真实 .app 操作。每个 checkpoint 只做一个最小可验证切片，并按风险分层选择验证强度：文档变更只需 git diff --check；前端小改优先跑相关测试，阶段收口再跑 npm test -- --run 和 npm run build；编辑器、文件安全、导出、命令系统等核心行为变更需要相关测试 + npm test -- --run + npm run build + git diff --check；涉及 Rust/Tauri/capabilities/桌面权限时补跑 cargo check、cargo test <target> 或局部 Tauri smoke；只有触及打包、签名、公证、安装器、updater、file association 时才跑完整 .app/DMG/发布级验证。完成后用中文汇报目标、改动、选择的验证、跳过的重验证及原因、风险和下一批建议。本 goal 不追求完整 backlog，不引入完整 WYSIWYG、云同步、移动端、实时协作、图谱视图、Obsidian 式插件市场、数据库式 Properties，也不要回退到 Win11 Fluent。

开始前必须先读 AGENTS.md、CONTEXT.md、docs/adr/、docs/prism-openai-redesign.html、docs/prism-product-optimization-plan.md、docs/verification/prism-1.0x-core-closure-audit.md 和当前 git diff。全程中文沟通。严格保持 Prism 的单文档单窗口定位、OpenAI 极简视觉和本地优先写作器定位。工作树可能非常脏，包含用户和其他 agent 的历史改动；不要 reset、checkout、revert 或格式化无关文件。任何文件改动前先说明本批目标、影响面和验证方式。

执行顺序按计划优先级推进：文件安全与发布可信 -> 写作效率 -> 预览同步 -> 导出工作台 -> 专业扩展 -> 对外扩展能力 -> 内部架构与质量。但不要机械按大章节重写；每批都要从审计和代码中找最小可闭环缺口。优先处理：用户可见但仍会提示“尚未实现”的入口、已有 smoke 文档但没有真实证据的核心路径、已有实现但缺测试的公共 contract、导出和文件安全中会导致用户丢稿或产物不可信的问题。

恢复后第一批 checkpoint 先做“进度对齐而非从头重跑”：阅读 docs/verification/prism-1.0x-core-closure-audit.md 和相关 smoke 文档，列出已闭环、弱验证、环境阻塞和仍需实现的项目；只在证据缺失、证据明显过期或本批代码改动影响既有结论时才重新验证。随后从最高优先级剩余缺口中选择一个最小切片继续。当前推荐的下一批候选是“关闭用户可见空壳入口”：审计 src/lib/fileActions.ts 中 context.showToast?.(`功能“${command}”尚未实现`) 可能覆盖哪些命令，追踪 src/domains/workspace/components/FileTree.tsx、src/domains/commands/registry.ts 和相关菜单/上下文菜单调用点。对每个入口判断它是否用户可见、是否属于 docs/prism-product-optimization-plan.md 的核心能力、应该实现还是隐藏。选择最小安全处理：如果功能已经有 domain 能力就接入真实实现并补测试；如果不该在当前版本暴露就移除/禁用入口并补 registry 或组件测试；不要保留会误导用户的“尚未实现”核心入口。

后续 checkpoint 的候选池：
1. 把 docs/verification/prism-writing-efficiency-smoke.md、docs/verification/prism-preview-sync-smoke.md、docs/verification/prism-complex-export-smoke.md、docs/verification/prism-recovery-crash-smoke.md 从协议推进到可执行证据；能自动化的补测试，必须人工的写清实际步骤、结果和阻塞。
2. 导出工作台优先补复杂 golden Markdown 的 HTML/PDF/PNG/DOCX 可靠性，尤其中文、表格、代码块、Mermaid、KaTeX、图片、front matter、TOC、页眉页脚和失败诊断；Pandoc 未安装时只能标阻塞，不要伪造成功。
3. 预览同步优先验证长文 source-line mapping、点击预览跳源码、Mermaid/KaTeX 错误跳源码和长文滚动 drift；有可测算法就补单元测试，真实 UI drift 记录进 smoke 文档。
4. 文件安全优先验证 crash/restart recovery、外部修改冲突、保存失败不清 dirty 和权限 scope；签名、公证、Windows release 没有真实环境时保留为发布阻塞，不包装成已完成。
5. 内部质量优先确保 Command System、Document / Workspace / Export / Settings domain 是单一事实源；禁止绕过 domain 直接堆 UI 状态。

每批执行格式：
1. 先给 checkpoint 标题、选择理由、影响文件和验证命令。
2. 用 rg / 文件阅读拿证据，不猜。
3. 只编辑本批相关文件，保护无关脏改。
4. 补或更新与本批风险匹配的测试；只改文档或审计状态时只跑 git diff --check。
5. 按风险分层验证，不默认全量跑：
   - 文档 / 计划 / 审计：git diff --check。
   - TypeScript / React 非关键 UI：相关测试；阶段收口再跑 npm test -- --run 和 npm run build。
   - 编辑器 / 文件安全 / 导出 / 命令系统等核心行为：相关测试 + npm test -- --run + npm run build + git diff --check。
   - Rust / Tauri / capabilities / 桌面权限：cargo check、cargo test <target> 或局部 Tauri smoke。
   - 打包 / 签名 / 公证 / updater / 安装器 / file association：才跑完整 .app / DMG / 发布级验证。
   - 真实 Prism.app UI smoke：仅在功能闭环、风险较高、发布前或必须证明人工交互路径时执行。
6. 更新 docs/verification/prism-1.0x-core-closure-audit.md 或对应 smoke 文档，把“已闭环 / 弱验证 / 环境阻塞”状态写清。
7. 最终汇报包含：已改路径、验证结果、验证分层理由、跳过的重验证及原因、剩余弱验证、下一批建议。

停止条件：核心 1.0.x 本地写作体验的文件安全、写作效率、预览同步、导出工作台和专业扩展路径都有代码证据、自动测试或真实 smoke 证据覆盖；用户可见核心入口不再落到“尚未实现”；发布可信中无法在本机完成的签名、公证、Windows release 被明确记录为环境阻塞；npm test -- --run、npm run build、git diff --check 通过；最终审计文档更新为可交接状态。达到停止条件前不要把 goal 标记完成。
```

## 启动后第一条执行提示

设置 goal 后，建议再发这一条，确保 Codex 从当前最小切片开始：

```text
先执行恢复后的进度对齐 checkpoint，不要从头重跑 goal。请阅读 docs/verification/prism-1.0x-core-closure-audit.md、相关 smoke 文档和当前 git diff，列出已闭环、弱验证、环境阻塞和仍需实现的项目；历史已记录且未受当前改动影响的 smoke 证据直接继承，不要重复真实 .app 操作。然后选择最高优先级的一个剩余缺口作为下一批最小可验证切片；当前推荐候选是审计并关闭用户可见空壳入口。改动前先汇报目标、影响面和按风险分层选择的验证命令。
```

## 备用 Goal Prompt：只做状态审计

适用场景：换新线程、新机器、或者你怀疑当前审计已经过期，需要先重新校准状态。

```text
/goal 在 /Users/Alex/AI/project/Prism 中，基于 docs/prism-product-optimization-plan.md 完成 Prism 1.0.x 核心本地写作体验闭环审计，不要直接实现新功能，直到 docs/verification/prism-1.0x-core-closure-audit.md 存在并清楚说明每个核心能力的计划要求、当前证据、验证强度、缺口和下一步。停止条件是：审计文档完成，git diff --check 通过，并用中文汇报下一批最小实现建议；如果审计期间发现测试或构建状态会影响结论，再补跑对应的 npm test -- --run 或 npm run build。

开始前先读 AGENTS.md、CONTEXT.md、docs/adr/、docs/prism-openai-redesign.html、docs/prism-product-optimization-plan.md 和当前 git diff。保持 Prism 单文档单窗口、OpenAI 极简、本地优先写作器定位；不要引入完整 WYSIWYG、云同步、移动端、图谱、插件市场。工作树可能很脏，保护无关改动。审计必须引用具体本地文件作为证据，不要泛泛判断。
```

## 备用 Goal Prompt：从完整路线启动

适用场景：新分支、当前进度不重要，或者希望 Codex 从产品优化计划的完整优先级重新拆批推进。

```text
/goal 在 /Users/Alex/AI/project/Prism 中，基于 docs/prism-product-optimization-plan.md 持续推进 Prism 1.0.x 之后的产品和工程优化，把 Prism 做成开源、跨 macOS / Windows、中文长文友好、导出可靠、本地优先的 Markdown 写作器。开始前先读 AGENTS.md、CONTEXT.md、docs/adr/、docs/prism-openai-redesign.html、docs/prism-product-optimization-plan.md 和当前 git diff；按“产品信任与发布治理 -> 文件安全、自动保存与恢复 -> 写作效率工具 -> 编辑器内核模块化 -> 预览同步与渲染诊断 -> 导出工作台 -> 设置中心与偏好系统 -> 工作区、快速打开与链接能力 -> 专业写作扩展 -> 对外扩展能力 -> 内部架构与质量”的顺序拆成可验证小批次推进。严格保持单文档单窗口与 OpenAI 极简视觉；禁止引入完整 WYSIWYG、云同步、移动端、图谱、插件市场；禁止绕过 Document / Workspace / Export / Command / Settings domain 直接堆 UI 状态。每批先说明目标、影响面和按风险分层选择的验证方式，再改代码；完成后根据改动风险选择最小足够验证：文档只跑 git diff --check，前端小改跑相关测试，核心行为改动跑相关测试 + npm test -- --run + npm run build + git diff --check，Rust/Tauri/桌面能力改动补 cargo 或局部 Tauri 验证，只有打包发布链路才跑完整 .app/DMG/发布级验证。每个 checkpoint 必须用中文汇报已完成、验证结果、跳过重验证的原因、剩余风险和下一批建议。阶段停止条件：当前优先级阶段的验收标准全部通过，必要测试和构建通过，且没有未解释的临时实现或调试代码。
```
