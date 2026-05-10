import styles from './MenuDropdown.module.css';
import type { MenuItem } from './types';

interface MenuDropdownProps {
  items: MenuItem[];
  onAction: (action: string) => void;
  onClose: () => void;
}

const CheckIcon = () => (
  <svg className={styles.checkIcon} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2.5 6.5l2.5 2.5 5-6" />
  </svg>
);

export function MenuDropdown({ items, onAction, onClose }: MenuDropdownProps) {
  const visibleItems = items.filter((item) => {
    if (item.type === 'separator') return true;
    return !item.hidden;
  });

  const cleanedItems = visibleItems.filter((item, idx, arr) => {
    if (item.type !== 'separator') return true;
    if (idx === 0 || idx === arr.length - 1) return false;
    if (arr[idx - 1]?.type === 'separator') return false;
    return true;
  });

  const handleItemClick = (item: MenuItem) => {
    if (item.type === 'separator') return;
    if (item.disabled || item.submenu) return;
    if (item.action) {
      onAction(item.action);
      onClose();
    }
  };

  return (
    <div className={styles.dropdown} role="menu">
      {cleanedItems.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={`sep-${idx}`} className={styles.separator} role="separator" />;
        }

        const className = [
          styles.item,
          item.disabled ? styles.disabled : '',
          item.submenu ? styles.submenu : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={`${item.label}-${idx}`}
            className={className}
            role="menuitem"
            aria-disabled={item.disabled ? true : undefined}
            aria-haspopup={item.submenu ? true : undefined}
            onClick={() => handleItemClick(item)}
          >
            <div className={styles.check}>
              {item.checked ? <CheckIcon /> : null}
            </div>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.meta}>
              {item.shortcut ? (
                <span className={styles.shortcut}>{item.shortcut}</span>
              ) : null}
              {item.submenu ? <span className={styles.arrow}>›</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
