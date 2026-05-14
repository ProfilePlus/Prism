import { EditorView } from '@codemirror/view';

export function scrollPrimarySelectionToCenter(view: EditorView) {
  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: 'center' }),
  });
}
