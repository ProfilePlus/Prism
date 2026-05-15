import { describe, expect, it } from 'vitest';
import {
  getUnsupportedFileActionMessage,
  isSupportedFileActionCommand,
  parseFileAction,
} from './fileActionCommands';

describe('file action command contract', () => {
  it('parses string and object actions without losing paths', () => {
    expect(parseFileAction('openFile:/notes/a.md')).toEqual({
      command: 'openFile',
      path: '/notes/a.md',
    });
    expect(parseFileAction('openFile:C:\\notes\\a.md')).toEqual({
      command: 'openFile',
      path: 'C:\\notes\\a.md',
    });
    expect(parseFileAction({ action: 'commitRename', path: '/notes/a.md', name: 'b.md' })).toEqual({
      command: 'commitRename',
      path: '/notes/a.md',
      name: 'b.md',
    });
  });

  it('recognizes every supported file operation command shape', () => {
    expect(isSupportedFileActionCommand('newFile')).toBe(true);
    expect(isSupportedFileActionCommand('newFolder:/notes')).toBe(true);
    expect(isSupportedFileActionCommand({ action: 'copyPath', path: '/notes/a.md' })).toBe(true);
    expect(isSupportedFileActionCommand({ action: 'commitRename', path: '/notes/a.md', name: 'b.md' })).toBe(true);
    expect(isSupportedFileActionCommand('archive:/notes/a.md')).toBe(false);
  });

  it('reports unknown actions as unknown rather than productized but unfinished', () => {
    expect(getUnsupportedFileActionMessage('archive')).toBe('未知文件操作: archive');
    expect(getUnsupportedFileActionMessage('archive')).not.toContain('尚未实现');
  });
});
