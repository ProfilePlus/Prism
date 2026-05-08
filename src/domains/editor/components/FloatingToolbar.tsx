import styles from './FloatingToolbar.module.css';

interface FloatingToolbarProps {
  visible: boolean;
  x: number;
  y: number;
  onFormat: (format: 
    | 'bold' 
    | 'italic' 
    | 'code' 
    | 'link' 
    | 'quote' 
    | 'underline' 
    | 'strikethrough' 
    | 'highlight'
  ) => void;
}

export function FloatingToolbar({ visible, x, y, onFormat }: FloatingToolbarProps) {
  if (!visible) return null;

  // 边界检测：避免工具栏超出窗口
  const toolbarWidth = 280; // 工具栏大致宽度
  const toolbarHeight = 40; // 工具栏大致高度
  const menuBarHeight = 80; // 菜单栏 + 标题栏高度
  const padding = 10; // 边缘留白

  const safeX = Math.min(
    Math.max(x, padding + toolbarWidth / 2),
    window.innerWidth - padding - toolbarWidth / 2
  );
  const safeY = Math.max(y, menuBarHeight + toolbarHeight + padding);

  return (
    <div
      className={styles.toolbar}
      style={{
        left: `${safeX}px`,
        top: `${safeY}px`,
      }}
    >
      {/* 组 1：基础文本装饰 */}
      <div className={styles.group}>
        <button className={styles.button} onClick={() => onFormat('bold')} title="加粗 (Ctrl+B)" name="bold">B</button>
        <button className={styles.button} onClick={() => onFormat('italic')} title="斜体 (Ctrl+I)" name="italic">I</button>
        <button className={styles.button} onClick={() => onFormat('underline')} title="下划线 (Ctrl+U)" name="underline">U</button>
        <button className={styles.button} onClick={() => onFormat('strikethrough')} title="删除线 (Alt+Shift+5)" name="strikethrough"></button>
      </div>

      <div className={styles.divider}></div>

      {/* 组 2：视觉与功能增强 */}
      <div className={styles.group}>
        <button className={styles.button} onClick={() => onFormat('highlight')} title="高亮" name="highlight"></button>
        <button className={styles.button} onClick={() => onFormat('code')} title="行内代码" name="code"></button>
      </div>

      <div className={styles.divider}></div>

      {/* 组 3：链接与引用 */}
      <div className={styles.group}>
        <button className={styles.button} onClick={() => onFormat('link')} title="插入链接" name="link"></button>
        <button className={styles.button} onClick={() => onFormat('quote')} title="引用" name="quote"></button>
      </div>
    </div>
  );
}
