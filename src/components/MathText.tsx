import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

interface MathTextProps {
  text: string;
}

export default function MathText({ text }: MathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return '';
    return text.replace(/\$(.+?)\$/g, (match, expr) => {
      try {
        return katex.renderToString(expr, { throwOnError: false });
      } catch {
        return match;
      }
    });
  }, [text]);

  return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
}