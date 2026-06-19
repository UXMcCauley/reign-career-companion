import { DEMO_EMPLOYEES } from './employees';

export interface Break {
  startHour: number;
  durationMins: number;
  type: 'rest' | 'meal';
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface Shift {
  id: string;
  startHour: number;
  endHour: number;
  role: string;
  location: string;
  manager: string;
  breaks: Break[];
  team: TeamMember[];
  notes?: string;
}

export interface DaySchedule {
  date: Date;
  shift: Shift | null;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const empName = (index: number) => DEMO_EMPLOYEES[index % DEMO_EMPLOYEES.length]?.name ?? 'Unassigned';

export const MOCK_SHIFTS: Record<string, Shift> = {
  '1': {
    id: '1',
    startHour: 8,
    endHour: 16.5,
    role: 'Floor Associate',
    location: 'Main Floor',
    manager: empName(0),
    breaks: [
      { startHour: 10.25, durationMins: 15, type: 'rest' },
      { startHour: 12.5,  durationMins: 30, type: 'meal' },
      { startHour: 15,    durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: empName(0), role: 'Manager'          },
      { name: empName(1), role: 'Floor Associate' },
      { name: empName(2), role: 'Floor Associate' },
      { name: empName(3), role: 'Cashier'          },
    ],
  },
  '2': {
    id: '2',
    startHour: 0,
    endHour: 7,
    role: 'Overnight Stocker',
    location: 'Warehouse',
    manager: empName(4),
    breaks: [
      { startHour: 2,   durationMins: 15, type: 'rest' },
      { startHour: 3.5, durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: empName(4), role: 'Manager'            },
      { name: empName(5), role: 'Overnight Stocker'  },
      { name: empName(6), role: 'Freight Associate'  },
    ],
    notes: 'Freight delivery arriving at 2:00 AM — prioritize dock clearance first.',
  },
  '3': {
    id: '3',
    startHour: 14,
    endHour: 22,
    role: 'Shift Lead',
    location: 'Zone B',
    manager: empName(7),
    breaks: [
      { startHour: 16,    durationMins: 15, type: 'rest' },
      { startHour: 18,    durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: empName(7), role: 'Manager'          },
      { name: empName(8), role: 'Floor Associate' },
      { name: empName(9), role: 'Floor Associate' },
      { name: empName(10), role: 'Cashier'          },
      { name: empName(11), role: 'Floor Associate' },
    ],
  },
  '4': {
    id: '4',
    startHour: 10.5,
    endHour: 18.5,
    role: 'Floor Associate',
    location: 'Main Floor',
    manager: empName(12),
    breaks: [
      { startHour: 13, durationMins: 15, type: 'rest' },
      { startHour: 15, durationMins: 30, type: 'meal' },
      { startHour: 17, durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: empName(12), role: 'Manager'          },
      { name: empName(13), role: 'Floor Associate' },
      { name: empName(14), role: 'Cashier'          },
      { name: empName(15), role: 'Floor Associate' },
    ],
  },
  '5': {
    id: '5',
    startHour: 12,
    endHour: 20,
    role: 'Floor Associate',
    location: 'Customer Service',
    manager: empName(16),
    breaks: [
      { startHour: 14.5, durationMins: 15, type: 'rest' },
      { startHour: 16.5, durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: empName(16), role: 'Manager'           },
      { name: empName(17), role: 'Floor Associate'   },
      { name: empName(18), role: 'Customer Service'  },
      { name: empName(19), role: 'Floor Associate'   },
    ],
  },
  '6': {
    id: '6',
    startHour: 9,
    endHour: 17,
    role: 'Cashier',
    location: 'Front End',
    manager: empName(0),
    breaks: [
      { startHour: 11.5, durationMins: 15, type: 'rest' },
      { startHour: 13,   durationMins: 30, type: 'meal' },
      { startHour: 15.5, durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: empName(1), role: 'Manager'   },
      { name: empName(2), role: 'Cashier'   },
      { name: empName(3), role: 'Cashier'   },
    ],
    notes: 'Friday close-out — verify register counts before leaving.',
  },
  '7': {
    id: '7',
    startHour: 10,
    endHour: 18,
    role: 'Floor Associate',
    location: 'Main Floor',
    manager: empName(4),
    breaks: [
      { startHour: 12,   durationMins: 15, type: 'rest' },
      { startHour: 14,   durationMins: 30, type: 'meal' },
      { startHour: 16.5, durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: empName(5), role: 'Manager'           },
      { name: empName(6), role: 'Floor Associate' },
      { name: empName(7), role: 'Customer Service'  },
    ],
    notes: 'Saturday returns volume is high — expect extended customer service queue.',
  },
};

/** Bump when seed templates or patterns change — triggers schedule regeneration on device. */
export const SCHEDULE_SEED_VERSION = 3;

/** Weeks of history/future to materialize in scheduleByDate. */
export const SCHEDULE_WEEKS_BACK = 2;
export const SCHEDULE_WEEKS_FORWARD = 12;

/**
 * Rotating assignment patterns (0=Sun … 6=Sat). null = day off.
 * Week 0 is a full week; later patterns leave gaps for clock-in / off-day testing.
 */
export const DEMO_WEEK_PATTERNS: (string | null)[][] = [
  ['1', '2', '3', '4', '5', '6', '7'],
  ['1', '2', null, '4', '5', null, '7'],
  ['1', null, '3', '4', null, '6', '7'],
  [null, '2', '3', null, '5', '6', null],
];

export function getWeekDays(ref: Date): Date[] {
  const sun = new Date(ref);
  sun.setDate(ref.getDate() - ref.getDay());
  sun.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}

export function formatHour(decimal: number): string {
  const normalized = ((decimal % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  const suffix = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${displayH} ${suffix}` : `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function shiftDuration(shift: Shift): string {
  const totalMins = (shift.endHour - shift.startHour) * 60;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m === 0 ? `${h} hours` : `${h} hours ${m} minutes`;
}

export function shiftDurationShort(shift: Shift): string {
  const totalMins = (shift.endHour - shift.startHour) * 60;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
