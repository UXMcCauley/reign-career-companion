export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  ts: number;
}

export interface Conversation {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  type: 'dm' | 'group';
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  messages: Message[];
  unread: number;
}
