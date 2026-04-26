interface TabItem {
  path: string;
  name: string;
  isDirty: boolean;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export function TabBar({
  tabs,
  activeTabPath,
  onTabClick,
  onTabClose,
}: TabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: '40px',
        padding: '0 8px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        gap: '4px',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;

        return (
          <div
            key={tab.path}
            onClick={() => onTabClick(tab.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              minWidth: '0',
              maxWidth: '220px',
              height: '36px',
              marginTop: '4px',
              borderRadius: '10px 10px 0 0',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid transparent' : '1px solid transparent',
              background: isActive ? 'var(--bg-surface-solid)' : 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '13px',
              }}
            >
              {tab.name}
            </span>
            {tab.isDirty ? <span>•</span> : null}
            <button
              onClick={(event) => {
                event.stopPropagation();
                onTabClose(tab.path);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: 0.65,
              }}
              aria-label={`关闭 ${tab.name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
