import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { getMarkdownHeadingSlug } from './headingSlug';

export interface WorkspaceLinkFile {
  name: string;
  path: string;
}

export interface MarkdownLinkCompletionContext {
  currentDocumentPath?: string;
  workspaceFiles: WorkspaceLinkFile[];
  workspaceRootPath?: string | null;
}

const MARKDOWN_FILE_RE = /\.(md|markdown|txt)$/i;

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/');
}

function stripRoot(path: string, rootPath?: string | null): string {
  const normalizedPath = normalizePath(path);
  const normalizedRoot = rootPath ? normalizePath(rootPath).replace(/\/+$/, '') : '';
  if (!normalizedRoot) return normalizedPath;
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : normalizedPath;
}

function stripMarkdownExtension(path: string): string {
  return path.replace(/\.(md|markdown|txt)$/i, '');
}

function relativePath(fromDir: string, toPath: string): string {
  const fromParts = normalizePath(fromDir).split('/').filter(Boolean);
  const toParts = normalizePath(toPath).split('/').filter(Boolean);
  while (fromParts.length && toParts.length && fromParts[0].toLowerCase() === toParts[0].toLowerCase()) {
    fromParts.shift();
    toParts.shift();
  }
  return `${'../'.repeat(fromParts.length)}${toParts.join('/')}`;
}

export function getMarkdownLinkTrigger(linePrefix: string): { fromOffset: number; query: string } | null {
  const match = linePrefix.match(/\]\(([^)\s]*)$/);
  if (!match) return null;
  return {
    fromOffset: linePrefix.length - match[1].length,
    query: match[1],
  };
}

export function getWikiLinkTrigger(linePrefix: string): { fromOffset: number; query: string } | null {
  const match = linePrefix.match(/\[\[([^\]\n]*)$/);
  if (!match) return null;
  return {
    fromOffset: linePrefix.length - match[1].length,
    query: match[1],
  };
}

export function getMarkdownHeadingCompletionOptions(content: string): Completion[] {
  return content.split('\n').flatMap((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return [];
    const title = match[2].trim();
    const slug = getMarkdownHeadingSlug(title);
    if (!slug) return [];
    return [{
      label: `#${slug}`,
      type: 'keyword',
      detail: title,
    }];
  });
}

export function getWorkspaceFileCompletionOptions(context: MarkdownLinkCompletionContext): Completion[] {
  const baseDir = context.currentDocumentPath
    ? dirname(context.currentDocumentPath)
    : normalizePath(context.workspaceRootPath ?? '');

  return context.workspaceFiles
    .filter((file) => MARKDOWN_FILE_RE.test(file.name))
    .map((file) => {
      const label = baseDir
        ? relativePath(baseDir, file.path)
        : stripRoot(file.path, context.workspaceRootPath);
      return {
        label,
        type: 'file',
        detail: file.name,
      } satisfies Completion;
    });
}

export function getWikiLinkCompletionOptions(context: MarkdownLinkCompletionContext): Completion[] {
  return context.workspaceFiles
    .filter((file) => MARKDOWN_FILE_RE.test(file.name))
    .map((file) => {
      const relative = stripRoot(file.path, context.workspaceRootPath);
      return {
        label: stripMarkdownExtension(relative),
        type: 'file',
        detail: file.name,
      } satisfies Completion;
    });
}

export function createMarkdownLinkCompletionSource(
  getContext: () => MarkdownLinkCompletionContext,
) {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const linePrefix = line.text.slice(0, context.pos - line.from);
    const wikiTrigger = getWikiLinkTrigger(linePrefix);
    if (wikiTrigger) {
      return {
        from: line.from + wikiTrigger.fromOffset,
        options: getWikiLinkCompletionOptions(getContext()),
        validFor: /^[^\]\n]*$/,
      };
    }

    const trigger = getMarkdownLinkTrigger(linePrefix);
    if (!trigger) return null;

    const completionContext = getContext();
    const options = [
      ...getWorkspaceFileCompletionOptions(completionContext),
      ...getMarkdownHeadingCompletionOptions(context.state.doc.toString()),
    ];

    return {
      from: line.from + trigger.fromOffset,
      options,
      validFor: /^[^)\s]*$/,
    };
  };
}
