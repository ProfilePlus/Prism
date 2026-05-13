import { useState, useRef, useEffect, useMemo } from 'react';
import { menuData } from './menuData';
import { MenuDropdown } from './MenuDropdown';
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
  const { sidebarVisible, statusBarVisible, focusMode, typewriterMode, isFullscreen, isAlwaysOnTop } = useWorkspaceStore();
  const viewMode = useDocumentStore((s) => s.currentDocument?.viewMode);

  const processedMenuData = useMemo(() => {
    const newData = { ...menuData };
    
    // 处理主题菜单选中态
    if (newData['主题']) {
      newData['主题'] = newData['主题'].map(item => {
        if (item.type === 'separator') return item;
        const themeMap: Record<string, string> = {
          themeMiaoyan: 'miaoyan',
          themeInkstone: 'inkstone',
          themeSlate: 'slate',
          themeMono: 'mono',
          themeNocturne: 'nocturne',
        };
        return {
          ...item,
          checked: item.action ? themeMap[item.action] === contentTheme : false
        };
      });
    }

    // 处理视图菜单选中态
    if (newData['视图']) {
      newData['视图'] = newData['视图'].map(item => {
        if (item.type === 'separator') return item;
        let checked = false;
        if (item.action === 'toggleSidebar') checked = sidebarVisible;
        if (item.action === 'showOutline') checked = sidebarVisible && useWorkspaceStore.getState().sidebarTab === 'outline';
        if (item.action === 'showFiles') checked = sidebarVisible && useWorkspaceStore.getState().sidebarTab === 'files';
        if (item.action === 'sourceMode') checked = viewMode === 'edit';
        if (item.action === 'splitMode') checked = viewMode === 'split';
        if (item.action === 'previewMode') checked = viewMode === 'preview';
        if (item.action === 'focusMode') checked = focusMode;
        if (item.action === 'typewriterMode') checked = typewriterMode;
        if (item.action === 'statusBar') checked = statusBarVisible;
        if (item.action === 'fullscreen') checked = isFullscreen;
        if (item.action === 'alwaysOnTop') checked = isAlwaysOnTop;
        
        return { ...item, checked };
      });
    }

    return newData;
  }, [contentTheme, sidebarVisible, viewMode, statusBarVisible, focusMode, typewriterMode, isFullscreen, isAlwaysOnTop]);

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
