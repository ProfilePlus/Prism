import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { basicSetup } from 'codemirror';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useSettingsStore } from '../../settings/store';
import { FloatingToolbar } from './FloatingToolbar';

export interface EditorPaneHandle {
  jumpToLine: (line: number) => void;
  setScrollRatio: (ratio: number) => void;
}

interface EditorPaneProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
  onScrollRatioChange?: (ratio: number) => void;
}

function getCursorPosition(view: EditorView) {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  return {
    line: line.number,
    column: pos - line.from + 1,
  };
}

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(
  function EditorPane(
    { content, onChange, onCursorChange, onScrollRatioChange },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onCursorChangeRef = useRef(onCursorChange);
    const onScrollRatioChangeRef = useRef(onScrollRatioChange);
    const theme = useSettingsStore((s) => s.theme);
    const [toolbarState, setToolbarState] = useState({
      visible: false,
      x: 0,
      y: 0,
    });

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      onCursorChangeRef.current = onCursorChange;
    }, [onCursorChange]);

    useEffect(() => {
      onScrollRatioChangeRef.current = onScrollRatioChange;
    }, [onScrollRatioChange]);

    useImperativeHandle(ref, () => ({
      jumpToLine: (lineNumber: number) => {
        const view = viewRef.current;
        if (!view) return;

        const targetLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
        const line = view.state.doc.line(targetLine);

        view.dispatch({
          selection: { anchor: line.from },
          effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        });

        view.focus();
      },
      setScrollRatio: (ratio: number) => {
        const view = viewRef.current;
        if (!view) return;
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTop = Math.max(0, ratio) * maxScroll;
      },
    }));

    const handleFormat = useCallback(
      (
        format:
          | 'bold'
          | 'italic'
          | 'code'
          | 'link'
          | 'quote'
          | 'underline'
          | 'strikethrough',
      ) => {
        const view = viewRef.current;
        if (!view) return;

        const selection = view.state.selection.main;
        if (selection.from === selection.to) {
          setToolbarState({ visible: false, x: 0, y: 0 });
          return;
        }

        const selectedText = view.state.doc.sliceString(selection.from, selection.to);

        let wrappedText = selectedText;
        if (format === 'bold') {
          wrappedText = `**${selectedText}**`;
        } else if (format === 'italic') {
          wrappedText = `*${selectedText}*`;
        } else if (format === 'code') {
          wrappedText = `\`${selectedText}\``;
        } else if (format === 'link') {
          wrappedText = `[${selectedText}](url)`;
        } else if (format === 'quote') {
          wrappedText = selectedText
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n');
        } else if (format === 'underline') {
          wrappedText = `<u>${selectedText}</u>`;
        } else if (format === 'strikethrough') {
          wrappedText = `~~${selectedText}~~`;
        }

        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: wrappedText,
          },
        });

        setToolbarState({ visible: false, x: 0, y: 0 });
        view.focus();
      },
      [],
    );

    // 监听菜单格式化事件
    useEffect(() => {
      const onFormat = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.format) handleFormat(detail.format);
      };
      const onHeading = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const detail = (e as CustomEvent).detail;
        const level = parseInt(detail.level.replace('h', ''), 10);
        const prefix = '#'.repeat(level) + ' ';
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        const lineText = view.state.doc.sliceString(line.from, line.to);
        const stripped = lineText.replace(/^#{1,6}\s*/, '');
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: prefix + stripped },
        });
        view.focus();
      };
      const onBlock = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const detail = (e as CustomEvent).detail;
        const fmt: string = detail.format;
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        const lineText = view.state.doc.sliceString(line.from, line.to);

        // 特殊处理：段落（清除 heading 前缀）
        if (fmt === 'paragraph') {
          const stripped = lineText.replace(/^#{1,6}\s*/, '');
          view.dispatch({ changes: { from: line.from, to: line.to, insert: stripped } });
          view.focus();
          return;
        }

        // 特殊处理：增加 heading 级别
        if (fmt === 'increaseHeading') {
          const match = lineText.match(/^(#{1,6})\s/);
          if (match && match[1].length < 6) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: '#' + lineText } });
          } else if (!match) {
            view.dispatch({ changes: { from: line.from, insert: '# ' } });
          }
          view.focus();
          return;
        }

        // 特殊处理：减少 heading 级别
        if (fmt === 'decreaseHeading') {
          const match = lineText.match(/^(#{1,6})\s/);
          if (match && match[1].length > 1) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: lineText.slice(1) } });
          } else if (match && match[1].length === 1) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: lineText.replace(/^#\s*/, '') } });
          }
          view.focus();
          return;
        }

        // 特殊处理：在上方/下方插入空行
        if (fmt === 'insertAbove') {
          view.dispatch({ changes: { from: line.from, insert: '\n' } });
          view.dispatch({ selection: { anchor: line.from } });
          view.focus();
          return;
        }
        if (fmt === 'insertBelow') {
          view.dispatch({ changes: { from: line.to, insert: '\n' } });
          view.dispatch({ selection: { anchor: line.to + 1 } });
          view.focus();
          return;
        }

        const prefixMap: Record<string, string> = {
          quote: '> ',
          codeBlock: '```\n',
          orderedList: '1. ',
          unorderedList: '- ',
          taskList: '- [ ] ',
          hr: '\n---\n',
          mathBlock: '$$\n',
          toc: '[TOC]\n',
          yaml: '---\n',
          linkReference: '[text][ref]\n\n[ref]: url',
          footnote: '[^1]\n\n[^1]: ',
          comment: '<!-- ',
          paragraph: '',
          increaseHeading: '#',
          decreaseHeading: '',
          insertAbove: '\n',
          insertBelow: '\n',
        };

        const suffixMap: Record<string, string> = {
          codeBlock: '\n```',
          mathBlock: '\n$$',
          yaml: '\n---',
          comment: ' -->',
        };

        const prefix = prefixMap[fmt] || '';
        const suffix = suffixMap[fmt] || '';
        view.dispatch({
          changes: { from: line.from, insert: prefix },
        });
        if (suffix) {
          const newLine = view.state.doc.lineAt(cursor + prefix.length);
          view.dispatch({
            changes: { from: newLine.to, insert: suffix },
          });
        }
        view.focus();
      };

      window.addEventListener('prism-format', onFormat);
      window.addEventListener('prism-heading', onHeading);
      window.addEventListener('prism-block-format', onBlock);

      const onEditorCommand = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const { command } = (e as CustomEvent).detail;

        switch (command) {
          case 'undo':
            import('@codemirror/commands').then(m => m.undo(view));
            break;
          case 'redo':
            import('@codemirror/commands').then(m => m.redo(view));
            break;
          case 'cut':
            document.execCommand('cut');
            break;
          case 'copy':
          case 'copyMd':
          case 'copyPlain': {
            const sel = view.state.selection.main;
            const text = view.state.doc.sliceString(sel.from, sel.to);
            if (text) navigator.clipboard.writeText(text);
            break;
          }
          case 'copyHtml': {
            const sel2 = view.state.selection.main;
            const text2 = view.state.doc.sliceString(sel2.from, sel2.to);
            if (text2) navigator.clipboard.writeText(text2);
            break;
          }
          case 'paste':
          case 'pastePlain':
            navigator.clipboard.readText().then(text => {
              view.dispatch({
                changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: text },
              });
            });
            break;
          case 'clearFormat': {
            const sel3 = view.state.selection.main;
            const raw = view.state.doc.sliceString(sel3.from, sel3.to);
            const cleaned = raw.replace(/[*_~`<>[\]()#]/g, '');
            view.dispatch({ changes: { from: sel3.from, to: sel3.to, insert: cleaned } });
            break;
          }
          case 'comment': {
            const sel4 = view.state.selection.main;
            const raw2 = view.state.doc.sliceString(sel4.from, sel4.to);
            view.dispatch({ changes: { from: sel4.from, to: sel4.to, insert: `<!-- ${raw2} -->` } });
            break;
          }
        }
      };

      window.addEventListener('prism-editor-command', onEditorCommand);
      return () => {
        window.removeEventListener('prism-format', onFormat);
        window.removeEventListener('prism-heading', onHeading);
        window.removeEventListener('prism-block-format', onBlock);
        window.removeEventListener('prism-editor-command', onEditorCommand);
      };
    }, [handleFormat]);

    useEffect(() => {
      if (!editorRef.current) return;

      const startState = EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          markdown(),
          theme === 'dark' ? oneDark : [],
          theme === 'dark'
            ? EditorView.theme(
                {
                  '&': { backgroundColor: '#191919' },
                  '.cm-content': { color: '#E2E8F0' },
                  '.cm-gutters': {
                    backgroundColor: '#191919',
                    borderRight: '1px solid var(--border-color)',
                  },
                  '.cm-activeLineGutter': {
                    backgroundColor: 'var(--bg-hover)',
                  },
                  '.cm-activeLine': {
                    backgroundColor: 'var(--bg-hover)',
                  },
                },
                { dark: true },
              )
            : [],
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }

            if (update.docChanged || update.selectionSet) {
              onCursorChangeRef.current?.(getCursorPosition(update.view));

              // 检测选区变化，显示/隐藏浮动工具栏
              const selection = update.state.selection.main;
              if (selection.from !== selection.to) {
                const coords = update.view.coordsAtPos(selection.from);
                if (coords) {
                  setToolbarState({
                    visible: true,
                    x: coords.left,
                    y: coords.top - 40,
                  });
                }
              } else {
                setToolbarState({ visible: false, x: 0, y: 0 });
              }
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '16px',
              fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
            },
            '.cm-scroller': {
              overflow: 'auto',
            },
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;
      onCursorChangeRef.current?.(getCursorPosition(view));

      const handleScroll = () => {
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const ratio = maxScroll > 0 ? scroller.scrollTop / maxScroll : 0;
        onScrollRatioChangeRef.current?.(ratio);
      };

      view.scrollDOM.addEventListener('scroll', handleScroll);

      return () => {
        view.scrollDOM.removeEventListener('scroll', handleScroll);
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const currentContent = view.state.doc.toString();
      if (currentContent !== content) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }, [content]);

    return (
      <>
        <div
          ref={editorRef}
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        />
        <FloatingToolbar
          visible={toolbarState.visible}
          x={toolbarState.x}
          y={toolbarState.y}
          onFormat={handleFormat}
        />
      </>
    );
  },
);
