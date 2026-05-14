import { StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

const editorSelectionDecoration = Decoration.mark({ class: 'cm-editor-selection-mark' });

function buildEditorSelectionDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of view.state.selection.ranges) {
    if (!range.empty) {
      builder.add(range.from, range.to, editorSelectionDecoration);
    }
  }
  return builder.finish();
}

export const editorSelectionPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildEditorSelectionDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildEditorSelectionDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export const addLineFlash = StateEffect.define<number>();
export const removeLineFlash = StateEffect.define<number>();

export const lineFlashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(flashes, tr) {
    flashes = flashes.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addLineFlash)) {
        const deco = Decoration.line({
          attributes: { class: 'cm-line-flash' },
        });
        flashes = flashes.update({
          add: [deco.range(tr.state.doc.lineAt(e.value).from)],
        });
      } else if (e.is(removeLineFlash)) {
        return Decoration.none;
      }
    }
    return flashes;
  },
  provide: (f) => EditorView.decorations.from(f),
});
