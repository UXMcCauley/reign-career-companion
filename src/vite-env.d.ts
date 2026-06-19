/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_USERNAME?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  readonly VITE_JOB_SITE_LAT?: string;
  readonly VITE_JOB_SITE_LNG?: string;
  readonly VITE_JOB_SITE_NAME?: string;
  readonly VITE_OVERRIDE_EMPLOYEE_LOCATION?: string;
  readonly VITE_BYPASS_GEOFENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
