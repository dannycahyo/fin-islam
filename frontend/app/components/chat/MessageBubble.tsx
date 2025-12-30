import ReactMarkdown from 'react-markdown';
import { AlertCircle } from 'lucide-react';
import { Message } from './types';
import { StreamingIndicator } from './StreamingIndicator';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const hasError = message.status === 'error';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3 sm:max-w-[75%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          hasError && 'border border-destructive'
        )}
      >
        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          {isUser ? (
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-2 ml-4">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4">{children}</ol>,
                li: ({ children }) => <li className="my-1">{children}</li>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="rounded bg-muted-foreground/20 px-1 py-0.5 text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className="block rounded bg-muted-foreground/20 p-2 text-sm">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="mt-2">
            <StreamingIndicator />
          </div>
        )}

        {/* Error message */}
        {hasError && message.error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{message.error}</span>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 text-xs opacity-70',
            isUser ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
