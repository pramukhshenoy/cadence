import { useState, useRef, useCallback } from 'react';
import { getApiBaseUrl, getApiToken } from '@/lib/api-client';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type UseChatStream = {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  send: (text: string) => void;
  newConversation: () => void;
};

export function useChatStream(): UseChatStream {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<string>(generateId());
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (isStreaming || !trimmed) return;

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: trimmed };
      const assistantMsg: ChatMessage = { id: generateId(), role: 'assistant', content: '' };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setError(null);

      // Async setup in a self-invoking async fn so the hook callback stays sync.
      (async () => {
        let baseUrl: string;
        let token: string | null;
        try {
          [baseUrl, token] = await Promise.all([getApiBaseUrl(), getApiToken()]);
        } catch {
          setError('Could not read connection settings.');
          setIsStreaming(false);
          return;
        }

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        let processed = 0;
        let accumulated = '';

        xhr.open('POST', `${baseUrl}/api/chat`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Timezone', TIMEZONE);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.onprogress = () => {
          const newChunk = xhr.responseText.slice(processed);
          processed = xhr.responseText.length;

          for (const line of newChunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)) as {
                type: string;
                content?: string;
                message?: string;
              };
              if (event.type === 'delta' && typeof event.content === 'string') {
                accumulated += event.content;
                const snapshot = accumulated;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: snapshot };
                  return copy;
                });
              } else if (event.type === 'error') {
                setError(event.message ?? 'Streaming error');
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        };

        xhr.onloadend = () => {
          setIsStreaming(false);
          xhrRef.current = null;
        };

        xhr.onerror = () => {
          setError('Network error — check server connection.');
          setIsStreaming(false);
          xhrRef.current = null;
        };

        xhr.send(
          JSON.stringify({ conversationId: conversationIdRef.current, message: trimmed }),
        );
      })();
    },
    [isStreaming],
  );

  const newConversation = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    conversationIdRef.current = generateId();
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  return { messages, isStreaming, error, send, newConversation };
}
