/**
 * Text list token parsing and domain/IP comments-aware extraction.
 */

export interface TokenSpan {
  value: string;
  start: number;
  end: number;
  line: number;
}

export function parseCommentAwareListTokens(value: unknown): TokenSpan[] {
  const text = value ? `${value}` : '';
  const tokens: TokenSpan[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  let offset = 0;

  lines.forEach((line, index) => {
    const hashIndex = line.indexOf('#');
    const slashIndex = line.indexOf('//');
    let commentIndex = -1;

    if (hashIndex >= 0 && slashIndex >= 0) {
      commentIndex = Math.min(hashIndex, slashIndex);
    } else if (hashIndex >= 0) {
      commentIndex = hashIndex;
    } else if (slashIndex >= 0) {
      commentIndex = slashIndex;
    }

    const source = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const matcher = /[^,\s]+/g;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(source)) !== null) {
      tokens.push({
        value: match[0],
        start: offset + match.index,
        end: offset + match.index + match[0].length,
        line: index + 1,
      });
    }

    offset += line.length + 1; // +1 for the newline separator
  });

  return tokens;
}

export function uniqueDomainTextValues(values: unknown[]): string[] {
  const seen = new Set<string>();
  return values
    .map((val) => `${val ?? ''}`.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function parseDomainTokenPrefix(token: string): {
  prefix: string;
  value: string;
} {
  const raw = `${token || ''}`.trim();
  const prefixes = ['domain:', 'full:', 'keyword:', 'regex:'];
  for (const prefix of prefixes) {
    if (raw.startsWith(prefix)) {
      return {
        prefix: prefix.slice(0, -1),
        value: raw.slice(prefix.length),
      };
    }
  }
  return {
    prefix: '',
    value: raw,
  };
}
