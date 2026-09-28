import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser = false }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return (
    <div className="markdown-content text-xs leading-relaxed space-y-2 break-words">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-text-primary">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1.5 my-2 text-text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1.5 my-2 text-text-primary">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
          h1: ({ children }) => <h1 className="text-sm font-bold text-text-primary mt-3 mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-bold text-text-primary mt-2.5 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-text-primary mt-2 mb-1">{children}</h3>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] border border-border text-primary">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-2.5 py-0.5 my-1.5 text-text-secondary italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
