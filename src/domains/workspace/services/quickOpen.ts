import type { FileNode } from '../types';
import { flattenFiles } from './fileTree';

export interface QuickOpenResult {
  node: FileNode;
  score: number;
  folderLabel?: string;
  recentRank?: number;
}

export interface QuickOpenRecentFile {
  path: string;
  lastOpened: number;
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

export function rankQuickOpenFiles(
  nodes: FileNode[],
  query: string,
  limit = 20,
  rootPath: string | null = null,
  recentFiles: QuickOpenRecentFile[] = [],
): QuickOpenResult[] {
  const flattened = flattenFiles(nodes, rootPath);
  const normalizedQuery = query.trim();
  const recentRankByPath = new Map(
    recentFiles.map((file, index) => [file.path.toLowerCase(), index]),
  );
  const getRecentRank = (node: FileNode) => recentRankByPath.get(node.path.toLowerCase());
  const compareRecentRank = (a: FileNode, b: FileNode) => {
    const aRank = getRecentRank(a);
    const bRank = getRecentRank(b);
    if (aRank !== undefined && bRank !== undefined && aRank !== bRank) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return 0;
  };

  if (!normalizedQuery) {
    return flattened
      .sort((a, b) => (
        compareRecentRank(a.node, b.node) ||
        (b.node.modifiedAt ?? 0) - (a.node.modifiedAt ?? 0) ||
        a.node.name.localeCompare(b.node.name)
      ))
      .slice(0, limit)
      .map(({ node, folderLabel }) => ({ node, folderLabel, recentRank: getRecentRank(node), score: 1 }));
  }

  return flattened
    .map(({ node, folderLabel }) => {
      const score = scoreFile(node, query);
      const recentRank = getRecentRank(node);
      const recentBoost = recentRank === undefined ? 0 : Math.max(1, 20 - recentRank);
      return {
        node,
        folderLabel,
        recentRank,
        score: score > 0 ? score + recentBoost : 0,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || compareRecentRank(a.node, b.node) || a.node.name.localeCompare(b.node.name))
    .slice(0, limit);
}
