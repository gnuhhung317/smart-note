import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const isMermaid = match && match[1] === 'mermaid';

          if (!inline && isMermaid) {
            return <Mermaid chart={String(children).replace(/\n$/, '')} />;
          }

          return !inline && match ? (
            <div className="relative group">
                <div className="absolute top-0 right-0 px-2 py-1 text-xs text-gray-400 font-mono select-none">{match[1]}</div>
                <pre className={`${className} bg-notion-sidebar p-3 rounded-md overflow-x-auto text-sm my-2`}>
                <code className={className} {...props}>
                    {children}
                </code>
                </pre>
            </div>
          ) : (
            <code className="bg-notion-sidebar text-red-500 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        blockquote({ children }) {
            // Check if it's a specific Notion-style callout based on emoji content (simplified check)
            // In a real app we might parse the text content more strictly.
            return (
                <blockquote className="border-l-4 border-gray-800 pl-4 py-1 my-3 bg-notion-sidebar rounded-r-md text-notion-text">
                    {children}
                </blockquote>
            )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;