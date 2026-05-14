import type { ContextMenuItem } from '../../../components/shell/ContextMenu';
import {
  getCommandDefinition,
  getPrimaryShortcutLabel,
  type CommandId,
} from '../../commands';

function commandItem(
  id: CommandId,
  options: { label?: string; disabled?: boolean } = {},
): ContextMenuItem {
  return {
    label: options.label ?? getCommandDefinition(id).label,
    action: id,
    shortcut: getPrimaryShortcutLabel(id),
    disabled: options.disabled,
  };
}

export function getEditorContextMenuItems(hasSelection: boolean): ContextMenuItem[] {
  return [
    commandItem('cut', { disabled: !hasSelection }),
    commandItem('copy', { disabled: !hasSelection }),
    commandItem('paste'),
    commandItem('pastePlain'),
    { type: 'separator' },
    commandItem('bold'),
    commandItem('italic'),
    commandItem('underline'),
    commandItem('strikethrough'),
    { type: 'separator' },
    {
      label: '复制为',
      children: [
        commandItem('copyPlain', { label: '纯文本', disabled: !hasSelection }),
        commandItem('copyMd', { label: 'Markdown', disabled: !hasSelection }),
        commandItem('copyHtml', { label: 'HTML', disabled: !hasSelection }),
      ],
    },
  ];
}
