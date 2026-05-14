import { useEffect, type CSSProperties } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../../domains/settings/store';
import type {
  AutoSaveStrategy,
  ContentTheme,
  DefaultViewMode,
  DocxFontPolicy,
  ExportDefaultLocation,
  ExportTemplateId,
  FontSource,
  PdfMargin,
  PdfPaper,
  ShortcutStyle,
} from '../../domains/settings/types';
import {
  BUILTIN_FONT_OPTIONS,
  SYSTEM_FONT_OPTIONS,
  deleteCustomFontFile,
  importCustomFont,
} from '../../domains/settings/fontService';
import { EXPORT_TEMPLATES } from '../../domains/export/templates';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

function encodeFontSource(source: FontSource) {
  return `${source.kind}:${source.value}`;
}

function decodeFontSource(value: string): FontSource {
  const [kind, ...rest] = value.split(':');
  const sourceValue = rest.join(':');
  if (kind === 'theme' || kind === 'builtin' || kind === 'system' || kind === 'custom') {
    return { kind, value: sourceValue };
  }
  return { kind: 'theme', value: '' };
}

function getFontSourceHint(source: FontSource, resolvedFamily: string) {
  return source.kind === 'theme' ? '跟随主题' : resolvedFamily;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const settings = useSettingsStore();

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
    maxWidth: 220,
  };
  const buttonStyle: CSSProperties = {
    padding: '6px 12px',
    background: 'var(--c-canvas)',
    border: '1px solid var(--c-fog)',
    borderRadius: 'var(--r-link)',
    fontFamily: 'inherit',
    fontSize: 13,
    color: 'var(--c-void)',
    cursor: 'pointer',
  };

  const importFont = async () => {
    const result = await importCustomFont();
    if (result) settings.addCustomFont(result.font);
  };

  const chooseCustomExportDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: settings.exportDefaults.customDirectory || undefined,
    });
    if (!selected || Array.isArray(selected)) return;
    settings.setExportCustomDirectory(selected);
    settings.setExportDefaultLocation('custom');
  };

  const removeFont = async (fontId: string) => {
    const font = settings.customFonts.find((item) => item.id === fontId);
    if (font) await deleteCustomFontFile(font);
    settings.removeCustomFont(fontId);
  };

  const fontOptions = (
    <>
      <option value="theme:">跟随主题</option>
      {BUILTIN_FONT_OPTIONS.map((font) => (
        <option key={font.id} value={`builtin:${font.family}`}>{font.label}</option>
      ))}
      {SYSTEM_FONT_OPTIONS.map((font) => (
        <option key={font.id} value={`system:${font.family}`}>{font.label}</option>
      ))}
      {settings.customFonts.map((font) => (
        <option key={font.id} value={`custom:${font.id}`}>{font.displayName}</option>
      ))}
    </>
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal settings-modal" role="dialog" aria-label="设置中心">
        <div className="modal-header">
          <div className="modal-title">设置中心</div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="settings-group">
            <h4>通用</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">默认视图</div>
                <div className="row-hint">新建和打开文档时使用</div>
              </div>
              <select
                value={settings.defaultViewMode}
                onChange={(e) => settings.setDefaultViewMode(e.target.value as DefaultViewMode)}
                style={selectStyle}
              >
                <option value="edit">编辑</option>
                <option value="split">分栏</option>
                <option value="preview">预览</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">快捷键显示</div>
                <div className="row-hint">菜单和命令面板中的快捷键文案</div>
              </div>
              <select
                value={settings.shortcutStyle}
                onChange={(e) => settings.setShortcutStyle(e.target.value as ShortcutStyle)}
                style={selectStyle}
              >
                <option value="auto">跟随系统</option>
                <option value="mac">macOS</option>
                <option value="windows">Windows</option>
              </select>
            </div>
          </div>

          <div className="settings-group">
            <h4>写作</h4>
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
                <div className="row-label">自动保存</div>
                <div className="row-hint">只对已保存过路径的文档生效</div>
              </div>
              <div
                className={toggleClass(settings.autoSaveEnabled)}
                onClick={() => settings.setAutoSaveEnabled(!settings.autoSaveEnabled)}
                role="switch"
                aria-checked={settings.autoSaveEnabled}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">自动保存策略</div>
                <div className="row-hint">{(settings.autoSaveInterval / 1000).toFixed(1)} 秒</div>
              </div>
              <select
                value={settings.autoSaveStrategy}
                onChange={(e) => settings.setAutoSaveStrategy(e.target.value as AutoSaveStrategy)}
                style={selectStyle}
              >
                <option value="instant">即时</option>
                <option value="balanced">均衡</option>
                <option value="battery">省电</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">编辑器字体</div>
                <div className="row-hint">{getFontSourceHint(settings.editorFontSource, settings.editorFontFamily)}</div>
              </div>
              <select
                value={encodeFontSource(settings.editorFontSource)}
                onChange={(e) => settings.setEditorFontSource(decodeFontSource(e.target.value))}
                style={selectStyle}
              >
                {fontOptions}
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
          </div>

          <div className="settings-group">
            <h4>主题</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">内容主题</div>
                <div className="row-hint">编辑、预览、搜索和导出共享主题 token</div>
              </div>
              <select
                value={settings.contentTheme}
                onChange={(e) => settings.setContentTheme(e.target.value as ContentTheme)}
                style={selectStyle}
              >
                <option value="miaoyan">Miaoyan</option>
                <option value="inkstone">Inkstone Light</option>
                <option value="slate">Slate Manual</option>
                <option value="mono">Mono Lab</option>
                <option value="nocturne">Nocturne Dark</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">预览字体</div>
                <div className="row-hint">{getFontSourceHint(settings.previewFontSource, settings.previewFontFamily)}</div>
              </div>
              <select
                value={encodeFontSource(settings.previewFontSource)}
                onChange={(e) => settings.setPreviewFontSource(decodeFontSource(e.target.value))}
                style={selectStyle}
              >
                {fontOptions}
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
            <div className="settings-row">
              <div>
                <div className="row-label">导入字体</div>
                <div className="row-hint">支持 ttf / otf / woff / woff2，可用于编辑、预览和 DOCX</div>
              </div>
              <button type="button" style={buttonStyle} onClick={importFont}>导入字体</button>
            </div>
            {settings.customFonts.map((font) => (
              <div className="settings-row" key={font.id}>
                <div>
                  <div className="row-label">{font.displayName}</div>
                  <div className="row-hint">{font.filename}</div>
                </div>
                <button type="button" style={buttonStyle} onClick={() => removeFont(font.id)}>移除</button>
              </div>
            ))}
          </div>

          <div className="settings-group">
            <h4>导出</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">导出模板</div>
                <div className="row-hint">{EXPORT_TEMPLATES[settings.exportDefaults.templateId].description}</div>
              </div>
              <select
                value={settings.exportDefaults.templateId}
                onChange={(e) => {
                  const templateId = e.target.value as ExportTemplateId;
                  const template = EXPORT_TEMPLATES[templateId];
                  settings.setExportTemplateId(templateId);
                  settings.setExportPdfMargin(template.pdfMargin);
                  settings.setExportDocxFontPolicy(template.docxFontPolicy);
                }}
                style={selectStyle}
              >
                {Object.values(EXPORT_TEMPLATES).map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">PDF 纸张</div>
                <div className="row-hint">影响 PDF 分页尺寸</div>
              </div>
              <select
                value={settings.exportDefaults.pdfPaper}
                onChange={(e) => settings.setExportPdfPaper(e.target.value as PdfPaper)}
                style={selectStyle}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">PDF 边距</div>
                <div className="row-hint">紧凑适合长文，宽松适合正式文档</div>
              </div>
              <select
                value={settings.exportDefaults.pdfMargin}
                onChange={(e) => settings.setExportPdfMargin(e.target.value as PdfMargin)}
                style={selectStyle}
              >
                <option value="compact">紧凑</option>
                <option value="standard">标准</option>
                <option value="wide">宽松</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">默认导出位置</div>
                <div className="row-hint">{settings.exportDefaults.customDirectory || '未指定自定义目录'}</div>
              </div>
              <select
                value={settings.exportDefaults.defaultLocation}
                onChange={(e) => settings.setExportDefaultLocation(e.target.value as ExportDefaultLocation)}
                style={selectStyle}
              >
                <option value="ask">每次询问</option>
                <option value="document">文档所在文件夹</option>
                <option value="downloads">下载文件夹</option>
                <option value="custom">自定义目录</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">自定义导出目录</div>
                <div className="row-hint">{settings.exportDefaults.customDirectory || '选择一个固定目录'}</div>
              </div>
              <button type="button" style={buttonStyle} onClick={chooseCustomExportDirectory}>选择目录</button>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">DOCX 字体</div>
                <div className="row-hint">导入字体会尝试嵌入到 Word 文件</div>
              </div>
              <select
                value={settings.exportDefaults.docxFontPolicy}
                onChange={(e) => settings.setExportDocxFontPolicy(e.target.value as DocxFontPolicy)}
                style={selectStyle}
              >
                <option value="theme">跟随主题</option>
                <option value="preview">使用预览字体</option>
                <option value="custom">指定导入字体</option>
              </select>
            </div>
            {settings.exportDefaults.docxFontPolicy === 'custom' && (
              <div className="settings-row">
                <div>
                  <div className="row-label">指定 DOCX 字体</div>
                  <div className="row-hint">仅显示已导入字体</div>
                </div>
                <select
                  value={settings.exportDefaults.docxCustomFontId}
                  onChange={(e) => settings.setExportDocxCustomFontId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">跟随主题</option>
                  {settings.customFonts.map((font) => (
                    <option key={font.id} value={font.id}>{font.displayName}</option>
                  ))}
                </select>
              </div>
            )}
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
          </div>

          <div className="settings-group">
            <h4>文件</h4>
            <div className="settings-row">
              <div>
                <div className="row-label">启动时恢复上次窗口</div>
                <div className="row-hint">没有显式打开文件时恢复上次文档和工作区</div>
              </div>
              <div
                className={toggleClass(settings.restoreLastSession)}
                onClick={() => settings.setRestoreLastSession(!settings.restoreLastSession)}
                role="switch"
                aria-checked={settings.restoreLastSession}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">最近文档数量</div>
                <div className="row-hint">当前 {settings.recentFiles.length} 个</div>
              </div>
              <select
                value={settings.recentFilesLimit}
                onChange={(e) => settings.setRecentFilesLimit(Number(e.target.value))}
                style={selectStyle}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <div className="row-label">清空最近文档</div>
                <div className="row-hint">只清除记录，不删除文件</div>
              </div>
              <button type="button" style={buttonStyle} onClick={() => settings.clearRecentFiles()}>清空</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
