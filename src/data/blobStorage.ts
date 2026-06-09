import { list, put } from '@vercel/blob';
import { DEMO_EMPLOYEES, type DemoEmployee } from './employees';
import { MOCK_SHIFTS, type Shift } from './scheduleData';
import type { Conversation } from './chatTypes';

const BLOB_TOKEN =
  import.meta.env.VITE_BLOB_READ_WRITE_TOKEN ||
  import.meta.env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN ||
  '';

const BLOB_PREFIX = import.meta.env.VITE_BLOB_PREFIX || 'leadership-demo';

const CHAT_LOCAL_KEY = 'reign_chat_v2';
const EMPLOYEE_LOCAL_KEY = 'reign_employees_v1';
const SCHEDULE_LOCAL_KEY = 'reign_schedule_v1';
const SHIFT_RUNTIME_LOCAL_KEY = 'reign_shift_runtime_v1';

const pathFor = (name: string) => `${BLOB_PREFIX}/${name}.json`;

interface ShiftRuntimeState {
  isClockedIn: boolean;
  activeBreakIndex: number | null;
}

type ShiftRuntimeMap = Record<string, ShiftRuntimeState>;

async function readBlobJson<T>(name: string): Promise<T | null> {
  if (!BLOB_TOKEN) return null;
  try {
    const pathname = pathFor(name);
    const { blobs } = await list({ token: BLOB_TOKEN, prefix: pathname, limit: 1 });
    const blob = blobs.find(item => item.pathname === pathname) ?? blobs[0];
    if (!blob) return null;
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson(name: string, data: unknown): Promise<boolean> {
  if (!BLOB_TOKEN) return false;
  try {
    await put(pathFor(name), JSON.stringify(data), {
      token: BLOB_TOKEN,
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    return true;
  } catch {
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
  const blobData = await readBlobJson<DemoEmployee[]>('employees');
  if (blobData?.length) {
    writeLocalJson(EMPLOYEE_LOCAL_KEY, blobData);
    return blobData;
  }

  const localData = readLocalJson<DemoEmployee[]>(EMPLOYEE_LOCAL_KEY);
  if (localData?.length) return localData;

  writeLocalJson(EMPLOYEE_LOCAL_KEY, DEMO_EMPLOYEES);
  await writeBlobJson('employees', DEMO_EMPLOYEES);
  return DEMO_EMPLOYEES;
}

export async function loadShifts(): Promise<Record<string, Shift>> {
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
  const blobData = await readBlobJson<Conversation[]>('chats');
  if (blobData) {
    writeLocalJson(CHAT_LOCAL_KEY, blobData);
    return blobData;
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
  await writeBlobJson('chats', conversations);
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
