import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';

/** Demo login for the seeded Alex Rivera employee profile. Override via .env if needed. */
export const DEMO_CREDENTIALS = {
  username: import.meta.env.VITE_DEMO_USERNAME ?? defaultLoggedInEmployee.primaryEmail,
  password: import.meta.env.VITE_DEMO_PASSWORD ?? 'demo1234',
} as const;
