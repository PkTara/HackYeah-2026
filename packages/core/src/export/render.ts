/**
 * Turns a document into plain text, Markdown or a printable HTML page.
 * The words are the same in all three; only the layout differs.
 */
import type { Block, ExportDocument } from './types';

/**
 * Long dashes never reach a file: between numbers they read "to", anywhere
 * else a comma. A spaced hyphen used as a dash becomes a comma too.
 */
export function noDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/ - /g, ', ');
}

const RULE = '______________________________________________';

function legendHeading(doc: ExportDocument): string | null {
  return doc.legend.length ? 'Labels' : null;
}

function textTable(head: readonly string[], rows: readonly (readonly string[])[]) {
  const all = [head, ...rows];
  const widths = head.map((_, i) =>
    Math.max(...all.map(row => (row[i] ?? '').length)),
  );
  return all
    .map(row =>
      row
        .map((cell, i) => (cell ?? '').padEnd(widths[i]))
        .join(' | ')
        .trimEnd(),
    )
    .join('\n');
}

function textBlock(block: Block): string {
  switch (block.kind) {
    case 'text':
      return block.text;
    case 'list':
      return block.items
        .map((item, i) => `${block.ordered ? `${i + 1}.` : '-'} ${item}`)
        .join('\n');
    case 'table':
      return textTable(block.head, block.rows);
    case 'blank':
      return `${block.label}\n${RULE}`;
  }
}

/** For a message or a .txt file. */
export function renderText(doc: ExportDocument): string {
  const parts: string[] = [[doc.title, ...doc.intro].join('\n')];
  for (const section of doc.sections) {
    parts.push(
      [section.heading, ...section.blocks.map(textBlock)]
        .filter(Boolean)
        .join('\n'),
    );
  }
  if (doc.closing.length) {
    parts.push(doc.closing.join('\n'));
  }
  const legend = legendHeading(doc);
  if (legend) {
    parts.push([legend, ...doc.legend].join('\n'));
  }
  return noDashes(parts.join('\n\n')) + '\n';
}

const mdCell = (cell: string) => cell.replace(/\|/g, '/') || ' ';

function markdownBlock(block: Block): string {
  switch (block.kind) {
    case 'text':
      // Two spaces keep line breaks inside a paragraph.
      return block.text.split('\n').join('  \n');
    case 'list':
      return textBlock(block);
    case 'table':
      return [
        `| ${block.head.map(mdCell).join(' | ')} |`,
        `| ${block.head.map(() => '---').join(' | ')} |`,
        ...block.rows.map(row => `| ${row.map(mdCell).join(' | ')} |`),
      ].join('\n');
    case 'blank':
      return `${block.label}\n\n${RULE}`;
  }
}

/** For notes apps and code hosts. */
export function renderMarkdown(doc: ExportDocument): string {
  const parts: string[] = [`# ${doc.title}`, doc.intro.join('  \n')];
  for (const section of doc.sections) {
    if (section.heading) {
      parts.push(`## ${section.heading}`);
    }
    parts.push(...section.blocks.map(markdownBlock));
  }
  if (doc.closing.length) {
    parts.push(doc.closing.join('  \n'));
  }
  const legend = legendHeading(doc);
  if (legend) {
    parts.push(`## ${legend}`, doc.legend.join('  \n'));
  }
  return noDashes(parts.join('\n\n')) + '\n';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escaped text with research links made clickable. */
function inline(text: string): string {
  return escapeHtml(noDashes(text))
    .split('\n')
    .join('<br>')
    .replace(
      /(https:\/\/[^\s<]+)/g,
      '<a href="$1" rel="noreferrer noopener">$1</a>',
    );
}

function htmlBlock(block: Block): string {
  switch (block.kind) {
    case 'text':
      return `<p>${inline(block.text)}</p>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      return `<${tag}>${block.items
        .map(item => `<li>${inline(item)}</li>`)
        .join('')}</${tag}>`;
    }
    case 'table':
      return `<table><thead><tr>${block.head
        .map(cell => `<th>${inline(cell)}</th>`)
        .join('')}</tr></thead><tbody>${block.rows
        .map(
          row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody></table>`;
    case 'blank':
      return `<p class="blank">${inline(block.label)}</p><div class="rule"></div><div class="rule"></div>`;
  }
}

const STYLE = `
body{margin:0;background:#fff;color:#111;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:46rem;margin:0 auto;padding:2rem 1.25rem}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 .5rem}
h2{font-size:1.15rem;margin:1.6rem 0 .4rem;padding-bottom:.2rem;border-bottom:2px solid #222}
p{margin:.3rem 0}
.intro p{color:#333}
.intro p.not{font-weight:600}
ul,ol{margin:.3rem 0;padding-left:1.4rem}
li{margin:.2rem 0}
table{border-collapse:collapse;margin:.5rem 0;font-size:.95rem}
th,td{border:1px solid #888;padding:.25rem .5rem;text-align:left;vertical-align:top}
th{background:#f0f0f0}
.rule{border-bottom:1px solid #444;height:2rem}
.blank{margin-top:1rem}
.legend{margin-top:2rem;font-size:.9rem;color:#333}
a{color:#0b4f8a;word-break:break-all}
.print{font:inherit;padding:.5rem 1rem;margin-bottom:1rem;border:2px solid #222;background:#fff;cursor:pointer}
@media print{.print{display:none}main{padding:0}@page{size:A4;margin:18mm}a{color:#111}}
`.trim();

/** A standalone page with its own styles, ready to print or save as PDF. */
export function renderHtml(doc: ExportDocument): string {
  const notLine = doc.intro[doc.intro.length - 1];
  const intro = doc.intro
    .map(
      line =>
        `<p${line === notLine ? ' class="not"' : ''}>${inline(line)}</p>`,
    )
    .join('');
  const sections = doc.sections
    .map(
      section =>
        `<section>${
          section.heading ? `<h2>${inline(section.heading)}</h2>` : ''
        }${section.blocks.map(htmlBlock).join('')}</section>`,
    )
    .join('');
  const closing = doc.closing.map(line => `<p>${inline(line)}</p>`).join('');
  const legend = doc.legend.length
    ? `<section class="legend"><h2>Labels</h2>${doc.legend
        .map(line => `<p>${inline(line)}</p>`)
        .join('')}</section>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${inline(doc.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<button class="print" type="button" onclick="print()">Print or save as PDF</button>
<h1>${inline(doc.title)}</h1>
<div class="intro">${intro}</div>
${sections}${closing}${legend}
</main>
</body>
</html>
`;
}
