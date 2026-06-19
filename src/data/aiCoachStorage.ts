import { Preferences } from '@capacitor/preferences';
import type {
  CoachCategory,
  CoachConversation,
  CoachMessage,
  CoachPersonality,
  CoachState,
  ResponseStyle,
  ResponseType,
} from './aiCoachTypes';

const PREFS_KEY = 'reign_ai_coach_v1';
const LEGACY_LOCAL_KEY = 'reign_ai_coach_v1';
const BLOB_NAME = 'ai-coach';

const PERSONALITY_SET = new Set<CoachPersonality>([
  'professional',
  'witty',
  'straight-shooter',
  'detailed',
  'playful',
  'laid-back',
  'friendly',
]);

const RESPONSE_TYPE_SET = new Set<ResponseType>(['brief', 'simple', 'data-driven', 'in-depth']);
const RESPONSE_STYLE_SET = new Set<ResponseStyle>(['plan-strategy', 'conversational']);

export const CATEGORY_COLORS = [
  '#7b3fff', '#2e85ff', '#00c875', '#e87d30', '#ff4d8d', '#46c9ff',
  '#c44dff', '#00d4aa', '#f7c948', '#ff6b6b', '#14b8a6', '#f43f5e',
];

export function pickCategoryColor(usedColors: string[]): string {
  const unused = CATEGORY_COLORS.filter(c => !usedColors.includes(c));
  if (unused.length) return unused[0];
  // All used — cycle by count
  return CATEGORY_COLORS[usedColors.length % CATEGORY_COLORS.length];
}

let memoryCache: CoachState | null = null;
let blobReadDisabled = false;
let blobWriteDisabled = false;

export function buildInitialCoachState(): CoachState {
  const defaultCategoryId = 'cat-general';
  const now = Date.now();
  return {
    coachName: 'Nova',
    personalities: ['professional', 'friendly'],
    responseType: 'brief',
    responseStyle: 'conversational',
    categories: [
      { id: defaultCategoryId, name: 'General Coaching', color: CATEGORY_COLORS[0] },
      { id: 'cat-workplace', name: 'Workplace Relationships', color: CATEGORY_COLORS[1] },
      { id: 'cat-career', name: 'Career Development', color: CATEGORY_COLORS[2] },
    ],
    conversations: [{
      id: 'conv-welcome',
      title: 'Welcome Plan',
      categoryId: defaultCategoryId,
      createdAt: now,
      updatedAt: now,
      messages: [{
        id: 'msg-welcome',
        role: 'assistant',
        ts: now,
        content: "I can coach you through team dynamics, conflict navigation, and career growth. Start a chat and I'll tailor advice to your current performance metrics.",
      }],
    }],
    activeConversationId: null,
  };
}

function normalizeMessage(raw: unknown): CoachMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as Partial<CoachMessage>;
  if (message.role !== 'user' && message.role !== 'assistant') return null;
  if (typeof message.content !== 'string') return null;
  return {
    id: typeof message.id === 'string' ? message.id : `msg-${Date.now()}`,
    role: message.role,
    content: message.content,
    ts: typeof message.ts === 'number' ? message.ts : Date.now(),
  };
}

function normalizeConversation(raw: unknown): CoachConversation | null {
  if (!raw || typeof raw !== 'object') return null;
  const conversation = raw as Partial<CoachConversation>;
  if (typeof conversation.id !== 'string' || typeof conversation.title !== 'string') return null;
  if (typeof conversation.categoryId !== 'string') return null;

  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.map(normalizeMessage).filter((message): message is CoachMessage => message !== null)
    : [];

  return {
    id: conversation.id,
    title: conversation.title.slice(0, 80),
    categoryId: conversation.categoryId,
    pinned: Boolean(conversation.pinned),
    archived: Boolean(conversation.archived),
    createdAt: typeof conversation.createdAt === 'number' ? conversation.createdAt : Date.now(),
    updatedAt: typeof conversation.updatedAt === 'number' ? conversation.updatedAt : Date.now(),
    messages,
  };
}

function normalizeCategory(raw: unknown): CoachCategory | null {
  if (!raw || typeof raw !== 'object') return null;
  const category = raw as Partial<CoachCategory>;
  if (typeof category.id !== 'string' || typeof category.name !== 'string') return null;
  const name = category.name.trim();
  if (!name) return null;
  return {
    id: category.id,
    name: name.slice(0, 64),
    color: typeof category.color === 'string' && category.color ? category.color : '',
  };
}

