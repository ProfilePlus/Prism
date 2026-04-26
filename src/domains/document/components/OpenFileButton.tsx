import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useDocumentStore } from '../store';
import { useWorkspaceStore } from '../../workspace/store';
import { loadFolderTree } from '../../workspace/lib/loadFolderTree';
import { openPrismWindow } from '../../../lib/openWindow';

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

export function OpenFileButton() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const { setRootPath, setFileTree } = useWorkspaceStore();

  const handleOpen = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });

      if (typeof selected !== 'string') return;

      if (!currentDocument) {
        console.log('[OpenFileButton] Loading in current window');
        const content = await readTextFile(selected);
        openDocument(selected, basename(selected), content);

        const parentDir = dirname(selected);
        setRootPath(parentDir);
        const tree = await loadFolderTree(parentDir);
        setFileTree(tree);
      } else {
        console.log('[OpenFileButton] Opening new window');
        await openPrismWindow({ filePath: selected });
      }
    } catch (err) {
      console.error('[OpenFileButton] Failed:', err);
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
      打开文件
    </button>
  );
}
