import { describe, expect, it, vi } from 'vitest';
import {
  commandRegistry,
  commandRegistryById,
  getCommandPaletteItems,
  getMenuSections,
  runCommand,
  type CommandContext,
} from './index';
import { DEFAULT_SETTINGS } from '../settings/types';

function createCommandContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    documentStore: {
      currentDocument: null,
      createNewDocument: vi.fn(),
      openDocument: vi.fn(),
      closeDocument: vi.fn(),
      updateContent: vi.fn(),
      updateDocumentPath: vi.fn(),
      setViewMode: vi.fn(),
      markSaved: vi.fn(),
    },
    settingsStore: {
      ...DEFAULT_SETTINGS,
      setTheme: vi.fn(),
      setContentTheme: vi.fn(),
      setFontSize: vi.fn(),
      setEditorFontFamily: vi.fn(),
      setEditorLineHeight: vi.fn(),
      setPreviewFontFamily: vi.fn(),
      setPreviewFontSize: vi.fn(),
      setDefaultViewMode: vi.fn(),
      setExportDefaultFormat: vi.fn(),
      setExportPngScale: vi.fn(),
      setExportHtmlIncludeTheme: vi.fn(),
      setShortcutStyle: vi.fn(),
      setAutoSaveInterval: vi.fn(),
      setShowLineNumbers: vi.fn(),
      loadSettings: vi.fn(),
      saveSettings: vi.fn(),
    },
    workspaceStore: {
      mode: 'single',
      rootPath: null,
      fileTree: [],
      fileTreeMode: 'tree',
      fileSortMode: 'name',
      sidebarVisible: true,
      sidebarTab: 'files',
      focusMode: false,
      statusBarVisible: true,
      typewriterMode: false,
      isFullscreen: false,
      isAlwaysOnTop: false,
      setRootPath: vi.fn(),
      setFileTree: vi.fn(),
      setFileTreeMode: vi.fn(),
      setFileSortMode: vi.fn(),
      toggleSidebar: vi.fn(),
      setSidebarVisible: vi.fn(),
      toggleStatusBar: vi.fn(),
      toggleTypewriterMode: vi.fn(),
      setSidebarTab: vi.fn(),
      toggleFocusMode: vi.fn(),
      setFullscreen: vi.fn(),
      setAlwaysOnTop: vi.fn(),
    },
    ...overrides,
  };
}

describe('command registry', () => {
  it('defines each command id once', () => {
    const ids = commandRegistry.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(commandRegistryById.size).toBe(commandRegistry.length);
  });

  it('builds menu sections only from registered commands', () => {
    const sections = getMenuSections(createCommandContext());
    const actions: string[] = [];

    const collect = (items: Array<{ action?: string; children?: unknown }>) => {
      for (const item of items) {
        if (item.action) actions.push(item.action);
        if (Array.isArray(item.children)) collect(item.children as Array<{ action?: string; children?: unknown }>);
      }
    };

    Object.values(sections).forEach(collect);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => commandRegistryById.has(action as never))).toBe(true);
  });

  it('does not expose document-only commands in the command palette without a document', () => {
    const items = getCommandPaletteItems(createCommandContext());
    const ids = items.map((item) => item.id);

    expect(ids).toContain('new');
    expect(ids).not.toContain('save');
    expect(ids).not.toContain('exportPdf');
  });

  it('runs enabled commands and skips disabled commands', async () => {
    const createNewDocument = vi.fn();
    const requestSavePath = vi.fn();
    const context = createCommandContext({
      documentStore: {
        ...createCommandContext().documentStore,
        createNewDocument,
      },
      requestSavePath,
    });

    await runCommand('new', context);
    await runCommand('save', context);

    expect(createNewDocument).toHaveBeenCalledTimes(1);
    expect(requestSavePath).not.toHaveBeenCalled();
  });
});
