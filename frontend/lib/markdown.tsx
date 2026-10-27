import React from 'react';

// Minimal Markdown renderer for the grant memo: headings, paragraphs, ordered/unordered lists,
// horizontal rules, hard line breaks, **bold**, *italic* and `code`. Builds React nodes, so
// agent-written text is never injected as HTML.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key} className="font-semibold text-ink">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Joins lines, turning a trailing double space (Markdown hard break) into <br />. */
function renderLines(lines: string[], keyPrefix: string): React.ReactNode[] {
  return lines.flatMap((line, idx) => {
    const hardBreak = / {2,}$/.test(line);
    const content = renderInline(line.trimEnd(), `${keyPrefix}-${idx}`);
    if (idx === lines.length - 1) return content;
    return [...content, hardBreak ? <br key={`${keyPrefix}-br-${idx}`} /> : ' '];
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-6 border-line" />);
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      if (level === 1) {
        blocks.push(<h1 key={key++} className="text-xl font-semibold tracking-tight text-ink">{content}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={key++} className="mt-6 text-lg font-semibold text-ink">{content}</h2>);
      } else {
        blocks.push(<h3 key={key++} className="mt-6 text-[15px] font-semibold text-ink">{content}</h3>);
      }
      i++;
      continue;
    }

    const ordered = /^\d+\.\s+/.test(trimmed);
    const unordered = /^[-*]\s+/.test(trimmed);
    if (ordered || unordered) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (ordered ? /^\d+\.\s+/.test(t) : /^[-*]\s+/.test(t)) {
          items.push(t.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
          i++;
        } else break;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag
          key={key++}
          className={`my-3 space-y-1.5 pl-5 marker:text-ink-3 ${ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {items.map((item, idx) => (
            <li key={idx} className="pl-1">{renderInline(item, `li${key}-${idx}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || /^(#{1,6}\s|-{3,}$|\*{3,}$|\d+\.\s|[-*]\s)/.test(t)) break;
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++} className="my-3">{renderLines(para, `p${key}`)}</p>);
  }

  return <>{blocks}</>;
}
