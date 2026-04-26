import styles from './FloatingToolbar.module.css';

interface FloatingToolbarProps {
  visible: boolean;
  x: number;
  y: number;
  onFormat: (format: 'bold' | 'italic' | 'code' | 'link' | 'quote') => void;
}

export function FloatingToolbar({ visible, x, y, onFormat }: FloatingToolbarProps) {
  if (!visible) return null;

  return (
    <div
      className={styles.toolbar}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        className={styles.button}
        onClick={() => onFormat('bold')}
        title="加粗"
      >
        B
      </button>
      <button
        className={styles.button}
        onClick={() => onFormat('italic')}
        title="斜体"
      >
        I
      </button>
      <button
        className={styles.button}
        onClick={() => onFormat('code')}
        title="代码"
      >
        &lt;&gt;
      </button>
      <button
        className={styles.button}
        onClick={() => onFormat('link')}
        title="链接"
      >
        🔗
      </button>
      <button
        className={styles.button}
        onClick={() => onFormat('quote')}
        title="引用"
      >
        ❝
      </button>
    </div>
  );
}
