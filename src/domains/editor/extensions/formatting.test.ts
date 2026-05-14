import { describe, expect, it } from 'vitest';
import { getEditorFormatResult } from './formatting';

function applyFormat(doc: string, selectedText: string, format: Parameters<typeof getEditorFormatResult>[3]) {
  const from = doc.indexOf(selectedText);
  expect(from).toBeGreaterThanOrEqual(0);
  const result = getEditorFormatResult(doc, from, from + selectedText.length, format);
  return `${doc.slice(0, result.from)}${result.insert}${doc.slice(result.to)}`;
}

describe('editor formatting extension', () => {
  it('wraps and unwraps precision inline formats', () => {
    expect(applyFormat('hello Prism', 'Prism', 'bold')).toBe('hello **Prism**');
    expect(applyFormat('hello **Prism**', 'Prism', 'bold')).toBe('hello Prism');
    expect(applyFormat('hello ~~Prism~~', 'Prism', 'strikethrough')).toBe('hello Prism');
  });

  it('does not confuse bold and italic star runs', () => {
    expect(applyFormat('hello **Prism**', 'Prism', 'italic')).toBe('hello ***Prism***');
    expect(applyFormat('hello ***Prism***', 'Prism', 'italic')).toBe('hello **Prism**');
  });
});
