import React from 'react';
import Link from 'next/link';

/**
 * Small, safe Markdown renderer for admin-edited website pages and the console guide.
 * Builds React elements directly (no HTML injection). Supports:
 * # / ## / ### headings, paragraphs, "- " and "1. " lists (with indented continuation lines),
 * pipe tables, **bold**, *italic*, `code` and [links](url).
 */
export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;
  const isBullet = (l: string) => /^\s*[-*]\s+/.test(l);
  const isNumbered = (l: string) => /^\s*\d+[.)]\s+/.test(l);
  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isHeading = (l: string) => /^#{1,3}\s/.test(l);

  /** Collects list items; indented lines that follow an item continue it. */
  const collect = (test: (l: string) => boolean, strip: RegExp) => {
    const items: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (test(l)) items.push(l.replace(strip, ''));
      else if (items.length && /^\s+\S/.test(l) && !isBullet(l) && !isNumbered(l)) items[items.length - 1] += ' ' + l.trim();
      else break;
      i++;
    }
    return items;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const content = inline(h[2]);
      if (h[1].length === 1) blocks.push(<h2 key={key++} className="!text-2xl !mt-0">{content}</h2>);
      else if (h[1].length === 2) blocks.push(<h2 key={key++}>{content}</h2>);
      else blocks.push(<h3 key={key++} className="font-bold text-ink">{content}</h3>);
      i++;
      continue;
    }
    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      if (!head) continue;
      blocks.push(
        <div key={key++} className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left">
              <tr>{head.map((c, n) => <th key={n} className="px-3 py-2 font-semibold text-ink whitespace-nowrap">{inline(c)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {body.map((r, rn) => (
                <tr key={rn}>{r.map((c, n) => <td key={n} className={`px-3 py-2 ${n ? 'text-center' : ''}`}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (isBullet(line)) {
      const items = collect(isBullet, /^\s*[-*]\s+/);
      blocks.push(<ul key={key++}>{items.map((t, n) => <li key={n}>{inline(t)}</li>)}</ul>);
      continue;
    }
    if (isNumbered(line)) {
      const items = collect(isNumbered, /^\s*\d+[.)]\s+/);
      blocks.push(<ol key={key++} className="list-decimal pl-6 space-y-1.5">{items.map((t, n) => <li key={n}>{inline(t)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isHeading(lines[i]) && !isBullet(lines[i]) && !isNumbered(lines[i]) && !isTableRow(lines[i])) {
      para.push(lines[i++].trim());
    }
    blocks.push(<p key={key++}>{inline(para.join(' '))}</p>);
  }
  return <>{blocks}</>;
}

/** Typography for rendered Markdown (same look as the policy pages). */
export const PROSE =
  'space-y-5 text-slate-300 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-indigo-400 [&_a]:font-semibold [&_strong]:text-ink';

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<code key={k++} className="font-code text-[0.9em] rounded bg-cream-100 px-1 py-0.5">{m[1]}</code>);
    } else if (m[2] !== undefined) {
      const href = m[3];
      if (!SAFE_URL.test(href)) out.push(m[2]);
      else if (href.startsWith('/')) out.push(<Link key={k++} href={href}>{m[2]}</Link>);
      else out.push(<a key={k++} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{m[2]}</a>);
    } else if (m[4] !== undefined) {
      out.push(<strong key={k++}>{m[4]}</strong>);
    } else {
      out.push(<em key={k++}>{m[5]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
