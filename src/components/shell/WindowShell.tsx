import { ReactNode } from 'react';
import styles from './WindowShell.module.css';

interface WindowShellProps {
  children: ReactNode;
}

export function WindowShell({ children }: WindowShellProps) {
  return (
    <div className={styles.windowShell}>
      {children}
    </div>
  );
}
