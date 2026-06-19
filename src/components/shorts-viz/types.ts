import type { ReactNode } from 'react';

export type BarChartDatum = {
  label: string;
  value: number;
  color?: string;
  highlighted?: boolean;
};

export type ShortLink = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ShortMetric = {
  value: string | number;
  icon?: ReactNode;
  tone?: 'positive' | 'negative' | 'neutral';
  backgroundColor?: string;
};

export type BarChartConfig = {
  subtitle?: string;
  data: BarChartDatum[];
  yAxisTicks?: number[];
  maxValue?: number;
};

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export type TaskSliderItem = {
  id: string;
  title: string;
  value: string | number;
  progress: number;
  color: string;
  statusLabel?: string;
};
