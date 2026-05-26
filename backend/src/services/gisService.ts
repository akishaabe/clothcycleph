import { query } from '../config/database.js';

export interface PartnerSearchOptions {
  latitude?: number;
  longitude?: number;
  pathway?: string;
  radiusKm?: number;
}

const DEFAULT_RADIUS_KM = 75;

export async function listPartnerLocations(options: PartnerSearchOptions = {}) {
  const result = await query(
    `SELECT
       id, name, description, logo_url, email, phone,
       COALESCE(NULLIF(btrim(address), ''), 'Mapúa Makati') AS address,
       website,
       service_types, accepted_service_types, contact_person, rating, verified,
       latitude, longitude
     FROM partners
     WHERE COALESCE(status, 'active') IN ('active', 'pending')
     ORDER BY verified DESC, rating DESC, name ASC`
  );

  return result.rows
    .map((partner) => enrichPartner(partner, options))
    .filter((partner) => {
      if (options.pathway && !partnerMatchesPathway(partner, options.pathway)) {
        return false;
      }

      if (options.latitude == null || options.longitude == null || partner.distance_km == null) {
        return true;
      }

      return partner.distance_km <= (options.radiusKm || DEFAULT_RADIUS_KM);
    })
    .sort((a, b) => {
      if (a.distance_km != null && b.distance_km != null) {
        return a.distance_km - b.distance_km;
      }

      return Number(b.verified) - Number(a.verified) || Number(b.rating || 0) - Number(a.rating || 0);
    });
}

export function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLatitude - fromLatitude);
  const dLng = toRadians(toLongitude - fromLongitude);
  const startLat = toRadians(fromLatitude);
  const endLat = toRadians(toLatitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

export function partnerMatchesPathway(partner: any, pathway: string) {
  const haystack = `${partner.service_types || ''} ${partner.accepted_service_types || ''} ${partner.description || ''}`.toLowerCase();
  return haystack.includes(pathway.toLowerCase());
}

function enrichPartner(partner: any, options: PartnerSearchOptions) {
  const latitude = partner.latitude == null ? null : Number(partner.latitude);
  const longitude = partner.longitude == null ? null : Number(partner.longitude);
  const hasOrigin = options.latitude != null && options.longitude != null;
  const hasPartnerCoordinates = latitude != null && longitude != null;
  const distanceKm =
    hasOrigin && hasPartnerCoordinates
      ? calculateDistanceKm(options.latitude!, options.longitude!, latitude, longitude)
      : null;

  return {
    ...partner,
    verified: Boolean(partner.verified),
    rating: partner.rating == null ? null : Number(partner.rating),
    latitude,
    longitude,
    distance_km: distanceKm,
    gis_rank_reason: buildRankReason(distanceKm, partner, options.pathway),
  };
}

function buildRankReason(distanceKm: number | null, partner: any, pathway?: string) {
  const parts = [];

  if (distanceKm != null) {
    parts.push(`${distanceKm} km from your location`);
  }

  if (pathway && partnerMatchesPathway(partner, pathway)) {
    parts.push(`matches ${pathway}`);
  }

  if (partner.verified) {
    parts.push('verified partner');
  }

  return parts.join(', ') || 'ranked by partner rating and verification';
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
