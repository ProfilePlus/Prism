import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  title: string;
}

// Unicode icon constants
const ICON_MINIMIZE = '';
const ICON_MAXIMIZE = '';
const ICON_CLOSE = '';

export function TitleBar({ title }: TitleBarProps) {
  const [window] = useState(() => getCurrentWindow());

  const handleMinimize = async () => {
    try {
      await window.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await window.toggleMaximize();
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };

  const handleClose = async () => {
    try {
      await window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className={styles.titlebar} data-tauri-drag-region>
      <span className={styles.title}>{title}</span>
      <div className={styles.controls}>
        <button
          className={styles.btn}
          onClick={handleMinimize}
          title="最小化"
          aria-label="最小化"
        >
          {ICON_MINIMIZE}
        </button>
        <button
          className={styles.btn}
          onClick={handleMaximize}
          title="最大化"
          aria-label="最大化"
        >
          {ICON_MAXIMIZE}
        </button>
        <button
          className={`${styles.btn} ${styles.close}`}
          onClick={handleClose}
          title="关闭"
          aria-label="关闭"
        >
          {ICON_CLOSE}
        </button>
      </div>
    </div>
  );
}
