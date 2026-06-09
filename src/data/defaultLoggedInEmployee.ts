import employeeJson from './defaultLoggedInEmployee.json';
import defaultEmployeeAvatar from '../assets/avatar.webp';
import badgeHolidayHeroSm from '../assets/badges/holiday_hero_sm.png';
import badgeHolidayHeroXl from '../assets/badges/holiday_hero_xl.png';
import badgeArtboard10 from '../assets/badges/Artboard 2_10.png';
import badgeArtboard10Xl from '../assets/badges/Artboard 2_10@4x.png';
import badgeArtboard13 from '../assets/badges/Artboard 2_13.png';
import badgeArtboard13Xl from '../assets/badges/Artboard 2_13@4x.png';
import badgeArtboard16 from '../assets/badges/Artboard 2_16.png';
import badgeArtboard16Xl from '../assets/badges/Artboard 2_16@4x.png';
import badgeArtboard19 from '../assets/badges/Artboard 2_19.png';
import badgeArtboard19Xl from '../assets/badges/Artboard 2_19@4x.png';

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

type ResumeBadge = {
  id: string;
  key: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
};

type CareerOverviewSegment = {
  label: string;
  percent: number;
  startColor: string;
  endColor: string;
};

type GaugeConfig = {
  title: string;
  value: number;
  max: number;
  startLabel: string;
  endLabel: string;
  gradient: string[];
};

type SuccessProbabilitySegment = {
  label: string;
  weight: number;
  startColor: string;
  endColor: string;
};

type SuccessProbabilityConfig = {
  title: string;
  value: number;
  valueLabel: string;
  segments: SuccessProbabilitySegment[];
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
  resume: {
    stats: {
      attendancePercent: number;
      hourlyRate: number;
      timeWithCompanyYears: number;
      ptoDays: number;
      employerFlags: number;
    };
    badges: ResumeBadge[];
    careerOverview: CareerOverviewSegment[];
    performanceRating: GaugeConfig;
    kpiGauge: GaugeConfig;
    successProbability: SuccessProbabilityConfig;
  };
};

const parsedEmployee = employeeJson as Omit<DefaultLoggedInEmployee, 'avatarUrl' | 'resume'> & {
  resume: Omit<DefaultLoggedInEmployee['resume'], 'badges'> & {
    badges: Array<{ id: string; key: string; label: string }>;
  };
};

const badgeAssetMap: Record<string, { thumbUrl: string; fullUrl: string }> = {
  holiday_hero: { thumbUrl: badgeHolidayHeroSm, fullUrl: badgeHolidayHeroXl },
  artboard_2_10: { thumbUrl: badgeArtboard10, fullUrl: badgeArtboard10Xl },
  artboard_2_13: { thumbUrl: badgeArtboard13, fullUrl: badgeArtboard13Xl },
  artboard_2_16: { thumbUrl: badgeArtboard16, fullUrl: badgeArtboard16Xl },
  artboard_2_19: { thumbUrl: badgeArtboard19, fullUrl: badgeArtboard19Xl }
};

export const defaultLoggedInEmployee: DefaultLoggedInEmployee = {
  ...parsedEmployee,
  avatarUrl: defaultEmployeeAvatar,
  resume: {
    ...parsedEmployee.resume,
    badges: parsedEmployee.resume.badges.map(badge => ({
      ...badge,
      thumbUrl: badgeAssetMap[badge.key]?.thumbUrl ?? badgeHolidayHeroSm,
      fullUrl: badgeAssetMap[badge.key]?.fullUrl ?? badgeHolidayHeroXl
    }))
  }
};
