import type { RecoverySnapshot } from '../services/recovery';

type RecoveryAction = 'restore' | 'discard';

interface RecoveryModalProps {
  visible: boolean;
  snapshot: RecoverySnapshot | null;
  busyAction: RecoveryAction | null;
  onRestore: () => void;
  onDiscard: () => void;
}

function formatRecoveryTime(createdAt: number) {
  return new Date(createdAt).toLocaleString();
}

export function RecoveryModal({
  visible,
  snapshot,
  busyAction,
  onRestore,
  onDiscard,
}: RecoveryModalProps) {
  if (!visible || !snapshot) return null;

  const isBusy = busyAction !== null;

  return (
    <>
      <div className="modal-overlay" />
      <div className="modal prism-recovery-modal" role="dialog" aria-label="恢复文档" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title">恢复文档</div>
        </div>
        <div className="modal-body prism-recovery-body">
          <div className="prism-recovery-kicker">发现未保存版本</div>
          <div className="prism-recovery-title">{snapshot.documentName}</div>
          <div className="prism-recovery-path" title={snapshot.documentPath}>
            {snapshot.documentPath}
          </div>
          <p>
            Prism 找到一个本地恢复快照，保存于 {formatRecoveryTime(snapshot.createdAt)}。
          </p>
        </div>
        <div className="prism-recovery-actions">
          <button type="button" onClick={onDiscard} disabled={isBusy}>
            {busyAction === 'discard' ? '正在丢弃...' : '丢弃快照'}
          </button>
          <button type="button" className="primary" onClick={onRestore} disabled={isBusy}>
            {busyAction === 'restore' ? '正在恢复...' : '恢复这个版本'}
          </button>
        </div>
      </div>
    </>
  );
}
