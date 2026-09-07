import fs from 'fs/promises';
import path from 'path';
import glob from 'fast-glob';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import type { Node } from '@babel/types';

// Handle default/named export interop for @babel/traverse
type TraverseFn = (
  parent: Node,
  opts: Record<string, unknown>,
  scope?: unknown,
  state?: unknown,
  parentPath?: unknown,
) => void;
const traverse: TraverseFn =
  (traverseModule as unknown as { default?: TraverseFn }).default ||
  (traverseModule as unknown as TraverseFn);

interface TranslationRecord {
  call: string;
  key: string;
  places: string[];
}

function stripIllegalReturn(code: string): string {
  return code.replace(/^\s*return\s+[^;]+;\s*$/gm, (match, offset, input) => {
    const after = input.slice(offset + match.length).trim();
    return after === '' ? '' : match;
  });
}

const files = await glob(
  [
    'src/**/*.ts',
    '../luci-app-p99/htdocs/luci-static/resources/view/p99/**/*.js',
  ],
  {
    ignore: [
      '**/*.test.ts',
      '**/main.js',
      '../luci-app-p99/htdocs/luci-static/resources/view/p99/main.js',
    ],
    absolute: true,
  },
);

const results: Record<string, TranslationRecord> = {};

for (const file of files) {
  const contentRaw = await fs.readFile(file, 'utf8');
  const content = stripIllegalReturn(contentRaw);
  const relativePath = path.relative(process.cwd(), file).replaceAll('\\', '/');

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: file.endsWith('.ts') ? ['typescript'] : [],
    });
  } catch (_e) {
    console.warn(`⚠️ Parse error in ${relativePath}, skipping`);
    continue;
  }

  traverse(ast, {
    CallExpression(astPath: {
      node: {
        callee: t.Expression | t.V8IntrinsicIdentifier;
        arguments: (t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder)[];
        loc?: { start: { line: number } } | null;
      };
    }) {
      if (t.isIdentifier(astPath.node.callee, { name: '_' })) {
        const arg = astPath.node.arguments[0];
        if (t.isStringLiteral(arg)) {
          const key = arg.value.trim();
          if (!key) return; // skip empty keys
          const location = `${relativePath}:${astPath.node.loc?.start.line ?? '?'}`;

          if (!results[key]) {
            results[key] = { call: key, key, places: [] };
          }

          results[key].places.push(location);
        }
      }
    },
  });
}

const outFile = 'locales/calls.json';
const sorted = Object.values(results).sort((a, b) =>
  a.key.localeCompare(b.key),
);

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(sorted, null, 2), 'utf8');
console.log(`✅ Extracted ${sorted.length} translations to ${outFile}`);
