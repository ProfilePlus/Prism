# Prism Codex `/goal` Prompt

> 更新日期：2026-05-15
> 用途：启动或重建 Prism 长任务 goal。详细路线以 `docs/prism-product-optimization-plan.md` 和 `docs/verification/prism-1.0x-core-closure-audit.md` 为准，不把完整 backlog 塞进 prompt。

## 推荐短版

先清旧 goal：

```text
/goal clear
```

再粘贴：

```text
/goal 在 /Users/Alex/AI/project/Prism 中，基于 docs/prism-product-optimization-plan.md 和 docs/verification/prism-1.0x-core-closure-audit.md，继承现有进度推进 Prism 1.0.x 核心本地写作体验闭环。开始前先读 AGENTS.md、CONTEXT.md、docs/adr/、docs/prism-openai-redesign.html、当前 git diff 和 docs/verification/ 证据，做轻量进度对齐；不要从头重跑已闭环功能，历史 smoke 证据未受本批改动影响时直接继承。每次只做一个最小可验证 checkpoint，改动前说明目标、影响面和验证方式，完成后汇报改动、验证、跳过的重验证及原因、风险和下一步。按优先级处理：文件安全与发布可信 -> 写作效率 -> 预览同步 -> 导出工作台 -> 专业扩展 -> 对外扩展能力 -> 内部架构与质量。保持单文档单窗口、本地优先和 OpenAI 极简；禁止完整 WYSIWYG、云同步、移动端、实时协作、图谱视图、插件市场和数据库式 Properties；保护现有脏改，不 reset、checkout、revert 无关文件。验证按风险分层：文档只跑 git diff --check；前端小改跑相关测试；核心行为改动跑相关测试 + npm test -- --run + npm run build + git diff --check；Rust/Tauri/capabilities 改动补 cargo 或局部 Tauri smoke；只有打包、签名、公证、updater、安装器、file association 改动才跑完整发布级验证。停止条件：核心本地写作路径没有用户可见空壳入口，弱验证项都有自动测试、真实 smoke 证据或明确环境阻塞，最终审计文档可交接，必要测试和构建通过。
```

## 启动提示

设置 goal 后发这一句：

```text
先执行恢复后的进度对齐 checkpoint，不要从头重跑 goal。请阅读 docs/verification/prism-1.0x-core-closure-audit.md、相关 smoke 文档和当前 git diff，列出已闭环、弱验证、环境阻塞和仍需实现的项目；历史已记录且未受当前改动影响的 smoke 证据直接继承。然后选择最高优先级的一个剩余缺口作为下一批最小可验证切片，改动前先汇报目标、影响面和分层验证命令。
```

## 验证分层

- 文档 / 计划 / 审计：`git diff --check`
- TypeScript / React 小改：相关测试；阶段收口再跑 `npm test -- --run`、`npm run build`
- 编辑器 / 文件安全 / 导出 / 命令系统等核心行为：相关测试 + `npm test -- --run` + `npm run build` + `git diff --check`
- Rust / Tauri / capabilities / 桌面权限：`cargo check`、`cargo test <target>` 或局部 Tauri smoke
- 打包 / 签名 / 公证 / updater / 安装器 / file association：完整 `.app`、DMG 或发布级验证
- 真实 Prism.app UI smoke：只在功能闭环、风险较高、发布前或必须证明人工交互路径时执行

## 参考文档

- 产品路线：`docs/prism-product-optimization-plan.md`
- 核心闭环审计：`docs/verification/prism-1.0x-core-closure-audit.md`
- `/goal` 官方参考：
  - https://developers.openai.com/codex/use-cases/follow-goals
  - https://developers.openai.com/codex/cli/slash-commands
  - https://developers.openai.com/codex/prompting
