import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  docName: string;
  isDirty?: boolean;
}

const IconMin = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor">
    <path d="M2.5 6h7" />
  </svg>
);
const IconMax = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor">
    <rect x="2.5" y="2.5" width="7" height="7" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor">
    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
  </svg>
);

export function TitleBar({ docName, isDirty = false }: TitleBarProps) {
  const [window] = useState(() => getCurrentWindow());

  const handleMinimize = async () => {
    try { await window.minimize(); } catch (e) { console.error('minimize failed', e); }
  };
  const handleMaximize = async () => {
    try { await window.toggleMaximize(); } catch (e) { console.error('toggleMaximize failed', e); }
  };
  const handleClose = async () => {
    try { await window.close(); } catch (e) { console.error('close failed', e); }
  };

  return (
    <div className={`${styles.titlebar} app-titlebar`} data-tauri-drag-region>
      <div className={styles.brand}>
        <div className={styles.logo}>P</div>
        <div className={styles.title}>
          <span className={styles.docName}>{docName}</span>
          {isDirty && <span className={styles.dirtyDot} title="未保存" />}
          <span className={styles.sep}>—</span>
          <span className={styles.app}>Prism</span>
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={handleMinimize} title="最小化" aria-label="最小化">
          <IconMin />
        </button>
        <button className={styles.btn} onClick={handleMaximize} title="最大化" aria-label="最大化">
          <IconMax />
        </button>
        <button className={`${styles.btn} ${styles.close}`} onClick={handleClose} title="关闭" aria-label="关闭">
          <IconClose />
        </button>
      </div>
    </div>
  );
}
