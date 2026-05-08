import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EditorView, ViewUpdate, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, Decoration, DecorationSet } from '@codemirror/view';
import { EditorState, Prec, StateEffect, StateField } from '@codemirror/state';

// 定义闪烁效果的 Effect
const addLineFlash = StateEffect.define<number>();
const removeLineFlash = StateEffect.define<number>();

// 管理闪烁装饰的 Field
const lineFlashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(flashes, tr) {
    flashes = flashes.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addLineFlash)) {
        const deco = Decoration.line({
          attributes: { class: 'cm-line-flash' }
        });
        flashes = flashes.update({
          add: [deco.range(tr.state.doc.lineAt(e.value).from)]
        });
      } else if (e.is(removeLineFlash)) {
        return Decoration.none;
      }
    }
    return flashes;
  },
  provide: f => EditorView.decorations.from(f)
});

import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, selectMatches } from '@codemirror/search';
import { useSettingsStore } from '../../settings/store';
import { useWorkspaceStore } from '../../workspace/store';
import { FloatingToolbar } from './FloatingToolbar';
import { SearchParams } from './SearchPanel';

export interface EditorPaneHandle {
  jumpToLine: (line: number) => void;
  setScrollRatio: (ratio: number) => void;
  execSearch?: (action: 'next' | 'prev' | 'all' | 'replace' | 'replaceAll', params: SearchParams) => void;
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
    const typewriterMode = useWorkspaceStore((s) => s.typewriterMode);
    
    // 关键标记：用于拦截因同步内容触发的 onChange
    const isUpdatingFromPropsRef = useRef(false);

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

    const isProgrammaticScrollRef = useRef(false);

