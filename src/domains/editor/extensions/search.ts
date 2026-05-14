import type { EditorView } from '@codemirror/view';
import { openSearchPanel, searchPanelOpen } from '@codemirror/search';

export function createHiddenSearchPanel() {
  const dom = document.createElement('div');
  dom.className = 'cm-search cm-compat-hidden-search-panel';
  dom.setAttribute('aria-hidden', 'true');
  return { dom, top: true };
}

export function ensureSearchHighlighterEnabled(view: EditorView) {
  if (!searchPanelOpen(view.state)) {
    openSearchPanel(view);
  }
}
