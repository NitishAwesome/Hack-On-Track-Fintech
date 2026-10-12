'use client';

// ============================================================
// FINOVA — Safe Markdown Renderer Component
// components/insights/SafeMarkdownRenderer.tsx
//
// Native React AST-style parser:
// - Renders headings, bold, lists, code, tables, and links safely
// - Zero raw HTML injection (eliminates XSS vectors)
// - Sanitizes URLs (only https://, http://, or relative internal routes)
// ============================================================

import React from 'react';
import Link from 'next/link';

interface SafeMarkdownRendererProps {
  content: string;
  className?: string;
}

function sanitizeUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    // Block javascript: or data: URIs
    if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
      return null;
    }
    return trimmed;
  }
  return null;
}

function renderInlineText(text: string): React.ReactNode[] {
  // Regex matches:
  // 1. Links: [label](url)
  // 2. Bold: **text**
  // 3. Inline code: `code`
  // 4. Italic: *text* or _text_
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // Link
      const label = match[2];
      const url = sanitizeUrl(match[3]);
      if (url) {
        if (url.startsWith('/')) {
          parts.push(
            <Link
              key={match.index}
              href={url}
              className="text-brand font-medium underline underline-offset-2 hover:opacity-80"
            >
              {label}
            </Link>
          );
        } else {
          parts.push(
            <a
              key={match.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-medium underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
            >
              {label}
            </a>
          );
        }
      } else {
        parts.push(label);
      }
    } else if (match[4]) {
      // Bold
      parts.push(<strong key={match.index} className="font-semibold">{match[4]}</strong>);
    } else if (match[5]) {
      // Inline code
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.08)' }}
        >
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      // Italic
      parts.push(<em key={match.index} className="italic">{match[6]}</em>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function SafeMarkdownRenderer({ content, className = '' }: SafeMarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="p-3 my-2 rounded-lg text-xs font-mono overflow-x-auto border"
          style={{
            backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.05)',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-bold tracking-tight mt-3 mb-1.5 flex items-center gap-1.5"
          style={{ color: 'rgb(var(--foreground))' }}
        >
          {renderInlineText(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-bold tracking-tight mt-4 mb-2"
          style={{ color: 'rgb(var(--foreground))' }}
        >
          {renderInlineText(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg font-bold tracking-tight mt-4 mb-2"
          style={{ color: 'rgb(var(--foreground))' }}
        >
          {renderInlineText(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 pl-3 py-1 my-2 italic text-xs"
          style={{
            borderColor: 'rgb(var(--brand))',
            color: 'rgb(var(--muted))',
          }}
        >
          {renderInlineText(trimmed.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Table detection: line contains | and next line has |-
    if (trimmed.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|-')) {
      const headerCols = trimmed.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      i += 2; // skip header and separator
      const tableRows: string[][] = [];

      while (i < lines.length && lines[i].trim().includes('|')) {
        const rowCols = lines[i].split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push(rowCols);
        i++;
      }

      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3 border rounded-lg text-xs" style={{ borderColor: 'rgb(var(--border))' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.04)' }}>
                {headerCols.map((col, cIdx) => (
                  <th key={cIdx} className="p-2 text-left font-semibold border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                    {renderInlineText(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 hover:bg-muted/10" style={{ borderColor: 'rgb(var(--border))' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered List item
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('• ') || lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[•\-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2 list-none pl-1 text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-brand font-bold leading-relaxed">•</span>
              <div className="flex-1 leading-relaxed">{renderInlineText(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed my-1.5" style={{ color: 'rgb(var(--foreground))' }}>
        {renderInlineText(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 text-xs ${className}`}>{elements}</div>;
}
