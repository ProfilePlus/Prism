import { open } from '@tauri-apps/plugin-dialog';
import { useDocumentStore } from '../../document/store';
import { useWorkspaceStore } from '../store';
import { loadFolderTree } from '../lib/loadFolderTree';
import { openPrismWindow } from '../../../lib/openWindow';

export function OpenFolderButton() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const { setRootPath, setFileTree } = useWorkspaceStore();

  const handleOpen = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (typeof selected !== 'string') return;

      if (!currentDocument) {
        console.log('[OpenFolderButton] Loading in current window');
        setRootPath(selected);
        const tree = await loadFolderTree(selected);
        setFileTree(tree);
      } else {
        console.log('[OpenFolderButton] Opening new window');
        await openPrismWindow({ folderPath: selected });
      }
    } catch (err) {
      console.error('[OpenFolderButton] Failed:', err);
    }
  };

  return (
    <button
      onClick={handleOpen}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      打开文件夹
    </button>
  );
}