    useImperativeHandle(ref, () => ({
      jumpToLine: (lineNumber: number) => {
        const view = viewRef.current;
        if (!view) return;

        const targetLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
        const line = view.state.doc.line(targetLine);

        view.dispatch({
          selection: { anchor: line.from },
          effects: [
            EditorView.scrollIntoView(line.from, { y: 'center' }),
            addLineFlash.of(line.from)
          ],
        });

        // 2秒后清除闪烁样式
        setTimeout(() => {
          if (viewRef.current) {
            viewRef.current.dispatch({
              effects: removeLineFlash.of(line.from)
            });
          }
        }, 2000);

        view.focus();
      },
      setScrollRatio: (ratio: number) => {
        const view = viewRef.current;
        if (!view) return;
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const targetScroll = Math.max(0, ratio) * maxScroll;
        if (Math.abs(scroller.scrollTop - targetScroll) > 1) {
          isProgrammaticScrollRef.current = true;
          scroller.scrollTop = targetScroll;
        }
      },
      execSearch: (action, params) => {
        const view = viewRef.current;
        if (!view) return;

        view.dispatch({
          effects: setSearchQuery.of(new SearchQuery({
            search: params.query,
            caseSensitive: params.matchCase,
            regexp: params.regexp,
            wholeWord: params.wholeWord,
            replace: params.replaceWith
          }))
        });

        switch (action) {
          case 'next': findNext(view); break;
          case 'prev': findPrevious(view); break;
          case 'all': selectMatches(view); break;
          case 'replace': replaceNext(view); break;
          case 'replaceAll': replaceAll(view); break;
        }
        view.focus();
      }
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
          | 'strikethrough'
          | 'highlight',
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
        } else if (format === 'highlight') {
          wrappedText = `<mark>${selectedText}</mark>`;
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

        if (fmt === 'paragraph') {
          const stripped = lineText.replace(/^#{1,6}\s*/, '');
          view.dispatch({ changes: { from: line.from, to: line.to, insert: stripped } });
          view.focus();
          return;
        }

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

      window.addEventListener('prism-format', onFormat);
      window.addEventListener('prism-heading', onHeading);
      window.addEventListener('prism-block-format', onBlock);
      window.addEventListener('prism-editor-command', onEditorCommand);

      return () => {
        window.removeEventListener('prism-format', onFormat);
        window.removeEventListener('prism-heading', onHeading);
        window.removeEventListener('prism-block-format', onBlock);
        window.removeEventListener('prism-editor-command', onEditorCommand);
      };
    }, [handleFormat]);

    // 处理来自 Props 的内容同步（非重挂载情况）
    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        console.log('[EditorPane] content sync skipped: no view yet, incoming len:', content.length);
        return;
      }

      const currentContent = view.state.doc.toString();
      console.log('[EditorPane] content sync check currentLen:', currentContent.length, 'incomingLen:', content.length, 'same:', currentContent === content);
      if (currentContent !== content) {
        console.log('[EditorPane] dispatching content sync');
        isUpdatingFromPropsRef.current = true;
        view.dispatch({
          changes: { from: 0, to: currentContent.length, insert: content }
        });
        console.log('[EditorPane] after dispatch, editorLen:', view.state.doc.length, 'first200:', view.state.doc.sliceString(0, 200), '|| incomingFirst200:', content.slice(0, 200));
      }
    }, [content]);

    useEffect(() => {
      if (!editorRef.current) return;

      const startState = EditorState.create({
        doc: content,
        extensions: [
          Prec.highest(keymap.of([
            {
              key: 'Mod-f',
              run: () => {
                window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'open' } }));
                return true;
              }
            }
          ])),
          lineFlashField,
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          closeBrackets(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          foldGutter(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...foldKeymap,
            indentWithTab,
          ]),
          EditorView.lineWrapping,
          markdown(),
          theme === 'dark' ? oneDark : [],
          EditorView.theme({
            '&': { flex: 1, minHeight: 0, fontSize: '16px', fontFamily: 'inherit', backgroundColor: 'transparent' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit', lineHeight: '1.7' },
            '.cm-content': { padding: '32px 48px', color: 'var(--text-primary)', maxWidth: '860px', margin: '0 auto' },
            '.cm-line-flash': { animation: 'cm-flash 2s cubic-bezier(0.16, 1, 0.3, 1)' },
            '.cm-gutters': { display: 'none' },
            '.cm-activeLineGutter': { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' },
            '.cm-activeLine': { backgroundColor: 'var(--bg-hover)', borderLeft: '2px solid var(--accent)', marginLeft: '-2px' },
            '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
            '&.cm-focused': { outline: 'none' },
            '.cm-selectionBackground': { backgroundColor: 'var(--accent-tint-strong) !important' },
            '&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-tint-strong) !important' }
          }),
          theme === 'dark'
            ? EditorView.theme({ '.cm-content': { color: '#E2E8F0' }, '.cm-gutters': { borderRight: '1px solid var(--stroke-surface)' } }, { dark: true })
            : [],
          EditorState.phrases.of({
            "Find": "查找内容", "Replace": "替换为", "next": "下一个", "previous": "上一个", "all": "全部",
            "match case": "大小写", "regexp": "正则", "by word": "全词", "replace": "替换", "replace all": "全部替换"
          }),
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              if (isUpdatingFromPropsRef.current) {
                console.log('[EditorPane] updateListener: ignoring prop-driven docChanged');
                isUpdatingFromPropsRef.current = false;
              } else {
                console.log('[EditorPane] updateListener: forwarding onChange, len:', update.state.doc.length);
                onChangeRef.current(update.state.doc.toString());
              }
            }
            if (update.docChanged || update.selectionSet) {
              onCursorChangeRef.current?.(getCursorPosition(update.view));
              if (typewriterMode && update.selectionSet) {
                update.view.dispatch({ effects: EditorView.scrollIntoView(update.state.selection.main.head, { y: 'center' }) });
              }
              const selection = update.state.selection.main;
              if (selection.from === selection.to) {
                setToolbarState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
              }
            }
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      const handleMouseUp = () => {
        const selection = view.state.selection.main;
        if (selection.from !== selection.to) {
          const coordsFrom = view.coordsAtPos(selection.from);
          const coordsTo = view.coordsAtPos(selection.to);
          if (coordsFrom && coordsTo) {
            setToolbarState({ visible: true, x: (coordsFrom.left + coordsTo.left) / 2, y: Math.min(coordsFrom.top, coordsTo.top) });
          }
        }
      };

      view.dom.addEventListener('mouseup', handleMouseUp);
      const handleScroll = () => {
        if (isProgrammaticScrollRef.current) { isProgrammaticScrollRef.current = false; return; }
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        onScrollRatioChangeRef.current?.(maxScroll > 0 ? scroller.scrollTop / maxScroll : 0);
      };
      view.scrollDOM.addEventListener('scroll', handleScroll);

      return () => {
        view.dom.removeEventListener('mouseup', handleMouseUp);
        view.scrollDOM.removeEventListener('scroll', handleScroll);
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme, typewriterMode]);

    return (
      <>
        <div ref={editorRef} style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} />
        <FloatingToolbar visible={toolbarState.visible} x={toolbarState.x} y={toolbarState.y} onFormat={handleFormat} />
      </>
    );
  },
);
