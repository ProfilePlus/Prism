import { useState, useRef, useEffect } from 'react';
import { MenuDropdown } from './MenuDropdown';
import type { MenuSection } from './types';
import styles from './MenuBar.module.css';

interface MenuBarProps {
  sections: MenuSection;
  onAction: (action: string) => void;
}

export function MenuBar({ sections, onAction }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  return (
    <div className={`${styles.menubar} app-menubar`} ref={menuRef}>
      {Object.keys(sections).map((menuName) => (
        <div key={menuName} className={styles.menuItemWrapper}>
          <div
            className={`${styles.menuItem} ${activeMenu === menuName ? styles.active : ''}`}
            onClick={() => handleMenuClick(menuName)}
          >
            {menuName}
          </div>
          {activeMenu === menuName && (
            <MenuDropdown
              items={sections[menuName]}
              onAction={onAction}
              onClose={() => setActiveMenu(null)}
            />
          )}
        </div>
      ))}
      <div className={styles.spacer} />
    </div>
  );
}
