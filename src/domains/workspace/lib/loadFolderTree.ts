import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { FileNode } from '../types';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.next',
  '.cache',
]);

function shouldIncludeFile(name: string): boolean {
  return /\.(md|markdown|txt)$/i.test(name);
}

function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${dir}${sep}${name}`;
}

async function collectFiles(
  dirPath: string,
  out: { path: string; name: string }[],
  depth = 0,
  maxDepth = 6,
): Promise<void> {
  if (depth >= maxDepth) return;

  console.log(`[loadFolderTree] Reading dir at depth ${depth}:`, dirPath);

  let entries;
  try {
    entries = await readDir(dirPath);
  } catch (err) {
    console.error(`[loadFolderTree] Failed to read dir ${dirPath}:`, err);
    return;
  }

  console.log(`[loadFolderTree] Found ${entries.length} entries in:`, dirPath);

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = joinPath(dirPath, entry.name);

    if (entry.isDirectory) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await collectFiles(fullPath, out, depth + 1, maxDepth);
    } else if (shouldIncludeFile(entry.name)) {
      out.push({ path: fullPath, name: entry.name });
    }
  }
}

function stripFrontmatter(content: string): string {
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      return content.slice(end + 4);
    }
  }
  return content;
}

function extractPreview(content: string): string {
  const stripped = stripFrontmatter(content);
  const compact = stripped
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_>`#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return compact.slice(0, 120);
}

export async function loadFolderTree(folderPath: string): Promise<FileNode[]> {
  const collected: { path: string; name: string }[] = [];
  await collectFiles(folderPath, collected);

  collected.sort((a, b) => a.name.localeCompare(b.name));

  const nodes: FileNode[] = [];
  for (const file of collected) {
    let preview = '';
    try {
      const content = await readTextFile(file.path);
      preview = extractPreview(content);
    } catch (err) {
      console.warn(`[loadFolderTree] Failed to read preview for ${file.path}:`, err);
    }
    nodes.push({ path: file.path, name: file.name, preview });
  }

  return nodes;
}
