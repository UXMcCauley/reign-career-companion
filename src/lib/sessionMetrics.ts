import type { ActiveClockSession, ClockEvent } from '../data/localDatabase';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { demoEmployeeTalentCards } from '../data/talentCards';

export const SESSION_HOURLY_RATE = defaultLoggedInEmployee.resume.stats.hourlyRate;

const keyCardNameById = new Map(demoEmployeeTalentCards.map(card => [card.id, card.name]));

export function keyCardName(id: string | null): string {
  if (!id) return 'No key card';
  return keyCardNameById.get(id) ?? id;
}

export function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

export interface BreakLogEntry {
  id: string;
  label: string;
  startTs: number;
  endTs: number | null;
  seconds: number;
}

export interface SessionSummary {
  workedSeconds: number;
  earnings: number;
  totalBreakSeconds: number;
  onBreak: boolean;
  breaks: BreakLogEntry[];
  perKeyCard: { keyCardId: string | null; seconds: number }[];
}

function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/** Derive live session metrics from the active session + its clock events. */
export function buildSessionSummary(
  session: ActiveClockSession,
  events: ClockEvent[],
  now: number
): SessionSummary {
  const shiftEvents = events
    .filter(e => e.shiftId === session.shiftId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const breakIntervals: Array<[number, number]> = [];
  const breaks: BreakLogEntry[] = [];
  let openStart: ClockEvent | null = null;
  for (const ev of shiftEvents) {
    if (ev.type === 'break_start') {
      openStart = ev;
    } else if (ev.type === 'break_end' && openStart) {
      breakIntervals.push([openStart.timestamp, ev.timestamp]);
      breaks.push({
        id: openStart.id,
        label: openStart.message.replace(/ started$/i, ''),
        startTs: openStart.timestamp,
        endTs: ev.timestamp,
        seconds: Math.max(0, (ev.timestamp - openStart.timestamp) / 1000),
      });
      openStart = null;
    }
  }
  if (session.onBreak && session.breakStartedAt) {
    breakIntervals.push([session.breakStartedAt, now]);
    const startEv = openStart;
    breaks.push({
      id: startEv?.id ?? `ongoing-${session.breakStartedAt}`,
      label: (startEv?.message ?? 'Break started').replace(/ started$/i, ''),
      startTs: session.breakStartedAt,
      endTs: null,
      seconds: Math.max(0, (now - session.breakStartedAt) / 1000),
    });
  }

  const grossSeconds = (now - session.clockInTimestamp) / 1000;
  const totalBreakSeconds =
    session.totalBreakSeconds + (session.onBreak && session.breakStartedAt ? (now - session.breakStartedAt) / 1000 : 0);
  const workedSeconds = Math.max(0, grossSeconds - totalBreakSeconds);

  const kcEvents = shiftEvents.filter(e => e.type === 'clock_in' || e.type === 'keycard_change');
  const usage = new Map<string | null, number>();
  for (let i = 0; i < kcEvents.length; i += 1) {
    const segStart = kcEvents[i].timestamp;
    const segEnd = i + 1 < kcEvents.length ? kcEvents[i + 1].timestamp : now;
    let net = segEnd - segStart;
    for (const [bs, be] of breakIntervals) net -= overlapMs(segStart, segEnd, bs, be);
    const key = kcEvents[i].keyCardId ?? null;
    usage.set(key, (usage.get(key) ?? 0) + Math.max(0, net) / 1000);
  }

  return {
    workedSeconds,
    earnings: (workedSeconds / 3600) * SESSION_HOURLY_RATE,
    totalBreakSeconds,
    onBreak: session.onBreak,
    breaks,
    perKeyCard: [...usage.entries()]
      .map(([keyCardId, seconds]) => ({ keyCardId, seconds }))
      .filter(entry => entry.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds),
  };
}
