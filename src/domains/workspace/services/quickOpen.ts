import type { FileNode } from '../types';
import { flattenFiles } from './fileTree';

export interface QuickOpenResult {
  node: FileNode;
  score: number;
}

function scoreFile(node: FileNode, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const name = node.name.toLowerCase();
  const path = node.path.toLowerCase();
  const preview = (node.preview ?? '').toLowerCase();

  if (name === normalizedQuery) return 100;
  if (name.startsWith(normalizedQuery)) return 80;
  if (name.includes(normalizedQuery)) return 60;
  if (path.includes(normalizedQuery)) return 35;
  if (preview.includes(normalizedQuery)) return 15;
  return 0;
}

export function rankQuickOpenFiles(nodes: FileNode[], query: string, limit = 20): QuickOpenResult[] {
  return flattenFiles(nodes, null)
    .map(({ node }) => ({ node, score: scoreFile(node, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, limit);
}
