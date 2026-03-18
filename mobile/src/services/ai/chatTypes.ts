export type ChatContentPart = {
  type: 'text';
  text: string;
};

export type ChatSource = 'typed' | 'voice';

export type ChatMessage = {
  id?: string;
  sessionId?: string | null;
  source?: ChatSource;
  role: 'user' | 'assistant';
  content: string | ChatContentPart[];
  intent?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};
