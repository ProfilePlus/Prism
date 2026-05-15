import { invoke } from '@tauri-apps/api/core';

export async function grantMarkdownFileScope(path: string): Promise<void> {
  await invoke('grant_markdown_file_scope', { path });
}

export async function grantWorkspaceDirectoryScope(path: string): Promise<void> {
  await invoke('grant_workspace_directory_scope', { path });
}
