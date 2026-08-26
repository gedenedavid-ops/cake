/**
 * Renderer Markdown léger — sans dépendance externe.
 * Gère : titres (# ## ###), gras (**), italique (*),
 *        code inline (`), blocs de code (```),
 *        listes (- et 1.), lignes horizontales (---), sauts de ligne.
 */

import React from 'react';

export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;
  const k = () => keyCounter++;

  function renderInline(line: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[2] !== undefined)
        parts.push(<strong key={k()} className="font-semibold">{m[2]}</strong>);
      else if (m[3] !== undefined)
        parts.push(<em key={k()}>{m[3]}</em>);
      else if (m[4] !== undefined)
        parts.push(
          <code key={k()} className="px-1.5 py-0.5 bg-black/10 rounded text-[0.82em] font-mono">
            {m[4]}
          </code>
        );
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Bloc de code ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={k()} className="my-2 p-3 bg-black/10 rounded-xl text-[0.8em] font-mono overflow-x-auto whitespace-pre">
          {lang && <span className="block text-[0.75em] opacity-50 mb-1">{lang}</span>}
          {codeLines.join('\n')}
        </pre>
      );
      i++;
      continue;
    }

    // Titres # ## ###
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1 ? 'text-base font-bold mt-3 mb-1'
        : level === 2 ? 'text-sm font-bold mt-2 mb-0.5'
        : 'text-sm font-semibold mt-1.5';
      nodes.push(<p key={k()} className={cls}>{renderInline(heading[2])}</p>);
      i++;
      continue;
    }

    // Ligne horizontale ---
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={k()} className="my-2 border-current opacity-20" />);
      i++;
      continue;
    }

    // Listes non ordonnées (- item ou * item)
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={k()} className="my-1 ml-3 space-y-0.5 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 items-start">
              <span className="mt-[0.35em] w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Listes ordonnées (1. item)
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={k()} className="my-1 ml-3 space-y-0.5 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 items-start">
              <span className="flex-shrink-0 font-semibold opacity-60 text-[0.85em] mt-px">{idx + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Ligne vide → espace
    if (line.trim() === '') {
      nodes.push(<span key={k()} className="block h-1" />);
      i++;
      continue;
    }

    // Paragraphe normal
    nodes.push(<p key={k()} className="leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return nodes;
}
