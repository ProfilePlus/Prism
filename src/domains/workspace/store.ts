import { create } from 'zustand';
import { WorkspaceState, FileNode, SidebarTab } from './types';

interface WorkspaceStore extends WorkspaceState {
  setRootPath: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleFocusMode: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  mode: 'single',
  rootPath: null,
  fileTree: [],
  sidebarVisible: true,
  sidebarTab: 'files',
  focusMode: false,

  setRootPath: (path) => {
    set({ rootPath: path, mode: 'folder' });
  },

  setFileTree: (tree) => {
    set({ fileTree: tree });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarVisible: !state.sidebarVisible }));
  },

  setSidebarVisible: (visible) => {
    set({ sidebarVisible: visible });
  },

  setSidebarTab: (tab) => {
    set({ sidebarTab: tab, sidebarVisible: true });
  },

  toggleFocusMode: () => {
    set((state) => ({
      focusMode: !state.focusMode,
      sidebarVisible: state.focusMode ? true : false,
    }));
  },
}));
