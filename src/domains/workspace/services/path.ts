export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

export function joinPath(dir: string, name: string): string {
  const normalizedDir = dir.replace(/[\\/]$/, '');
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${normalizedDir}${sep}${name}`;
}

export function normalizePathForCompare(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function isSamePath(a: string, b: string): boolean {
  return normalizePathForCompare(a) === normalizePathForCompare(b);
}

export function isPathInside(path: string, possibleParent: string): boolean {
  const normalizedPath = normalizePathForCompare(path);
  const normalizedParent = normalizePathForCompare(possibleParent);
  return normalizedPath === normalizedParent || normalizedPath.startsWith(`${normalizedParent}/`);
}

export function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (!isPathInside(path, oldPrefix)) return path;
  const trimmedOldPrefix = oldPrefix.replace(/[\\/]+$/, '');
  const suffix = path.slice(trimmedOldPrefix.length);
  return `${newPrefix}${suffix}`;
}
