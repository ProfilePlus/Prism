import { useMemo, useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../workspace/store';
import { useDocumentStore } from '../../document/store';

// --- 精密图标库 (SVG) ---
const IconAdd = () => <svg className="outline-icon" width="15" height="15" viewBox="0 0 24 24" strokeWidth="1.2" shapeRendering="crispEdges"><path d="M12 4v16M4 12h16" /></svg>;
const IconMore = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/></svg>;
const IconViewToggle = () => (
    <svg className="outline-icon" width="15" height="15" viewBox="0 0 24 24" strokeWidth="1.2" shapeRendering="crispEdges">
        <rect x="4" y="4" width="16" height="16" rx="0.5" />
        <line x1="4" y1="9.3" x2="20" y2="9.3" />
        <line x1="4" y1="14.7" x2="20" y2="14.7" />
    </svg>
);
const IconCollapse = () => <svg className="outline-icon" width="12" height="12" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M15 18l-6-6 6-6" /></svg>;
const IconExpand = () => <svg className="outline-icon" width="12" height="12" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>;
const IconSource = () => <span style={{fontFamily:'Consolas, monospace', fontSize:'12px', fontWeight:'bold', letterSpacing: '-0.5px'}}>&lt;/&gt;</span>;
const IconSplit = () => <svg className="outline-icon" width="14" height="14" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M4 4h16v16H4z M12 4v16" /></svg>;
const IconPreview = () => <svg className="outline-icon" width="14" height="14" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4" /></svg>;
const IconFocus = () => <svg className="outline-icon" width="14" height="14" viewBox="0 0 24 24" strokeWidth="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>;
const IconExport = () => <svg className="outline-icon" width="14" height="14" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/></svg>;

interface StatusBarProps {
  viewMode: 'edit' | 'split' | 'preview';
  wordCount: number;
  cursor: { line: number; column: number };
  sidebarVisible: boolean;
  isSidebarHovered: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onViewModeChange?: (mode: 'edit' | 'split' | 'preview') => void;
  onExportHtml?: () => void;
  onToggleFocusMode?: () => void;
  onToggleSidebar?: () => void;
  onFolderContextMenu?: (e: React.MouseEvent) => void;
  onNewFile?: () => void;
  onToggleFileTreeMode?: () => void;
}

export function StatusBar({
  viewMode,
  wordCount,
  cursor,
  sidebarVisible,
  isSidebarHovered,
  onMouseEnter,
  onMouseLeave,
  onViewModeChange,
  onExportHtml,
  onToggleFocusMode,
  onToggleSidebar,
  onFolderContextMenu,
  onNewFile,
  onToggleFileTreeMode,
}: StatusBarProps) {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const fileTreeMode = useWorkspaceStore((s) => s.fileTreeMode);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const rootName = useMemo(() => {
    if (!rootPath) return 'Documents';
    return rootPath.split(/[\\/]/).pop() || rootPath;
  }, [rootPath]);

  // 监听文档保存状态
  useEffect(() => {
    if (!currentDocument) {
      setSaveStatus('saved');
      return;
    }

    if (currentDocument.isDirty) {
      setSaveStatus('unsaved');
      // 模拟保存中状态（实际应该从 auto-save hook 获取）
      const timer = setTimeout(() => {
        setSaveStatus('saving');
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setSaveStatus('saved');
    }
  }, [currentDocument?.isDirty, currentDocument?.lastSavedAt]);

  const modes = [
    { key: 'edit', label: '源码', icon: <IconSource /> },
    { key: 'split', label: '分栏', icon: <IconSplit /> },
    { key: 'preview', label: '预览', icon: <IconPreview /> },
  ] as const;

  return (
    <div className="typora-status-bar-outer">
      {/* 1. 侧边栏地基：增加了悬停监听，防止图标消失 */}
      {sidebarVisible && (
        <div 
          className="foundation-sidebar-part"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className={`reveal-anim-wrap ${isSidebarHovered ? 'is-visible' : ''}`}>
            <button className="base-icon-btn" title="新建文件" onClick={onNewFile}><IconAdd /></button>
            <div 
              className="folder-name-label" 
              onContextMenu={onFolderContextMenu}
              onClick={onFolderContextMenu}
              title="工作区操作"
            >
              <span className="name">{rootName}</span>
              <span className="more-icon" style={{marginLeft: '6px', display: 'flex'}}><IconMore /></span>
            </div>
            <button
              className={`base-icon-btn ${fileTreeMode === 'list' ? 'is-active' : ''}`}
              title={fileTreeMode === 'tree' ? '切换到文档列表' : '切换到文档树'}
              onClick={onToggleFileTreeMode}
            >
                <IconViewToggle />
            </button>
          </div>
        </div>
      )}

      {/* 2. 编辑器地基 */}
      <div className="foundation-editor-part">
        <div className="left-controls">
          <button 
            className={`slider-handle ${!sidebarVisible ? 'is-collapsed' : ''}`}
            onClick={onToggleSidebar}
            title={sidebarVisible ? "收起侧边栏" : "展开侧边栏"}
          >
            {sidebarVisible ? <IconCollapse /> : <IconExpand />}
          </button>

          <div className="vertical-sep" />

          <div className="mode-switcher-set">
            {modes.map(mode => (
              <button 
                key={mode.key}
                className={`mode-btn-styled ${viewMode === mode.key ? 'is-active' : ''}`}
                onClick={() => onViewModeChange?.(mode.key as any)}
                title={mode.label}
              >
                {mode.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="center-stats-display">
          {/* 保存状态 */}
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved' && '已保存'}
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'unsaved' && '未保存'}
          </span>
          <div className="vertical-sep" style={{ opacity: 0.3, margin: '0 8px' }} />
          <span className="val">{wordCount}</span>
          <span className="lbl">词</span>
          <div className="vertical-sep" style={{ opacity: 0.3, margin: '0 8px' }} />
          <span className="lbl">LN</span>
          <span className="val">{cursor.line}</span>
          <div className="vertical-sep" style={{ opacity: 0.3, margin: '0 8px' }} />
          <span className="lbl">COL</span>
          <span className="val">{cursor.column}</span>
        </div>

        <div className="right-controls">
          <button className="mode-btn-styled" onClick={onToggleFocusMode} title="专注模式 (F8)">
            <IconFocus />
          </button>
          <button className="mode-btn-styled" onClick={onExportHtml} title="导出 HTML">
            <IconExport />
          </button>
        </div>
      </div>

      <style>{`
        .typora-status-bar-outer {
          height: 32px;
          display: flex;
          background: var(--bg-surface-solid);
          color: var(--text-secondary);
          user-select: none;
          font-family: var(--font-ui);
        }

        /* 侧边栏部分：无顶边框，确保垂直边框连贯 */
        .foundation-sidebar-part {
          width: clamp(240px, 26vw, 300px);
          flex-shrink: 0;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 6px;
          border-right: 1px solid var(--theme-divider, var(--stroke-surface));
          background: rgba(0,0,0,0.015);
          box-sizing: border-box;
        }

        .reveal-anim-wrap {
          display: flex; align-items: center; width: 100%; height: 100%;
          opacity: 0; transition: opacity 0.2s ease; pointer-events: none;
        }
        .reveal-anim-wrap.is-visible { opacity: 1; pointer-events: auto; }

        .folder-name-label {
          flex: 1; 
          display: flex; align-items: center; justify-content: center;
          height: calc(100% - 8px);
          margin: 0 4px; padding: 2px 8px; 
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s;
        }
        .folder-name-label:hover { background: var(--bg-hover); }
        
        .folder-name-label .name {
          font-size: 11px; font-weight: 500; color: var(--text-secondary);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* 编辑器部分：应用顶边框 */
        .foundation-editor-part {
          flex: 1; height: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 0 10px; position: relative; border-top: 1px solid var(--theme-divider, var(--stroke-surface));
        }

        .base-icon-btn, .mode-btn-styled, .slider-handle {
          background: transparent; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; border-radius: var(--radius-sm);
          color: var(--text-tertiary);
        }

        .base-icon-btn { width: 24px; height: 24px; }
        .mode-btn-styled { width: 28px; height: 26px; }
        .slider-handle { width: 24px; height: 26px; }

        .base-icon-btn:hover, .mode-btn-styled:hover, .slider-handle:hover {
          background: var(--bg-hover); color: var(--text-primary);
        }

        .mode-btn-styled.is-active { color: var(--accent); background: var(--accent-tint); }
        .base-icon-btn.is-active { color: var(--accent); background: var(--accent-tint); }
        .slider-handle.is-collapsed { color: var(--accent); }

        .vertical-sep { width: 1px; height: 12px; background: var(--stroke-divider); margin: 0 4px; }

        .center-stats-display {
          position: absolute; left: 50%; transform: translateX(-50%);
          display: flex; align-items: baseline; gap: 3px; pointer-events: none;
        }
        .val { font-family: var(--font-mono); font-size: 11px; font-weight: 500; }
        .lbl { font-size: 9px; color: var(--text-tertiary); font-weight: 700; }

        .save-status {
          font-size: 10px;
          color: var(--text-tertiary);
          font-weight: 500;
          transition: color 0.2s;
        }
        .save-status.saved { color: var(--text-tertiary); }
        .save-status.saving { color: var(--accent); }
        .save-status.unsaved { color: #f59e0b; }

        .mode-switcher-set, .left-controls, .right-controls { display: flex; align-items: center; gap: 4px; }
        
        svg.outline-icon { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }
      `}</style>
    </div>
  );
}
