import { useEffect, useMemo, useState } from 'react';
import styles from './StatusBar.module.css';
import { useWorkspaceStore } from '../../workspace/store';
import { useDocumentStore } from '../../document/store';

const IconSource = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <path d="M6 4L2 8l4 4M10 4l4 4-4 4" />
  </svg>
);
const IconSplit = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <rect x="2" y="2" width="12" height="12" rx="1" />
    <path d="M8 2v12" />
  </svg>
);
const IconPreview = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <rect x="2" y="2" width="12" height="12" rx="1" />
    <path d="M5 6h6M5 9h6M5 12h4" />
  </svg>
);
const IconFocus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
);
const IconExport = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <path d="M8 10V2M8 2L5 5M8 2l3 3M3 10v3a1 1 0 001 1h8a1 1 0 001-1v-3" />
  </svg>
);
const IconCollapse = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7.5 3l-3 3 3 3" />
  </svg>
);
const IconExpand = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4.5 3l3 3-3 3" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <path d="M8 3v10M3 8h10" />
  </svg>
);
const IconTree = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <path d="M3 4h2M3 8h2M3 12h2M7 4h6M7 8h6M7 12h4" />
  </svg>
);
const IconList = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
    <path d="M3 4h10M3 8h10M3 12h10" />
  </svg>
);
const IconMore = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
    <circle cx="3" cy="6" r="1" />
    <circle cx="6" cy="6" r="1" />
    <circle cx="9" cy="6" r="1" />
  </svg>
);

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
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const rootName = useMemo(() => {
    if (!rootPath) return 'Documents';
    return rootPath.split(/[\\/]/).pop() || rootPath;
  }, [rootPath]);

  useEffect(() => {
    if (!currentDocument) { setSaveStatus('saved'); return; }
    if (currentDocument.isDirty) {
      setSaveStatus('unsaved');
      const timer = setTimeout(() => setSaveStatus('saving'), 1500);
      return () => clearTimeout(timer);
    }
    setSaveStatus('saved');
  }, [currentDocument?.isDirty, currentDocument?.lastSavedAt]);

  const modes = [
    { key: 'edit', label: '源码', icon: <IconSource /> },
    { key: 'split', label: '分栏', icon: <IconSplit /> },
    { key: 'preview', label: '预览', icon: <IconPreview /> },
  ] as const;

  return (
    <div className={styles.statusbar}>
      {sidebarVisible && (
        <div
          className={`${styles.sidebarZone} ${isSidebarHovered ? styles.visible + ' is-visible' : ''}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <button className={`${styles.btn} ${styles.iconBtn}`} title="新建文件" onClick={onNewFile}>
            <IconPlus />
          </button>
          <button
            className={`${styles.btn} ${styles.iconBtn} ${fileTreeMode === 'list' ? styles.active + ' is-active' : ''}`}
            title={fileTreeMode === 'tree' ? '切换到文档列表' : '切换到文档树'}
            onClick={onToggleFileTreeMode}
          >
            {fileTreeMode === 'tree' ? <IconTree /> : <IconList />}
          </button>
          <button
            className={styles.folder}
            onContextMenu={onFolderContextMenu}
            onClick={onFolderContextMenu}
            title="工作区操作"
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{rootName}</span>
            <IconMore />
          </button>
        </div>
      )}

      <div className={styles.main}>
        <div className={styles.left}>
          <button
            className={`${styles.btn} ${styles.iconBtn}`}
            onClick={onToggleSidebar}
            title={sidebarVisible ? '收起侧边栏' : '展开侧边栏'}
          >
            {sidebarVisible ? <IconCollapse /> : <IconExpand />}
          </button>
          <div className={styles.sep} />
          <div className={styles.modeGroup}>
            {modes.map((m) => (
              <button
                key={m.key}
                className={`${styles.modeBtn} ${viewMode === m.key ? styles.active + ' is-active' : ''}`}
                onClick={() => onViewModeChange?.(m.key)}
                title={m.label}
              >
                {m.icon}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.center}>
          <span className={`${styles.saveStatus} ${styles[saveStatus]}`}>
            {saveStatus === 'saved' && '已保存'}
            {saveStatus === 'saving' && '保存中…'}
            {saveStatus === 'unsaved' && '未保存'}
          </span>
          <div className={styles.sep} />
          <span className={styles.statVal}>{wordCount}</span>
          <span className={styles.statLbl}>词</span>
          <div className={styles.sep} />
          <span className={styles.statLbl}>LN</span>
          <span className={styles.statVal}>{cursor.line}</span>
          <div className={styles.sep} />
          <span className={styles.statLbl}>COL</span>
          <span className={styles.statVal}>{cursor.column}</span>
        </div>

        <div className={styles.right}>
          <button
            className={`${styles.btn} ${styles.iconBtn} ${focusMode ? styles.active : ''}`}
            onClick={onToggleFocusMode}
            title="专注模式 (F8)"
          >
            <IconFocus />
          </button>
          <button className={`${styles.btn} ${styles.iconBtn}`} onClick={onExportHtml} title="导出 HTML">
            <IconExport />
          </button>
        </div>
      </div>
    </div>
  );
}
