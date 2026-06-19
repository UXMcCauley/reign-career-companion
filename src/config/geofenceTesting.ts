/** When true, employee GPS is pinned to the configured job site for clock-in/out testing. */
export const useEmployeeLocationOverride =
  import.meta.env.VITE_OVERRIDE_EMPLOYEE_LOCATION === 'true';

export const bypassGeofenceCheck =
  import.meta.env.VITE_BYPASS_GEOFENCE === 'true';
