import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';
import { visit } from 'unist-util-visit';

function remarkMermaid() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index, parent) => {
      if (node.lang !== 'mermaid') return;
      if (index === undefined || !parent) return;

      const encoded = encodeURIComponent(node.value);
      parent.children[index] = {
        type: 'html',
        value: `<div class="mermaid-placeholder" data-mermaid="${encoded}"></div>`,
      };
    });
  };
}

function remarkHeadingLines() {
  return (tree: any) => {
    visit(tree, 'heading', (node: any) => {
      if (node.position) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.dataLine = node.position.start.line;
      }
    });
  };
}

// ==xxx== → <mark>xxx</mark>（对原型 highlight 语法的支持）
function remarkMark() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index, parent) => {
      if (index === undefined || !parent) return;
      const value: string = node.value;
      if (!value.includes('==')) return;

      const pattern = /==([^=\n]+)==/g;
      const children: any[] = [];
      let lastIndex = 0;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: value.slice(lastIndex, match.index) });
        }
        children.push({
          type: 'html',
          value: `<mark>${match[1]}</mark>`,
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < value.length) {
        children.push({ type: 'text', value: value.slice(lastIndex) });
      }
      if (children.length > 0) {
        parent.children.splice(index, 1, ...children);
      }
    });
  };
}

// 将 <pre><code> 包装为原型结构：
//   <pre class="code-block">
//     <div class="code-header">
//       <span class="code-lang">TS</span>
//       <button class="code-copy" data-code="...">复制</button>
//     </div>
//     <code>...</code>
//   </pre>
function rehypeCodeBlockStructure() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return;
      const codeEl = node.children?.[0];
      if (!codeEl || codeEl.tagName !== 'code') return;

      const codeText: string = (codeEl.children || [])
        .map((child: any) => child.value || '')
        .join('');

      // 语言检测：code 节点上的 className="language-ts" 形式
      const codeClass: string[] = codeEl.properties?.className || [];
      const langToken = codeClass.find((c: string) => c.startsWith('language-'));
      const lang = langToken ? langToken.replace('language-', '').toUpperCase() : 'TEXT';

      // 把 pre 加 code-block 类
      const preClasses: string[] = node.properties?.className || [];
      if (!preClasses.includes('code-block')) preClasses.push('code-block');
      node.properties = { ...(node.properties || {}), className: preClasses };

      // 插入 header（作为 pre 的第一个子节点）
      node.children = [
        {
          type: 'element',
          tagName: 'div',
          properties: { className: ['code-header'] },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['code-lang'] },
              children: [{ type: 'text', value: lang }],
            },
            {
              type: 'element',
              tagName: 'button',
              properties: {
                type: 'button',
                className: ['code-copy'],
                'data-code': codeText,
                title: '复制代码',
                'aria-label': '复制代码',
              },
              children: [{ type: 'text', value: '复制' }],
            },
          ],
        },
        codeEl,
      ];
    });
  };
}

export function markdownToHtml(content: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkMark)
    .use(remarkHeadingLines)
    .use(remarkMermaid)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight as any, { ignoreMissing: true })
    .use(rehypeCodeBlockStructure)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(content);

  return String(result);
}
