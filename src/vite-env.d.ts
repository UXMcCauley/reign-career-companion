/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_USERNAME?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  readonly VITE_JOB_SITE_LAT?: string;
  readonly VITE_JOB_SITE_LNG?: string;
  readonly VITE_JOB_SITE_NAME?: string;
  readonly VITE_OVERRIDE_EMPLOYEE_LOCATION?: string;
  readonly VITE_BYPASS_GEOFENCE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SHARE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
