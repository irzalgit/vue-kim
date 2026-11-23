import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({
  text,
  className,
}: MathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return '';

    // Escape teks biasa agar aman saat dirender sebagai HTML.
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Mendukung $$...$$, $...$, \[...\], dan \(...\).
    const pattern =
      /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index));

      const display = match[1] ?? match[2];
      const inline = match[3] ?? match[4];
      const expression = display ?? inline;

      try {
        result += katex.renderToString(expression, {
          throwOnError: false,
          strict: 'ignore',
          displayMode: display !== undefined,
          output: 'htmlAndMathml',
        });
      } catch {
        result += escapeHtml(match[0]);
      }

      lastIndex = pattern.lastIndex;
    }

    result += escapeHtml(text.slice(lastIndex));
    return result;
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
