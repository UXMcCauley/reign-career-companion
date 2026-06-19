export type CoachPersonality =
  | 'professional'
  | 'witty'
  | 'straight-shooter'
  | 'detailed'
  | 'playful'
  | 'laid-back'
  | 'friendly';

export type ResponseType = 'brief' | 'simple' | 'data-driven' | 'in-depth';
export type ResponseStyle = 'plan-strategy' | 'conversational';

export type CoachCategory = { id: string; name: string; color: string };

export type CoachMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
};

export type CoachConversation = {
  id: string;
  title: string;
  categoryId: string;
  pinned?: boolean;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
  messages: CoachMessage[];
  unreadReplies?: number;
};

export type CoachState = {
  coachName: string;
  personalities: CoachPersonality[];
  responseType: ResponseType;
  responseStyle: ResponseStyle;
  categories: CoachCategory[];
  conversations: CoachConversation[];
  activeConversationId: string | null;
};

export type CoachApiPayload = {
  coachName: string;
  personalities: CoachPersonality[];
  responseType: ResponseType;
  responseStyle: ResponseStyle;
  categoryName: string;
  employeeContext: Record<string, unknown>;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};
