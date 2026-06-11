// backend/src/utils/geocoder.ts

import { env } from '../config/env';
import { logger } from './logger';

export interface Coordinates {
  lat: number;
  lng: number;
}

const FALLBACK_COORDINATES: Record<string, Coordinates> = {
  dakar: { lat: 14.6937, lng: -17.4441 },
  'saint-louis': { lat: 16.0326, lng: -16.4818 },
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.764, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
};

function getDevelopmentFallbackCoordinates(address: string): Coordinates {
  const normalizedAddress = address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const matchedCity = Object.keys(FALLBACK_COORDINATES).find((city) =>
    normalizedAddress.includes(city)
  );

  return matchedCity ? FALLBACK_COORDINATES[matchedCity] : FALLBACK_COORDINATES.dakar;
}

function canUseDevelopmentFallback(): boolean {
  return env.NODE_ENV !== 'production' && (!env.MAPBOX_TOKEN || env.MAPBOX_TOKEN === 'dummy');
}

/**
 * Geocodes an address string using the Mapbox Places API to obtain GPS coordinates.
 * 
 * @param {string} address - The street address or search query.
 * @returns {Promise<Coordinates>} The latitude and longitude coordinates.
 * @throws {Error} If address lookup fails or coordinate data is unavailable.
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  if (!address || address.trim() === '') {
    throw new Error('Address string cannot be empty.');
  }

  if (canUseDevelopmentFallback()) {
    logger.warn(
      `MAPBOX_TOKEN is not configured; using development coordinates fallback for "${address}".`
    );
    return getDevelopmentFallbackCoordinates(address);
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${env.MAPBOX_TOKEN}&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API request failed with status: ${response.status}`);
    }

    const data: any = await response.json();
    if (data && data.features && data.features.length > 0) {
      // Mapbox center is represented as [longitude, latitude]
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }

    throw new Error('No coordinates found for the provided address.');
  } catch (error: any) {
    logger.error(`Error geocoding address "${address}":`, error);
    throw new Error(`Geocoding error: ${error.message}`);
  }
}

/**
 * Performs reverse geocoding to retrieve a physical address string from GPS coordinates.
 * 
 * @param {number} lat - Latitude coordinate.
 * @param {number} lng - Longitude coordinate.
 * @returns {Promise<string>} The formatted address name.
 * @throws {Error} If coordinates cannot be mapped to an address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${env.MAPBOX_TOKEN}&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API request failed with status: ${response.status}`);
    }

    const data: any = await response.json();
    if (data && data.features && data.features.length > 0) {
      return data.features[0].place_name; // e.g. "123 Rue de Rivoli, 75001 Paris, France"
    }

    throw new Error('No address found for the provided coordinates.');
  } catch (error: any) {
    logger.error(`Error reverse-geocoding coordinates [${lat}, ${lng}]:`, error);
    throw new Error(`Reverse geocoding error: ${error.message}`);
  }
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * 
 * @param {number} lat1 - Latitude of the first point.
 * @param {number} lng1 - Longitude of the first point.
 * @param {number} lat2 - Latitude of the second point.
 * @param {number} lng2 - Longitude of the second point.
 * @returns {number} The distance in kilometers.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371; // Earth's average radius in kilometers

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusKm * c;

  return Number(distance.toFixed(2));
}

// FICHIER SUIVANT : backend/src/utils/pdf.generator.ts
