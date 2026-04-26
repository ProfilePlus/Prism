export type WorkspaceMode = 'single' | 'folder';
export type SidebarTab = 'files' | 'outline' | 'search';

export interface FileNode {
  path: string;
  name: string;
  preview?: string;
}

export interface WorkspaceState {
  mode: WorkspaceMode;
  rootPath: string | null;
  fileTree: FileNode[];
  sidebarVisible: boolean;
  sidebarTab: SidebarTab;
  focusMode: boolean;
}
