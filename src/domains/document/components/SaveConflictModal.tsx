export type SaveConflictAction = 'reload' | 'saveAs' | 'overwrite';

interface SaveConflictModalProps {
  visible: boolean;
  documentName: string;
  error: string | null;
  busyAction: SaveConflictAction | null;
  onReload: () => void;
  onSaveAs: () => void;
  onOverwrite: () => void;
}

function getBusyLabel(action: SaveConflictAction | null, fallback: string) {
  if (!action) return fallback;
  if (action === 'reload') return '正在重新加载...';
  if (action === 'saveAs') return '正在另存...';
  return '正在覆盖...';
}

export function SaveConflictModal({
  visible,
  documentName,
  error,
  busyAction,
  onReload,
  onSaveAs,
  onOverwrite,
}: SaveConflictModalProps) {
  if (!visible) return null;

  const isBusy = busyAction !== null;

  return (
    <>
      <div className="modal-overlay" />
      <div className="modal prism-conflict-modal" role="dialog" aria-label="文件冲突" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title">文件冲突</div>
        </div>
        <div className="modal-body prism-conflict-body">
          <div className="prism-conflict-kicker">磁盘版本已变化</div>
          <div className="prism-conflict-title">{documentName}</div>
          <p>
            这个文件已被 Prism 外部修改。请选择保留当前编辑内容、重新载入磁盘版本，或明确覆盖磁盘版本。
          </p>
          {error && <div className="prism-conflict-error">{error}</div>}
        </div>
        <div className="prism-conflict-actions">
          <button type="button" onClick={onReload} disabled={isBusy}>
            {busyAction === 'reload' ? getBusyLabel(busyAction, '重新加载磁盘版本') : '重新加载磁盘版本'}
          </button>
          <button type="button" className="primary" onClick={onSaveAs} disabled={isBusy}>
            {busyAction === 'saveAs' ? getBusyLabel(busyAction, '保留我的版本并另存为') : '保留我的版本并另存为'}
          </button>
          <button type="button" className="danger" onClick={onOverwrite} disabled={isBusy}>
            {busyAction === 'overwrite' ? getBusyLabel(busyAction, '覆盖磁盘版本') : '覆盖磁盘版本'}
          </button>
        </div>
      </div>
    </>
  );
}