export function normalizeCoachState(parsed: unknown): CoachState {
  const defaults = buildInitialCoachState();
  if (!parsed || typeof parsed !== 'object') return defaults;

  const raw = parsed as Partial<CoachState>;
  const personalities = Array.isArray(raw.personalities)
    ? raw.personalities.filter((value): value is CoachPersonality => PERSONALITY_SET.has(value as CoachPersonality))
    : defaults.personalities;

  const categories = Array.isArray(raw.categories)
    ? raw.categories.map(normalizeCategory).filter((category): category is CoachCategory => category !== null)
    : defaults.categories;

  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations.map(normalizeConversation).filter((conversation): conversation is CoachConversation => conversation !== null)
    : defaults.conversations;

  const coachName = typeof raw.coachName === 'string' && raw.coachName.trim()
    ? raw.coachName.trim().slice(0, 32)
    : defaults.coachName;

  const resolvedCategories: CoachCategory[] = [];
  for (const cat of (categories.length ? categories : defaults.categories)) {
    const usedColors = resolvedCategories.map(c => c.color);
    const colorIsUnique = cat.color && !usedColors.includes(cat.color);
    resolvedCategories.push({ ...cat, color: colorIsUnique ? cat.color : pickCategoryColor(usedColors) });
  }

  return {
    coachName,
    personalities: personalities.length ? personalities : defaults.personalities,
    responseType: RESPONSE_TYPE_SET.has(raw.responseType as ResponseType)
      ? (raw.responseType as ResponseType)
      : defaults.responseType,
    responseStyle: RESPONSE_STYLE_SET.has(raw.responseStyle as ResponseStyle)
      ? (raw.responseStyle as ResponseStyle)
      : defaults.responseStyle,
    categories: resolvedCategories,
    conversations: conversations.length ? conversations : defaults.conversations,
    activeConversationId: null,
  };
}

function readLegacyLocal(): CoachState | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_KEY);
    if (!raw) return null;
    return normalizeCoachState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLegacyLocal(state: CoachState) {
  try {
    localStorage.setItem(LEGACY_LOCAL_KEY, JSON.stringify(state));
  } catch {
    // Ignore local persistence failures.
  }
}

async function readBlobJson<T>(name: string): Promise<T | null> {
  if (blobReadDisabled) return null;
  try {
    const response = await fetch(`/api/blob?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if ([400, 401, 403, 404, 500, 503].includes(response.status)) {
      if (response.status !== 404) {
        blobReadDisabled = true;
      }
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    blobReadDisabled = true;
    return null;
  }
}

async function writeBlobJson(name: string, data: unknown): Promise<void> {
  if (blobWriteDisabled) return;
  try {
    const response = await fetch(`/api/blob?name=${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if ([400, 401, 403, 405, 500, 503].includes(response.status)) {
      blobWriteDisabled = true;
      return;
    }
    if (!response.ok) return;
  } catch {
    blobWriteDisabled = true;
  }
}

export async function loadAICoachState(): Promise<CoachState> {
  if (memoryCache) return memoryCache;

  const { value } = await Preferences.get({ key: PREFS_KEY });
  if (value) {
    memoryCache = normalizeCoachState(JSON.parse(value));
    return memoryCache;
  }

  const blobData = await readBlobJson<CoachState>(BLOB_NAME);
  if (blobData) {
    memoryCache = normalizeCoachState(blobData);
    await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(memoryCache) });
    writeLegacyLocal(memoryCache);
    return memoryCache;
  }

  const legacy = readLegacyLocal();
  if (legacy) {
    memoryCache = legacy;
    await saveAICoachState(memoryCache);
    return memoryCache;
  }

  memoryCache = buildInitialCoachState();
  await saveAICoachState(memoryCache);
  return memoryCache;
}

export async function saveAICoachState(state: CoachState): Promise<void> {
  const normalized = normalizeCoachState(state);
  memoryCache = normalized;
  await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(normalized) });
  writeLegacyLocal(normalized);
  await writeBlobJson(BLOB_NAME, normalized);
}
