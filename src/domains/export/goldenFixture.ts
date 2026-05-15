export const EXPORT_GOLDEN_MARKDOWN = `---
title: 导出验收文档
author: Prism QA
date: 2026-05-15
template: business
paper: letter
margin: wide
toc: true
---
# 导出验收文档

这是一段中文长文内容，用于验证 Prism 导出能稳定保留中文、标记、高亮和基本排版。

## 表格

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 中文 | 通过 | 支持中文内容 |
| 表格 | 通过 | 保留表头和单元格 |

## 代码

\`\`\`ts
const title = "Prism";
console.warn(title);
\`\`\`

## 公式

$$
E = mc^2
$$

## 图表

\`\`\`mermaid
graph TD
  A[开始] --> B{检查}
  B --> C[完成]
\`\`\`
`;

export const EXPORT_GOLDEN_DOCX_MARKDOWN = `# 导出验收文档

这是一段中文长文内容，用于验证 Prism 的 DOCX 导出能保留中文、目录、表格和代码。

## 表格

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 中文 | 通过 | 支持中文内容 |
| 表格 | 通过 | 保留表头和单元格 |

## 代码

\`\`\`ts
const title = "Prism";
console.warn(title);
\`\`\`

## 图表

\`\`\`mermaid
graph TD
  A[开始] --> B{检查}
  B --> C[完成]
\`\`\`
`;
