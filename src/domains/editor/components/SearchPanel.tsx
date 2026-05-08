import { useEffect, useRef, useState } from 'react';

export interface SearchPanelProps {
  visible: boolean;
  viewMode: 'edit' | 'split' | 'preview';
  onClose: () => void;
  onSearch: (action: 'next' | 'prev' | 'all' | 'replace' | 'replaceAll', params: SearchParams) => void;
  initialQuery?: string;
}

export interface SearchParams {
  query: string;
  replaceWith: string;
  matchCase: boolean;
  regexp: boolean;
  wholeWord: boolean;
}

export function SearchPanel({ visible, viewMode, onClose, onSearch, initialQuery = '' }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isReplaceVisible, setIsReplaceVisible] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  
  const queryInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && queryInputRef.current) {
      queryInputRef.current.focus();
      queryInputRef.current.select();
    }
  }, [visible]);

  useEffect(() => {
    if (initialQuery && visible) {
      setQuery(initialQuery);
    }
  }, [initialQuery, visible]);

  // Click outside to close options dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    if (isOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOptionsOpen]);

  if (!visible) return null;

  const handleAction = (action: 'next' | 'prev' | 'all' | 'replace' | 'replaceAll') => {
    onSearch(action, { query, replaceWith, matchCase, regexp, wholeWord });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isOptionsOpen) {
        setIsOptionsOpen(false);
      } else {
        onClose();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleAction('prev');
      } else {
        handleAction('next');
      }
    }
  };

  const canReplace = viewMode !== 'preview';

  return (
    <div className="notepad-search-panel">
      <div className="notepad-search-container">
        {/* Top Row: Expander + Find Input + Controls */}
        <div className="notepad-search-row">
          <button 
            type="button" 
            className={`notepad-search-btn expander ${isReplaceVisible ? 'is-expanded' : ''}`}
            onClick={() => canReplace && setIsReplaceVisible(!isReplaceVisible)}
            style={{ visibility: canReplace ? 'visible' : 'hidden' }}
          ></button>

          <div className="notepad-search-input-wrapper">
            <input
              ref={queryInputRef}
              type="text"
              placeholder="查找"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="notepad-search-input"
            />
            <span className="notepad-search-icon-inside"></span>
          </div>

          <div className="notepad-search-separator"></div>

          <div className="notepad-search-controls">
            <button 
                name="next" 
                type="button" 
                className="notepad-search-btn icon-btn"
                title="查找下一个" 
                onClick={() => handleAction('next')}
            ></button>
            <button 
                name="prev" 
                type="button" 
                className="notepad-search-btn icon-btn"
                title="查找上一个" 
                onClick={() => handleAction('prev')}
            ></button>
            
            <div className="notepad-search-options-container" ref={optionsRef}>
              <button 
                type="button" 
                className={`notepad-search-btn icon-btn options-toggle ${isOptionsOpen ? 'is-active' : ''}`}
                title="更多选项"
                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              ></button>
              
              {isOptionsOpen && (
                <div className="notepad-search-options-menu">
                  <label className="notepad-menu-item">
                    <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
                    <span className="notepad-menu-check"></span>
                    区分大小写
                  </label>
                  <label className="notepad-menu-item">
                    <input type="checkbox" checked={true} readOnly />
                    <span className="notepad-menu-check"></span>
                    回绕
                  </label>
                  <div className="notepad-menu-separator"></div>
                  <label className={`notepad-menu-item ${!canReplace ? 'is-disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={regexp} 
                      disabled={!canReplace}
                      onChange={(e) => setRegexp(e.target.checked)} 
                    />
                    <span className="notepad-menu-check"></span>
                    正则表达式
                  </label>
                  <label className={`notepad-menu-item ${!canReplace ? 'is-disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={wholeWord} 
                      disabled={!canReplace}
                      onChange={(e) => setWholeWord(e.target.checked)} 
                    />
                    <span className="notepad-menu-check"></span>
                    全词匹配
                  </label>
                </div>
              )}
            </div>

            <button 
              name="close" 
              type="button" 
              className="notepad-search-btn icon-btn close-btn"
              aria-label="关闭" 
              onClick={onClose}
            ></button>
          </div>
        </div>

        {/* Bottom Row: Replace Input + Action Buttons */}
        {canReplace && isReplaceVisible && (
          <div className="notepad-search-row expanded-row">
            <div className="notepad-search-input-wrapper">
              <input
                type="text"
                placeholder="替换"
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAction('replace');
                  }
                }}
                className="notepad-search-input"
              />
            </div>
            <div className="notepad-search-actions">
              <button className="notepad-text-btn" type="button" onClick={() => handleAction('replace')}>替换</button>
              <button className="notepad-text-btn" type="button" onClick={() => handleAction('replaceAll')}>全部替换</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
