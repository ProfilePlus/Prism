interface StatusBarProps {
  viewMode: 'edit' | 'split' | 'preview';
  wordCount: number;
  cursor: { line: number; column: number };
  theme: 'light' | 'dark';
  onViewModeChange?: (mode: 'edit' | 'split' | 'preview') => void;
  onExportHtml?: () => void;
  onToggleFocusMode?: () => void;
  onToggleTheme?: () => void;
}

const modeLabel: Record<StatusBarProps['viewMode'], string> = {
  edit: '编辑',
  split: '分栏',
  preview: '预览',
};

const themeLabel: Record<StatusBarProps['theme'], string> = {
  light: '浅色',
  dark: '深色',
};

export function StatusBar({
  viewMode,
  wordCount,
  cursor,
  theme,
  onViewModeChange,
  onExportHtml,
  onToggleFocusMode,
  onToggleTheme,
}: StatusBarProps) {
  return (
    <div
      style={{
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '12px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {(['edit', 'split', 'preview'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange?.(mode)}
            style={{
              padding: '3px 10px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              background:
                viewMode === mode ? 'var(--bg-active)' : 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            {modeLabel[mode]}
          </button>
        ))}
        <span style={{ marginLeft: '8px' }}>{wordCount} 字</span>
        <span>{`Ln ${cursor.line}, Col ${cursor.column}`}</span>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={onExportHtml}
          style={{
            padding: '3px 10px',
            fontSize: '12px',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          导出 HTML
        </button>
        <button
          onClick={onToggleFocusMode}
          style={{
            padding: '3px 10px',
            fontSize: '12px',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          专注
        </button>
        <button
          onClick={onToggleTheme}
          style={{
            padding: '3px 10px',
            fontSize: '12px',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {themeLabel[theme]}
        </button>
      </div>
    </div>
  );
}
