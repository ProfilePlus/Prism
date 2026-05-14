import { useEffect, type CSSProperties } from 'react';
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
  const selectStyle: CSSProperties = {
    padding: '6px 10px',
    background: 'var(--c-canvas)',
    border: '1px solid var(--c-fog)',
    borderRadius: 'var(--r-link)',
    fontFamily: 'inherit',
    fontSize: 13,
    color: 'var(--c-void)',
    cursor: 'pointer',
  };

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
            <div className="settings-row">
              <div>
                <div className="row-label">编辑器字体</div>
                <div className="row-hint">{settings.editorFontFamily}</div>
              </div>
              <select
                value={settings.editorFontFamily}
                onChange={(e) => settings.setEditorFontFamily(e.target.value)}
                style={selectStyle}
              >
                <option value="Cascadia Code, Consolas, monospace">Cascadia Code</option>
                <option value="'JetBrains Mono', 'SF Mono', Menlo, monospace">JetBrains Mono</option>
                <option value="'SF Mono', Menlo, Monaco, monospace">SF Mono</option>
                <option value="'TsangerJinKai02-W04', 'Kaiti SC', serif">霞鹜文楷</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">编辑器字号</div>
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
            <div className="settings-row">
              <div>
                <div className="row-label">编辑器行高</div>
                <div className="row-hint">{settings.editorLineHeight.toFixed(2)}</div>
              </div>
              <input
                type="range"
                min={1.3}
                max={2.2}
                step={0.05}
                value={settings.editorLineHeight}
                onChange={(e) => settings.setEditorLineHeight(Number(e.target.value))}
                style={{ width: 160 }}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">默认视图</div>
                <div className="row-hint">新建和打开文档时使用</div>
              </div>
              <select
                value={settings.defaultViewMode}
                onChange={(e) => settings.setDefaultViewMode(e.target.value as 'edit' | 'split' | 'preview')}
                style={selectStyle}
              >
                <option value="edit">编辑</option>
                <option value="split">分栏</option>
                <option value="preview">预览</option>
              </select>
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
                style={selectStyle}
              >
                <option value="auto">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">预览字体</div>
                <div className="row-hint">{settings.previewFontFamily}</div>
              </div>
              <select
                value={settings.previewFontFamily}
                onChange={(e) => settings.setPreviewFontFamily(e.target.value)}
                style={selectStyle}
              >
                <option value="inherit">跟随主题</option>
                <option value="'TsangerJinKai02-W04', 'Kaiti SC', serif">霞鹜文楷</option>
                <option value="'Source Serif 4', Georgia, serif">Source Serif</option>
                <option value="'IBM Plex Sans', 'PingFang SC', sans-serif">IBM Plex Sans</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">预览字号</div>
                <div className="row-hint">{settings.previewFontSize}px</div>
              </div>
              <input
                type="range"
                min={13}
                max={24}
                step={1}
                value={settings.previewFontSize}
                onChange={(e) => settings.setPreviewFontSize(Number(e.target.value))}
                style={{ width: 160 }}
              />
            </div>
          </div>

          <div className="settings-group">
            <h4>导出</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">默认格式</div>
                <div className="row-hint">导出工作台预设</div>
              </div>
              <select
                value={settings.exportDefaults.format}
                onChange={(e) => settings.setExportDefaultFormat(e.target.value as 'html' | 'pdf' | 'docx' | 'png')}
                style={selectStyle}
              >
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx)</option>
                <option value="html">HTML</option>
                <option value="png">PNG 图像</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">PNG 清晰度</div>
                <div className="row-hint">{settings.exportDefaults.pngScale}x</div>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.5}
                value={settings.exportDefaults.pngScale}
                onChange={(e) => settings.setExportPngScale(Number(e.target.value))}
                style={{ width: 160 }}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">HTML 包含主题</div>
                <div className="row-hint">导出时内联当前主题样式</div>
              </div>
              <div
                className={toggleClass(settings.exportDefaults.htmlIncludeTheme)}
                onClick={() => settings.setExportHtmlIncludeTheme(!settings.exportDefaults.htmlIncludeTheme)}
                role="switch"
                aria-checked={settings.exportDefaults.htmlIncludeTheme}
              />
            </div>
          </div>

          <div className="settings-group">
            <h4>文件</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">自动保存间隔</div>
                <div className="row-hint">{(settings.autoSaveInterval / 1000).toFixed(1)} 秒</div>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={500}
                value={settings.autoSaveInterval}
                onChange={(e) => settings.setAutoSaveInterval(Number(e.target.value))}
                style={{ width: 160 }}
              />
            </div>
          </div>

          <div className="settings-group">
            <h4>快捷键</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">显示风格</div>
                <div className="row-hint">菜单和命令面板中的快捷键文案</div>
              </div>
              <select
                value={settings.shortcutStyle}
                onChange={(e) => settings.setShortcutStyle(e.target.value as 'auto' | 'mac' | 'windows')}
                style={selectStyle}
              >
                <option value="auto">跟随系统</option>
                <option value="mac">macOS</option>
                <option value="windows">Windows</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
