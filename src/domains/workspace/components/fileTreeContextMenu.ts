import type { ContextMenuItem } from '../../../components/shell/ContextMenu';
import type { FileNode, FileSortMode, FileTreeMode } from '../types';
import {
  dirname,
  getShowInFileManagerLabel,
  isDirectoryNode,
} from '../services';

interface FileTreeContextMenuInput {
  node?: FileNode;
  fileTreeMode: FileTreeMode;
  fileSortMode: FileSortMode;
  showInFileManagerLabel?: string;
  includeOpenNewWindow?: boolean;
}

export function createFileTreeContextMenuItems({
  node,
  fileTreeMode,
  fileSortMode,
  showInFileManagerLabel = getShowInFileManagerLabel(),
  includeOpenNewWindow = false,
}: FileTreeContextMenuInput): ContextMenuItem[] {
  const nodeIsDirectory = node ? isDirectoryNode(node) : false;
  const targetDir = node ? (nodeIsDirectory ? node.path : dirname(node.path)) : undefined;

  if (!node) {
    return [
      ...(includeOpenNewWindow ? [{ label: '在新窗口中打开', action: 'openNewWindow' }] : []),
      ...(includeOpenNewWindow ? [{ type: 'separator' as const }] : []),
      { label: '新建文件', action: 'newFile' },
      { label: '新建文件夹', action: 'newFolder' },
      { type: 'separator' },
      { label: '文档树', action: 'viewTree', checked: fileTreeMode === 'tree' },
      { label: '文档列表', action: 'viewList', checked: fileTreeMode === 'list' },
      {
        label: '排序方式',
        children: [
          { label: '名称', action: 'sortByName', checked: fileSortMode === 'name' },
          { label: '修改时间', action: 'sortByModified', checked: fileSortMode === 'modified' },
          { label: '创建时间', action: 'sortByCreated', checked: fileSortMode === 'created' },
          { label: '大小', action: 'sortBySize', checked: fileSortMode === 'size' },
        ],
      },
      { type: 'separator' },
      { label: '刷新', action: 'refreshFolder' },
      { type: 'separator' },
      { label: '复制工作区路径', action: 'copyRootPath' },
      { label: showInFileManagerLabel, action: 'openRootLocation' },
    ];
  }

  if (!nodeIsDirectory) {
    return [
      { label: '打开', action: `openFile:${node.path}` },
      { label: '在新窗口中打开', action: `openNewWindow:${node.path}` },
      { type: 'separator' },
      { label: '重命名', action: `rename:${node.path}`, shortcut: 'F2' },
      { label: '创建副本', action: `duplicate:${node.path}` },
      { label: '删除', action: `delete:${node.path}`, danger: true },
      { type: 'separator' },
      { label: '复制文件路径', action: `copyPath:${node.path}` },
      { label: showInFileManagerLabel, action: `openLocation:${node.path}` },
    ];
  }

  return [
    { label: '在新窗口中打开', action: `openNewWindow:${node.path}` },
    { type: 'separator' },
    { label: '新建文件', action: targetDir ? `newFile:${targetDir}` : 'newFile' },
    { label: '新建文件夹', action: targetDir ? `newFolder:${targetDir}` : 'newFolder' },
    { type: 'separator' },
    { label: '重命名', action: `rename:${node.path}`, shortcut: 'F2' },
    { label: '删除', action: `delete:${node.path}`, danger: true },
    { type: 'separator' },
    { label: '复制文件夹路径', action: `copyPath:${node.path}` },
    { label: showInFileManagerLabel, action: `openLocation:${node.path}` },
  ];
}
