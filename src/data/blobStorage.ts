import { DEMO_EMPLOYEES, type DemoEmployee } from './employees';
import { MOCK_SHIFTS, type Shift } from './scheduleData';
import type { Conversation } from './chatTypes';

const CHAT_LOCAL_KEY = 'reign_chat_v2';
const EMPLOYEE_LOCAL_KEY = 'reign_employees_v1';
const SCHEDULE_LOCAL_KEY = 'reign_schedule_v1';
const SHIFT_RUNTIME_LOCAL_KEY = 'reign_shift_runtime_v1';
const FORCE_SHIFT_SEED = import.meta.env.VITE_SHIFT_TEST === 'true';
const EMPLOYEE_BLOB_NAMES = ['employees', 'Employees'];
const CHAT_BLOB_NAMES = ['chats', 'chat-data', 'chat'];
let activeChatBlobName = CHAT_BLOB_NAMES[0];
let blobReadDisabled = false;
let blobWriteDisabled = false;

interface ShiftRuntimeState {
  isClockedIn: boolean;
  activeBreakIndex: number | null;
}

type ShiftRuntimeMap = Record<string, ShiftRuntimeState>;

interface ExternalChatMessage {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
}

interface ExternalChatConversation {
  id: string;
  name: string;
  type: string;
  archived?: boolean;
  unreadCount?: number;
  participants?: string[];
  messages?: ExternalChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

function colorForName(name: string): string {
  const palette = ['#7b3fff', '#2e85ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#e87d30', '#00c875', '#46c9ff'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function initialsFromLabel(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function isInternalChatShape(chats: unknown[]): boolean {
  const first = chats[0] as Record<string, unknown>;
  return Boolean(first && typeof first.unread === 'number' && Array.isArray(first.messages));
}

function normalizeExternalChats(chats: ExternalChatConversation[]): Conversation[] {
  const localUserName = localStorage.getItem('reign_user_name') || '';
  const knownMeNames = [localUserName, 'Drew McCauley'].map(n => n.toLowerCase()).filter(Boolean);

  return chats.map(chat => {
    const messages = (chat.messages ?? []).map(message => ({
      id: message.id,
      text: message.body,
      sender: knownMeNames.includes(message.sender.toLowerCase()) ? 'me' as const : 'other' as const,
      ts: new Date(message.createdAt).getTime() || Date.now(),
    }));

    const chatType = (chat.type || '').toLowerCase();
    const isGroup = chatType !== 'dm' && chatType !== 'direct';

    return {
      id: chat.id,
      name: chat.name,
      role: chatType ? `${chat.type}${chat.participants?.length ? ` · ${chat.participants.length} members` : ''}` : 'Conversation',
      initials: initialsFromLabel(chat.name),
      color: colorForName(chat.name),
      type: isGroup ? 'group' : 'dm',
      pinned: false,
      muted: false,
      archived: Boolean(chat.archived),
      messages,
      unread: chat.unreadCount ?? 0,
    };
  });
}

function normalizeChatsPayload(chats: unknown): Conversation[] | null {
  if (!Array.isArray(chats) || chats.length === 0) return Array.isArray(chats) ? [] : null;
  if (isInternalChatShape(chats)) return chats as Conversation[];
  return normalizeExternalChats(chats as ExternalChatConversation[]);
}

function parseExternalType(conversation: Conversation): string {
  if (conversation.type === 'dm') return 'dm';
  const hint = conversation.role.split('·')[0].trim().toLowerCase();
  if (['team', 'project', 'social feed', 'group'].includes(hint)) return hint;
  return 'group';
}

function toExternalChats(conversations: Conversation[]): ExternalChatConversation[] {
  const meName = localStorage.getItem('reign_user_name') || 'Drew McCauley';

  return conversations.map(conversation => {
    const messages = conversation.messages.map(message => ({
      id: message.id,
      sender: message.sender === 'me' ? meName : conversation.name,
      body: message.text,
      createdAt: new Date(message.ts).toISOString(),
    }));

    const participantSet = new Set<string>();
    messages.forEach(message => participantSet.add(message.sender));
    if (participantSet.size === 0) participantSet.add(conversation.name);
    if ([...participantSet].every(name => name !== meName)) participantSet.add(meName);

    const firstTs = conversation.messages[0]?.ts ?? Date.now();
    const lastTs = conversation.messages[conversation.messages.length - 1]?.ts ?? firstTs;

    return {
      id: conversation.id,
      name: conversation.name,
      type: parseExternalType(conversation),
      archived: conversation.archived,
      unreadCount: conversation.unread,
      participants: [...participantSet],
      messages,
      createdAt: new Date(firstTs).toISOString(),
      updatedAt: new Date(lastTs).toISOString(),
    };
  });
}

async function readBlobJson<T>(name: string): Promise<T | null> {
  if (blobReadDisabled) return null;
  try {
    const response = await fetch(`/api/blob?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if ([401, 403, 500, 503].includes(response.status)) {
      blobReadDisabled = true;
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // Avoid repeated noisy network failures in client runtime.
    blobReadDisabled = true;
    return null;
  }
}

async function writeBlobJson(name: string, data: unknown): Promise<boolean> {
  if (blobWriteDisabled) return false;
  try {
    const response = await fetch(`/api/blob?name=${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if ([401, 403, 405, 500, 503].includes(response.status)) {
      blobWriteDisabled = true;
      return false;
    }
    if (!response.ok) return false;
    return (await response.json()).ok === true;
  } catch {
    blobWriteDisabled = true;
    return false;
  }
}

function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalJson(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore local persistence failures in demo mode.
  }
}

export async function loadEmployees(): Promise<DemoEmployee[]> {
  for (const employeeBlobName of EMPLOYEE_BLOB_NAMES) {
    const blobData = await readBlobJson<DemoEmployee[]>(employeeBlobName);
    if (blobData?.length) {
      writeLocalJson(EMPLOYEE_LOCAL_KEY, blobData);
      return blobData;
    }
  }

  const localData = readLocalJson<DemoEmployee[]>(EMPLOYEE_LOCAL_KEY);
  if (localData?.length) return localData;

  writeLocalJson(EMPLOYEE_LOCAL_KEY, DEMO_EMPLOYEES);
  await writeBlobJson('employees', DEMO_EMPLOYEES);
  return DEMO_EMPLOYEES;
}

export async function loadShifts(): Promise<Record<string, Shift>> {
  if (FORCE_SHIFT_SEED) {
    writeLocalJson(SCHEDULE_LOCAL_KEY, MOCK_SHIFTS);
    await writeBlobJson('shifts', MOCK_SHIFTS);
    return MOCK_SHIFTS;
  }

  const blobData = await readBlobJson<Record<string, Shift>>('shifts');
  if (blobData && Object.keys(blobData).length > 0) {
    writeLocalJson(SCHEDULE_LOCAL_KEY, blobData);
    return blobData;
  }

  const localData = readLocalJson<Record<string, Shift>>(SCHEDULE_LOCAL_KEY);
  if (localData && Object.keys(localData).length > 0) return localData;

  writeLocalJson(SCHEDULE_LOCAL_KEY, MOCK_SHIFTS);
  await writeBlobJson('shifts', MOCK_SHIFTS);
  return MOCK_SHIFTS;
}

export async function loadChats(seedFactory: () => Conversation[]): Promise<Conversation[]> {
  for (const chatBlobName of CHAT_BLOB_NAMES) {
    const blobData = await readBlobJson<unknown>(chatBlobName);
    const normalized = normalizeChatsPayload(blobData);
    if (normalized) {
      activeChatBlobName = chatBlobName;
      writeLocalJson(CHAT_LOCAL_KEY, normalized);
      return normalized;
    }
  }

  const localData = readLocalJson<Conversation[]>(CHAT_LOCAL_KEY);
  if (localData) return localData;

  const seed = seedFactory();
  writeLocalJson(CHAT_LOCAL_KEY, seed);
  await writeBlobJson('chats', seed);
  return seed;
}

export async function saveChats(conversations: Conversation[]): Promise<void> {
  writeLocalJson(CHAT_LOCAL_KEY, conversations);
  await writeBlobJson(activeChatBlobName, toExternalChats(conversations));
}

async function loadShiftRuntimeMap(): Promise<ShiftRuntimeMap> {
  const blobData = await readBlobJson<ShiftRuntimeMap>('shift-runtime');
  if (blobData) {
    writeLocalJson(SHIFT_RUNTIME_LOCAL_KEY, blobData);
    return blobData;
  }

  return readLocalJson<ShiftRuntimeMap>(SHIFT_RUNTIME_LOCAL_KEY) ?? {};
}

async function saveShiftRuntimeMap(data: ShiftRuntimeMap): Promise<void> {
  writeLocalJson(SHIFT_RUNTIME_LOCAL_KEY, data);
  await writeBlobJson('shift-runtime', data);
}

export async function loadShiftRuntime(shiftId: string): Promise<ShiftRuntimeState> {
  const map = await loadShiftRuntimeMap();
  return map[shiftId] ?? { isClockedIn: false, activeBreakIndex: null };
}

export async function saveShiftRuntime(shiftId: string, state: ShiftRuntimeState): Promise<void> {
  const map = await loadShiftRuntimeMap();
  map[shiftId] = state;
  await saveShiftRuntimeMap(map);
}
