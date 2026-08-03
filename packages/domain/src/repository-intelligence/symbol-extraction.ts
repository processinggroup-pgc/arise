import type { RepositorySymbolKind } from "./repository-symbol.js";

export interface ExtractedSymbol {
  name: string;
  kind: RepositorySymbolKind;
  line: number;
}

const SYMBOL_PATTERNS: Array<{
  kind: RepositorySymbolKind;
  pattern: RegExp;
}> = [
  { kind: "function", pattern: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/u },
  { kind: "class", pattern: /^\s*export\s+class\s+([A-Za-z_$][\w$]*)/u },
  { kind: "interface", pattern: /^\s*export\s+interface\s+([A-Za-z_$][\w$]*)/u },
  { kind: "type", pattern: /^\s*export\s+type\s+([A-Za-z_$][\w$]*)/u },
  { kind: "variable", pattern: /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/u },
  { kind: "function", pattern: /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/u },
  { kind: "class", pattern: /^\s*class\s+([A-Za-z_$][\w$]*)/u },
];

export function extractSymbolsFromSource(content: string): ExtractedSymbol[] {
  const lines = content.split(/\r?\n/u);
  const symbols: ExtractedSymbol[] = [];
  const seen = new Set<string>();

  for (const [index, line] of lines.entries()) {
    for (const entry of SYMBOL_PATTERNS) {
      const match = entry.pattern.exec(line);
      if (match === null || match[1] === undefined) {
        continue;
      }

      const key = `${entry.kind}:${match[1]}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      symbols.push({
        name: match[1],
        kind: entry.kind,
        line: index + 1,
      });
    }
  }

  return symbols;
}
