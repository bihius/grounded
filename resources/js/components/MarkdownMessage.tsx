import { ReactNode } from 'react';

function renderInlineMarkdown(text: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g).map((part, index) => {
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-cyan-200">{part.slice(1, -1)}</code>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
}

export default function MarkdownMessage({ content }: { content: string }) {
    return (
        <div className="space-y-4">
            {content.split(/\n\s*\n/).map((block, index) => {
                const lines = block.split('\n');
                const isList = lines.every((line) => /^\s*(\d+[.)]|[-*])\s+/.test(line));
                if (isList) {
                    const ordered = /^\s*\d+[.)]/.test(lines[0]);
                    const List = ordered ? 'ol' : 'ul';
                    return (
                        <List key={index} className={ordered ? 'list-decimal space-y-2 pl-6' : 'list-disc space-y-2 pl-6'}>
                            {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*(\d+[.)]|[-*])\s+/, ''))}</li>)}
                        </List>
                    );
                }

                if (/^#{1,6}\s/.test(block)) {
                    return <h3 key={index} className="text-lg font-semibold text-slate-200">{renderInlineMarkdown(block.replace(/^#{1,6}\s+/, ''))}</h3>;
                }

                return <p key={index} className="whitespace-pre-wrap">{renderInlineMarkdown(block)}</p>;
            })}
        </div>
    );
}
