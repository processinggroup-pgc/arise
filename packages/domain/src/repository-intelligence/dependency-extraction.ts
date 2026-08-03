import type { RepositoryDependencyKind } from "./repository-dependency.js";

export interface ExtractedDependency {
  target: string;
  kind: RepositoryDependencyKind;
  line: number;
}

const IMPORT_PATTERN =
  /^\s*(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+from\s+)?['"]([^'"]+)['"]/u;

function normalizeRepositoryPath(path: string): string {
  const segments = path.replace(/\\/gu, "/").split("/");
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment.length === 0 || segment === ".") {
      continue;
    }

    if (segment === "..") {
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join("/");
}

function joinRepositoryPath(basePath: string, relativePath: string): string {
  const baseDirectory = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/")) : "";
  const combined = baseDirectory.length > 0 ? `${baseDirectory}/${relativePath}` : relativePath;
  return normalizeRepositoryPath(combined);
}

function resolveRelativeImportTarget(
  sourcePath: string,
  importPath: string,
  knownPaths: ReadonlySet<string>,
): string {
  const normalizedImport = importPath.trim();
  const joined = joinRepositoryPath(sourcePath, normalizedImport);
  const candidates = [
    joined,
    `${joined}.ts`,
    `${joined}.tsx`,
    `${joined}.js`,
    `${joined}.jsx`,
    `${joined}/index.ts`,
    `${joined}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (knownPaths.has(candidate)) {
      return candidate;
    }
  }

  return joined;
}

export function extractDependenciesFromSource(
  content: string,
  sourcePath: string,
  knownPaths: ReadonlySet<string>,
): ExtractedDependency[] {
  const lines = content.split(/\r?\n/u);
  const dependencies: ExtractedDependency[] = [];
  const seen = new Set<string>();

  for (const [index, line] of lines.entries()) {
    const match = IMPORT_PATTERN.exec(line);
    if (match === null || match[1] === undefined) {
      continue;
    }

    const rawTarget = match[1].trim();
    if (rawTarget.length === 0) {
      continue;
    }

    const isRelative = rawTarget.startsWith(".");
    const target = isRelative
      ? resolveRelativeImportTarget(sourcePath, rawTarget, knownPaths)
      : rawTarget;
    const kind = isRelative ? "relative_import" : "package_import";
    const dedupeKey = `${kind}:${target}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    dependencies.push({
      target,
      kind,
      line: index + 1,
    });
  }

  return dependencies;
}
