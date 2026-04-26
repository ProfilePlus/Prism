import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { markdownToHtml } from './markdownToHtml';

export async function exportToHtml(
  content: string,
  defaultFilename: string,
): Promise<void> {
  const html = markdownToHtml(content);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${defaultFilename.replace(/\.md$/, '')}</title>
  <style>
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.8;
      color: #1F1F1F;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 1.4em 0 0.6em;
      line-height: 1.25;
    }
    h1 { font-size: 2.4rem; font-weight: 700; }
    h2 { font-size: 1.8rem; font-weight: 650; }
    h3 { font-size: 1.3rem; font-weight: 600; }
    p, li, blockquote { font-size: 16px; }
    p, ul, ol, blockquote, pre { margin: 0.9em 0; }
    ul, ol { padding-left: 1.6em; }
    code {
      padding: 0.18em 0.45em;
      border-radius: 6px;
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 0.92em;
      background: rgba(127, 127, 127, 0.14);
    }
    pre {
      padding: 18px 20px;
      border-radius: 14px;
      overflow: auto;
      background: rgba(127, 127, 127, 0.1);
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      padding: 12px 16px;
      border-left: 3px solid rgba(0, 120, 212, 0.45);
      background: rgba(127, 127, 127, 0.08);
      border-radius: 0 12px 12px 0;
    }
    a {
      color: #2383E2;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      margin: 1em 0;
      width: 100%;
    }
    th, td {
      border: 1px solid rgba(127, 127, 127, 0.3);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: rgba(127, 127, 127, 0.08);
      font-weight: 600;
    }
    hr {
      border: none;
      border-top: 1px solid rgba(127, 127, 127, 0.25);
      margin: 1.6em 0;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

  const savePath = await save({
    defaultPath: defaultFilename.replace(/\.md$/, '.html'),
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });

  if (!savePath) return;

  await writeTextFile(savePath, fullHtml);
}
