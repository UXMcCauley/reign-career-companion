import employeeJson from './defaultLoggedInEmployee.json';
import defaultEmployeeAvatar from '../assets/avatar.webp';

type DashboardMetric = {
  label: string;
  value: string;
  total?: string;
  description: string;
};

type DashboardAnnouncement = {
  id: string;
  title: string;
  time: string;
  image: string;
};

type DashboardMastery = {
  title: string;
  levelLabel: string;
  fillPercent: number;
  pointsLabel: string;
  remainingLabel: string;
};

export type DefaultLoggedInEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleTitle: string;
  primaryEmail: string;
  phoneNumbers: string[];
  avatarUrl: string;
  bio: string;
  linkedInUrl: string;
  portfolioUrl: string;
  portfolioTitle: string;
  talentCardIds: string[];
  dashboard: {
    metrics: DashboardMetric[];
    mastery: DashboardMastery;
    clockAlert: string;
    announcements: DashboardAnnouncement[];
  };
};

const parsedEmployee = employeeJson as DefaultLoggedInEmployee;

export const defaultLoggedInEmployee: DefaultLoggedInEmployee = {
  ...parsedEmployee,
  avatarUrl: defaultEmployeeAvatar
};
