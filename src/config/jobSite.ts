export const FEET_PER_METER = 3.28084;
export const GEOFENCE_RADIUS_FEET = 100;

export type JobSite = {
  name: string;
  latitude: number;
  longitude: number;
};

export const configuredJobSite: JobSite = (() => {
  const lat = Number(import.meta.env.VITE_JOB_SITE_LAT);
  const lng = Number(import.meta.env.VITE_JOB_SITE_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      name: (import.meta.env.VITE_JOB_SITE_NAME as string | undefined) ?? 'Configured Job Site',
      latitude: lat,
      longitude: lng,
    };
  }
  return {
    name: 'Downtown Job Site',
    latitude: 43.052639,
    longitude: -87.896407,
  };
})();
