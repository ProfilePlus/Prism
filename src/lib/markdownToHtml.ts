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

export function markdownToHtml(content: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHeadingLines)
    .use(remarkMermaid)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight as any, { ignoreMissing: true })
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(content);

  return String(result);
}
