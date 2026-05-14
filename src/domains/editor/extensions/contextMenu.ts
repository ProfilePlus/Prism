import type { ContextMenuItem } from '../../../components/shell/ContextMenu';
import {
  getCommandDefinition,
  getPrimaryShortcutLabel,
  type CommandContext,
  type CommandId,
} from '../../commands';

function commandItem(
  id: CommandId,
  shortcutStyle: CommandContext['settingsStore']['shortcutStyle'],
  options: { label?: string; disabled?: boolean } = {},
): ContextMenuItem {
  return {
    label: options.label ?? getCommandDefinition(id).label,
    action: id,
    shortcut: getPrimaryShortcutLabel(id, shortcutStyle),
    disabled: options.disabled,
  };
}

export function getEditorContextMenuItems(
  hasSelection: boolean,
  shortcutStyle: CommandContext['settingsStore']['shortcutStyle'],
): ContextMenuItem[] {
  return [
    commandItem('cut', shortcutStyle, { disabled: !hasSelection }),
    commandItem('copy', shortcutStyle, { disabled: !hasSelection }),
    commandItem('paste', shortcutStyle),
    commandItem('pastePlain', shortcutStyle),
    { type: 'separator' },
    commandItem('bold', shortcutStyle),
    commandItem('italic', shortcutStyle),
    commandItem('underline', shortcutStyle),
    commandItem('strikethrough', shortcutStyle),
    { type: 'separator' },
    {
      label: '复制为',
      children: [
        commandItem('copyPlain', shortcutStyle, { label: '纯文本', disabled: !hasSelection }),
        commandItem('copyMd', shortcutStyle, { label: 'Markdown', disabled: !hasSelection }),
        commandItem('copyHtml', shortcutStyle, { label: 'HTML', disabled: !hasSelection }),
      ],
    },
  ];
}
