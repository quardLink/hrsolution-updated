import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface GeofenceSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

function toSite(row: typeof schema.geofenceSites.$inferSelect): GeofenceSite {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radiusMeters),
  };
}

export async function listGeofenceSites(orgId: string): Promise<GeofenceSite[]> {
  const db = getDb();
  const rows = await db.query.geofenceSites.findMany({ where: eq(schema.geofenceSites.orgId, orgId) });
  return rows.map(toSite);
}

export async function addGeofenceSite(
  orgId: string,
  site: { name: string; latitude: number; longitude: number; radiusMeters: number },
): Promise<GeofenceSite> {
  const db = getDb();
  const [row] = await db
    .insert(schema.geofenceSites)
    .values({
      orgId,
      name: site.name,
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      radiusMeters: String(site.radiusMeters),
    })
    .returning();
  return toSite(row);
}

export async function removeGeofenceSite(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.geofenceSites).where(and(eq(schema.geofenceSites.orgId, orgId), eq(schema.geofenceSites.id, id)));
}

// Great-circle distance in meters — standard haversine formula.
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Null means "not evaluable" (no sites configured, or no coordinates
// given) — the caller decides what that means for auto-approval (see
// submitRemoteCheckIn), rather than this function guessing.
export function isWithinAnySite(
  sites: GeofenceSite[],
  lat: number | null,
  lon: number | null,
): boolean | null {
  if (sites.length === 0 || lat === null || lon === null) return null;
  return sites.some((s) => distanceMeters(lat, lon, s.latitude, s.longitude) <= s.radiusMeters);
}
