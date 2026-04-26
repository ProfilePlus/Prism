import { useState } from 'react';
import { FileNode } from '../types';
import { FileTree } from './FileTree';
import { OutlinePanel } from './OutlinePanel';

interface SidebarProps {
  fileTree: FileNode[];
  documentContent: string;
  activePath?: string | null;
  onFileClick?: (path: string) => void;
  onOutlineClick?: (line: number) => void;
}

type SidebarTab = 'files' | 'outline' | 'search';

export function Sidebar({
  fileTree,
  documentContent,
  activePath,
  onFileClick,
  onOutlineClick,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div
      style={{
        width: 'clamp(220px, 24vw, 280px)',
        minWidth: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-surface-solid)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {[
          { key: 'files', label: '文件' },
          { key: 'outline', label: '大纲' },
          { key: 'search', label: '搜索' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as SidebarTab)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 0',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              border: 'none',
              background:
                activeTab === tab.key ? 'var(--bg-active)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'files' && (
          <FileTree
            nodes={fileTree}
            activePath={activePath}
            onFileClick={onFileClick || (() => {})}
          />
        )}
        {activeTab === 'outline' && (
          <OutlinePanel
            content={documentContent}
            onHeadingClick={onOutlineClick}
          />
        )}
        {activeTab === 'search' && (
          <div style={{ padding: '12px' }}>
            <input
              type="text"
              placeholder="搜索文档内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'var(--bg-surface)',
                color: 'inherit',
                marginBottom: '12px',
              }}
            />
            <div style={{ fontSize: '13px' }}>
              {searchQuery.trim() === '' ? (
                <div style={{ color: 'var(--text-muted)', padding: '8px' }}>
                  输入关键词搜索
                </div>
              ) : (
                (() => {
                  const lines = documentContent.split('\n');
                  const results = lines
                    .map((line, idx) => ({ line, lineNumber: idx + 1 }))
                    .filter(({ line }) =>
                      line.toLowerCase().includes(searchQuery.toLowerCase()),
                    );

                  if (results.length === 0) {
                    return (
                      <div style={{ color: 'var(--text-muted)', padding: '8px' }}>
                        无匹配结果
                      </div>
                    );
                  }

                  return results.map(({ line, lineNumber }) => (
                    <div
                      key={lineNumber}
                      onClick={() => onOutlineClick?.(lineNumber)}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          marginBottom: '2px',
                        }}
                      >
                        行 {lineNumber}
                      </div>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {line || '(空行)'}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
