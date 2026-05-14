import { useState, useRef, useEffect, useMemo } from 'react';
import { menuData } from './menuData';
import { MenuDropdown } from './MenuDropdown';
import type { MenuItem, MenuSection } from './types';
import styles from './MenuBar.module.css';
import { useSettingsStore } from '../../domains/settings/store';
import { useWorkspaceStore } from '../../domains/workspace/store';
import { useDocumentStore } from '../../domains/document/store';

interface MenuBarProps {
  onAction: (action: string) => void;
}

export function MenuBar({ onAction }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const contentTheme = useSettingsStore((s) => s.contentTheme);
  const {
    sidebarVisible,
    sidebarTab,
    statusBarVisible,
    focusMode,
    typewriterMode,
    isFullscreen,
    isAlwaysOnTop,
  } = useWorkspaceStore();
  const viewMode = useDocumentStore((s) => s.currentDocument?.viewMode);

  const processedMenuData = useMemo(() => {
    const getChecked = (action?: string) => {
      if (!action) return false;

      const themeMap: Record<string, string> = {
        themeMiaoyan: 'miaoyan',
        themeInkstone: 'inkstone',
        themeSlate: 'slate',
        themeMono: 'mono',
        themeNocturne: 'nocturne',
      };

      if (themeMap[action]) return themeMap[action] === contentTheme;
      if (action === 'toggleSidebar') return sidebarVisible;
      if (action === 'showOutline') return sidebarVisible && sidebarTab === 'outline';
      if (action === 'showFiles' || action === 'showDocs') return sidebarVisible && sidebarTab === 'files';
      if (action === 'sourceMode') return viewMode === 'edit';
      if (action === 'splitMode') return viewMode === 'split';
      if (action === 'previewMode') return viewMode === 'preview';
      if (action === 'focusMode') return focusMode;
      if (action === 'typewriterMode') return typewriterMode;
      if (action === 'statusBar') return statusBarVisible;
      if (action === 'fullscreen') return isFullscreen;
      if (action === 'alwaysOnTop') return isAlwaysOnTop;

      return false;
    };

    const processItems = (items: MenuItem[]): MenuItem[] => items.map((item) => {
      if (item.type === 'separator') return item;
      return {
        ...item,
        checked: getChecked(item.action),
        children: item.children ? processItems(item.children) : item.children,
      };
    });

    return Object.fromEntries(
      Object.entries(menuData).map(([section, items]) => [section, processItems(items)]),
    ) as MenuSection;
  }, [
    contentTheme,
    sidebarVisible,
    sidebarTab,
    viewMode,
    statusBarVisible,
    focusMode,
    typewriterMode,
    isFullscreen,
    isAlwaysOnTop,
  ]);

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
      {Object.keys(processedMenuData).map((menuName) => (
        <div key={menuName} className={styles.menuItemWrapper}>
          <div
            className={`${styles.menuItem} ${activeMenu === menuName ? styles.active : ''}`}
            onClick={() => handleMenuClick(menuName)}
          >
            {menuName}
          </div>
          {activeMenu === menuName && (
            <MenuDropdown
              items={processedMenuData[menuName]}
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
