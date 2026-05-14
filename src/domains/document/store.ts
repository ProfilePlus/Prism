import { create } from 'zustand';
import { DocumentState } from './types';
import { useSettingsStore } from '../settings/store';

interface DocumentStore extends DocumentState {
  openDocument: (path: string, name: string, content: string) => void;
  closeDocument: () => void;
  createNewDocument: () => void;
  updateContent: (content: string) => void;
  updateDocumentPath: (oldPath: string, newPath: string, name: string) => void;
  setViewMode: (viewMode: 'edit' | 'split' | 'preview') => void;
  markSaved: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  currentDocument: null,

  openDocument: (path, name, content) => {
    set({
      currentDocument: {
        path,
        name,
        content,
        isDirty: false,
        lastSavedAt: Date.now(),
        viewMode: useSettingsStore.getState().defaultViewMode,
      },
    });
  },

  closeDocument: () => {
    set({ currentDocument: null });
  },

  createNewDocument: () => {
    set({
      currentDocument: {
        path: '',
        name: 'Untitled.md',
        content: '',
        isDirty: false,
        lastSavedAt: Date.now(),
        viewMode: useSettingsStore.getState().defaultViewMode,
      },
    });
  },

  updateContent: (content) => {
    set((state) => {
      if (!state.currentDocument) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          content,
          isDirty: true,
        },
      };
    });
  },

  updateDocumentPath: (oldPath, newPath, name) => {
    set((state) => {
      if (!state.currentDocument || state.currentDocument.path !== oldPath) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          path: newPath,
          name,
        },
      };
    });
  },

  setViewMode: (viewMode) => {
    set((state) => {
      if (!state.currentDocument) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          viewMode,
        },
      };
    });
  },

  markSaved: () => {
    set((state) => {
      if (!state.currentDocument) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          isDirty: false,
          lastSavedAt: Date.now(),
        },
      };
    });
  },
}));
