export type WorkspaceMode = 'single' | 'folder';
export type SidebarTab = 'files' | 'outline' | 'search';
export type FileTreeMode = 'tree' | 'list';
export type FileSortMode = 'name' | 'modified' | 'created' | 'size';

export interface FileNode {
  path: string;
  name: string;
  kind?: 'file' | 'directory';
  preview?: string;
  children?: FileNode[];
}

export interface WorkspaceState {
  mode: WorkspaceMode;
  rootPath: string | null;
  fileTree: FileNode[];
  fileTreeMode: FileTreeMode;
  fileSortMode: FileSortMode;
  sidebarVisible: boolean;
  sidebarTab: SidebarTab;
  focusMode: boolean;
  statusBarVisible: boolean;
  typewriterMode: boolean;
  isFullscreen: boolean;
  isAlwaysOnTop: boolean;
}
