import type { MenuItem, MenuSection } from '../../components/shell/types';
import type { CommandContext, CommandId } from './types';
import {
  getCommandDefinition,
  getPrimaryShortcutLabel,
  isCommandEnabled,
} from './registry';

type MenuModelItem =
  | { type: 'separator' }
  | { command: CommandId; label?: string; hidden?: (context: CommandContext) => boolean }
  | { label: string; children: MenuModelItem[]; hidden?: (context: CommandContext) => boolean };

type MenuModel = Record<string, MenuModelItem[]>;

const menuModel: MenuModel = {
  '文件': [
    { command: 'new' },
    { command: 'newWindow' },
    { type: 'separator' },
    { command: 'open' },
    { command: 'openFolder' },
    { type: 'separator' },
    { command: 'save' },
    { command: 'saveAs' },
    { command: 'openCurrentLocation' },
    { type: 'separator' },
    {
      label: '导出',
      children: [
        { command: 'exportPdf' },
        { command: 'exportDocx' },
        { command: 'exportHtml' },
        { command: 'exportPng' },
      ],
    },
    { type: 'separator' },
    { command: 'closeDocument' },
  ],
  '编辑': [
    { command: 'undo' },
    { command: 'redo' },
    { type: 'separator' },
    { command: 'cut' },
    { command: 'copy' },
    { command: 'paste' },
    { command: 'pastePlain' },
    { type: 'separator' },
    { command: 'selectAll' },
    { type: 'separator' },
    {
      label: '查找与替换',
      children: [
        { command: 'showSearch' },
        { command: 'showReplace' },
      ],
    },
    {
      label: '复制为',
      children: [
        { command: 'copyPlain', label: '纯文本' },
        { command: 'copyMd', label: 'Markdown' },
        { command: 'copyHtml', label: 'HTML' },
      ],
    },
  ],
  '插入': [
    { command: 'link' },
    { type: 'separator' },
    { command: 'codeBlock' },
    { command: 'mathBlock' },
    { command: 'quote' },
    { type: 'separator' },
    { command: 'orderedList' },
    { command: 'unorderedList' },
    { command: 'taskList' },
    { type: 'separator' },
    { command: 'hr' },
    { command: 'footnote' },
    { command: 'linkReference' },
    { command: 'toc' },
    { command: 'yaml' },
  ],
  '格式': [
    { command: 'bold' },
    { command: 'italic' },
    { command: 'underline' },
    { command: 'strikethrough' },
    { command: 'inlineCode' },
    { type: 'separator' },
    {
      label: '段落样式',
      children: [
        { command: 'paragraph' },
        { command: 'h1' },
        { command: 'h2' },
        { command: 'h3' },
        { command: 'h4' },
        { command: 'h5' },
        { command: 'h6' },
      ],
    },
    {
      label: '标题级别',
      children: [
        { command: 'increaseHeading' },
        { command: 'decreaseHeading' },
      ],
    },
    { type: 'separator' },
    { command: 'clearFormat' },
  ],
  '视图': [
    { command: 'sourceMode' },
    { command: 'splitMode' },
    { command: 'previewMode' },
    { type: 'separator' },
    { command: 'toggleSidebar' },
    {
      label: '侧边栏',
      children: [
        { command: 'showFiles' },
        { command: 'showOutline' },
      ],
    },
    { type: 'separator' },
    { command: 'focusMode' },
    { command: 'typewriterMode' },
    { command: 'statusBar' },
    { type: 'separator' },
    { command: 'actualSize' },
    { command: 'zoomIn' },
    { command: 'zoomOut' },
    { type: 'separator' },
    { command: 'devTools' },
  ],
  '主题': [
    { command: 'themeMiaoyan' },
    { command: 'themeInkstone' },
    { command: 'themeSlate' },
    { command: 'themeMono' },
    { command: 'themeNocturne' },
  ],
  '窗口': [
    { command: 'minimize' },
    { command: 'fullscreen' },
    { command: 'alwaysOnTop' },
    { type: 'separator' },
    { command: 'newWindow' },
  ],
  '帮助': [
    { command: 'preferences' },
    { command: 'commandPalette' },
    { command: 'mdReference' },
    { command: 'showShortcuts' },
    { type: 'separator' },
    { command: 'github' },
    { command: 'feedback' },
    { type: 'separator' },
    { command: 'about' },
  ],
};

function normalizeItems(items: MenuItem[]): MenuItem[] {
  const visibleItems = items.filter((item) => {
    if (item.type === 'separator') return true;
    return !item.hidden;
  });

  return visibleItems.filter((item, index, source) => {
    if (item.type !== 'separator') return true;
    if (index === 0 || index === source.length - 1) return false;
    return source[index - 1]?.type !== 'separator';
  });
}

function toMenuItem(item: MenuModelItem, context: CommandContext): MenuItem | null {
  if ('hidden' in item && item.hidden?.(context)) return null;
  if ('type' in item && item.type === 'separator') return { type: 'separator' };

  if ('children' in item) {
    const children = normalizeItems(
      item.children
        .map((child) => toMenuItem(child, context))
        .filter((child): child is MenuItem => Boolean(child)),
    );

    if (!children.length) return null;

    return {
      label: item.label,
      submenu: true,
      children,
    };
  }

  if (!('command' in item)) return null;

  const definition = getCommandDefinition(item.command);
  return {
    label: item.label ?? definition.label,
    action: definition.id,
    shortcut: getPrimaryShortcutLabel(definition.id),
    checked: definition.checked?.(context) ?? false,
    disabled: !isCommandEnabled(definition.id, context),
  };
}

export function getMenuSections(context: CommandContext): MenuSection {
  return Object.fromEntries(
    Object.entries(menuModel).map(([section, items]) => [
      section,
      normalizeItems(
        items
          .map((item) => toMenuItem(item, context))
          .filter((item): item is MenuItem => Boolean(item)),
      ),
    ]),
  );
}

export function getCommandMenuItems(ids: CommandId[], context: CommandContext): MenuItem[] {
  return normalizeItems(
    ids.map((id) => toMenuItem({ command: id }, context)).filter((item): item is MenuItem => Boolean(item)),
  );
}
