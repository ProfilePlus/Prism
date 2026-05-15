export interface PandocCitationMatch {
  index: number;
  keys: string[];
  raw: string;
}

const PANDOC_CITATION_RE = /\[((?:[^\]\n]*?@[A-Za-z0-9][A-Za-z0-9_:.#$%&+?<>~/-]*[^\]\n]*?))\]/g;
const CITE_KEY_RE = /(^|[\s;,\[\(-])@([A-Za-z0-9][A-Za-z0-9_:.#$%&+?<>~/-]*)/g;

export function findPandocCitations(text: string): PandocCitationMatch[] {
  const matches: PandocCitationMatch[] = [];
  for (const match of text.matchAll(PANDOC_CITATION_RE)) {
    const raw = match[0];
    const keys = [...raw.matchAll(CITE_KEY_RE)].map((keyMatch) => keyMatch[2]);
    if (keys.length === 0) continue;
    matches.push({
      index: match.index ?? 0,
      keys,
      raw,
    });
  }
  return matches;
}
