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

function rehypeCodeCopyButton() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'pre' && node.children?.[0]?.tagName === 'code') {
        const codeNode = node.children[0];
        const codeText = codeNode.children
          .map((child: any) => child.value || '')
          .join('');

        // 添加复制按钮
        node.children.push({
          type: 'element',
          tagName: 'button',
          properties: {
            className: ['code-copy-btn'],
            'data-code': codeText,
            title: '复制代码',
            'aria-label': '复制代码',
          },
          children: [{ type: 'text', value: '' }],
        });
      }
    });
  };
}

export function markdownToHtml(content: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHeadingLines)
    .use(remarkMermaid)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight as any, { ignoreMissing: true })
    .use(rehypeCodeCopyButton)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(content);

  return String(result);
}
