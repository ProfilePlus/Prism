import { useEffect } from 'react';
import { useSettingsStore } from '../../domains/settings/store';
import { useWorkspaceStore } from '../../domains/workspace/store';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const settings = useSettingsStore();
  const workspace = useWorkspaceStore();

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const toggleClass = (on: boolean) => `toggle ${on ? 'on' : ''}`;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="偏好设置">
        <div className="modal-header">
          <div className="modal-title">偏好设置</div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="settings-group">
            <h4>编辑器</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">打字机模式</div>
                <div className="row-hint">当前行始终居中</div>
              </div>
              <div
                className={toggleClass(workspace.typewriterMode)}
                onClick={() => workspace.toggleTypewriterMode()}
                role="switch"
                aria-checked={workspace.typewriterMode}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">专注模式</div>
                <div className="row-hint">侧栏与菜单栏半透明，hover 恢复</div>
              </div>
              <div
                className={toggleClass(workspace.focusMode)}
                onClick={() => workspace.toggleFocusMode()}
                role="switch"
                aria-checked={workspace.focusMode}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">显示行号</div>
                <div className="row-hint">编辑器左侧行号栏</div>
              </div>
              <div
                className={toggleClass(settings.showLineNumbers)}
                onClick={() => settings.setShowLineNumbers(!settings.showLineNumbers)}
                role="switch"
                aria-checked={settings.showLineNumbers}
              />
            </div>
          </div>

          <div className="settings-group">
            <h4>外观</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">主题</div>
                <div className="row-hint">auto / light / dark</div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => settings.setTheme(e.target.value as 'auto' | 'light' | 'dark')}
                style={{
                  padding: '6px 10px',
                  background: 'var(--c-canvas)',
                  border: '1px solid var(--c-fog)',
                  borderRadius: 'var(--r-link)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  color: 'var(--c-void)',
                  cursor: 'pointer',
                }}
              >
                <option value="auto">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">字号</div>
                <div className="row-hint">{settings.fontSize}px</div>
              </div>
              <input
                type="range"
                min={12}
                max={22}
                step={1}
                value={settings.fontSize}
                onChange={(e) => settings.setFontSize(Number(e.target.value))}
                style={{ width: 160 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
