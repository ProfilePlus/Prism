import { describe, expect, it } from 'vitest';
import { basename, dirname, isPathInside, isSamePath, joinPath, replacePathPrefix } from './path';

describe('workspace path services', () => {
  it('handles POSIX and Windows style paths', () => {
    expect(basename('/Users/Alex/doc.md')).toBe('doc.md');
    expect(dirname('/Users/Alex/doc.md')).toBe('/Users/Alex');
    expect(joinPath('/Users/Alex/', 'doc.md')).toBe('/Users/Alex/doc.md');

    expect(basename('C:\\Users\\Alex\\doc.md')).toBe('doc.md');
    expect(dirname('C:\\Users\\Alex\\doc.md')).toBe('C:\\Users\\Alex');
    expect(joinPath('C:\\Users\\Alex\\', 'doc.md')).toBe('C:\\Users\\Alex\\doc.md');
  });

  it('compares and rewrites paths across separators', () => {
    expect(isSamePath('C:\\Users\\Alex\\doc.md', 'c:/users/alex/doc.md')).toBe(true);
    expect(isPathInside('/Users/Alex/Notes/doc.md', '/Users/Alex/Notes')).toBe(true);
    expect(replacePathPrefix('/Users/Alex/Notes/a.md', '/Users/Alex/Notes', '/tmp/Notes')).toBe('/tmp/Notes/a.md');
  });
});
