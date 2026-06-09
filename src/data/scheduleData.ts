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

export const MOCK_SHIFTS: Record<string, Shift> = {
  '1': {
    id: '1',
    startHour: 8,
    endHour: 16.5,
    role: 'Floor Associate',
    location: 'Main Floor',
    manager: 'Sarah K.',
    breaks: [
      { startHour: 10.25, durationMins: 15, type: 'rest' },
      { startHour: 12.5,  durationMins: 30, type: 'meal' },
      { startHour: 15,    durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: 'Sarah K.',  role: 'Manager'          },
      { name: 'James H.',  role: 'Floor Associate' },
      { name: 'Priya S.',  role: 'Floor Associate' },
      { name: 'Tom W.',    role: 'Cashier'          },
    ],
  },
  '2': {
    id: '2',
    startHour: 0,
    endHour: 7,
    role: 'Overnight Stocker',
    location: 'Warehouse',
    manager: 'Derek L.',
    breaks: [
      { startHour: 2,   durationMins: 15, type: 'rest' },
      { startHour: 3.5, durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: 'Derek L.',  role: 'Manager'            },
      { name: 'Miguel R.', role: 'Overnight Stocker'  },
      { name: 'Lin Z.',    role: 'Freight Associate'  },
    ],
    notes: 'Freight delivery arriving at 2:00 AM — prioritize dock clearance first.',
  },
  '3': {
    id: '3',
    startHour: 14,
    endHour: 22,
    role: 'Shift Lead',
    location: 'Zone B',
    manager: 'Maria T.',
    breaks: [
      { startHour: 16,    durationMins: 15, type: 'rest' },
      { startHour: 18,    durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: 'Maria T.', role: 'Manager'          },
      { name: 'Dana K.',  role: 'Floor Associate' },
      { name: 'Alex M.',  role: 'Floor Associate' },
      { name: 'Sam T.',   role: 'Cashier'          },
      { name: 'Ray P.',   role: 'Floor Associate' },
    ],
  },
  '4': {
    id: '4',
    startHour: 7,
    endHour: 15,
    role: 'Floor Associate',
    location: 'Main Floor',
    manager: 'Sarah K.',
    breaks: [
      { startHour: 9.5,  durationMins: 15, type: 'rest' },
      { startHour: 11.5, durationMins: 30, type: 'meal' },
      { startHour: 13.5, durationMins: 15, type: 'rest' },
    ],
    team: [
      { name: 'Sarah K.', role: 'Manager'          },
      { name: 'James H.', role: 'Floor Associate' },
      { name: 'Priya S.', role: 'Cashier'          },
      { name: 'Omar K.',  role: 'Floor Associate' },
    ],
  },
  '5': {
    id: '5',
    startHour: 12,
    endHour: 20,
    role: 'Floor Associate',
    location: 'Customer Service',
    manager: 'Carlos R.',
    breaks: [
      { startHour: 14.5, durationMins: 15, type: 'rest' },
      { startHour: 16.5, durationMins: 30, type: 'meal' },
    ],
    team: [
      { name: 'Carlos R.', role: 'Manager'           },
      { name: 'Aisha B.',  role: 'Floor Associate'   },
      { name: 'Kevin L.',  role: 'Customer Service'  },
      { name: 'Nina C.',   role: 'Floor Associate'   },
    ],
    notes: 'Saturday returns volume is high — expect extended customer service queue.',
  },
};

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
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
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
