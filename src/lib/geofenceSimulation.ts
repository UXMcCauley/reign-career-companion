import { GEOFENCE_RADIUS_FEET } from '../config/jobSite';

/** How far beyond the geofence edge the demo walk begins. */
export const PROXIMITY_APPROACH_OFFSET_FT = 400;

/** Simulated walking speed toward the job site. */
export const PROXIMITY_APPROACH_SPEED_FT_PER_SEC = 15;

/** Employee approaches from north of the job site. */
export const PROXIMITY_APPROACH_BEARING_DEG = 0;

export const PROXIMITY_TEST_START_DISTANCE_FT =
  GEOFENCE_RADIUS_FEET + PROXIMITY_APPROACH_OFFSET_FT;

export function feetFromGeofenceEdge(distanceToCenterFeet: number): number {
  return Math.max(0, distanceToCenterFeet - GEOFENCE_RADIUS_FEET);
}
