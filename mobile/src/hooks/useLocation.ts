// mobile/src/hooks/useLocation.ts

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeocodedAddress {
  formattedAddress: string;
  city: string;
  street: string;
  postalCode: string;
}

/**
 * Hook to request permissions and manage device geolocation services.
 */
export function useLocation() {
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Requests foreground location permissions from the user.
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setErrorMsg('Permission de localisation refusée.');
        return false;
      }
      setErrorMsg(null);
      return true;
    } catch (err: any) {
      setErrorMsg(`Erreur de demande de permission : ${err.message}`);
      return false;
    }
  }, []);

  /**
   * Fetches the user's current GPS coordinates.
   */
  const getCurrentPosition = useCallback(async (): Promise<LocationCoords | null> => {
    setIsLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCoords(newCoords);
      return newCoords;
    } catch (err: any) {
      setErrorMsg(`Impossible d'obtenir la position actuelle : ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [requestPermissions]);

  /**
   * Reverse-geocodes coordinate values to resolve a physical address name.
   */
  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number): Promise<GeocodedAddress | null> => {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        
        if (results.length === 0) return null;

        const firstResult = results[0];
        
        const street = firstResult.street || '';
        const name = firstResult.name || '';
        const streetName = street || name;
        const city = firstResult.city || firstResult.subregion || '';
        const postalCode = firstResult.postalCode || '';
        const country = firstResult.country || '';

        const addressParts = [streetName, postalCode, city, country].filter((p) => p.trim() !== '');

        return {
          formattedAddress: addressParts.join(', '),
          city,
          street: streetName,
          postalCode,
        };
      } catch (err: any) {
        console.error('Reverse geocoding lookup failed:', err);
        return null;
      }
    },
    []
  );

  /**
   * Listens to real-time changes in device coordinates.
   * Make sure to call subscription.remove() to release resources.
   * 
   * @param {(coords: LocationCoords) => void} callback - Position updates handler.
   * @returns {Promise<{ remove: () => void } | null>} Subscription reference.
   */
  const watchPosition = useCallback(
    async (callback: (coords: LocationCoords) => void): Promise<{ remove: () => void } | null> => {
      try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return null;

        return await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // interval updates in ms
            distanceInterval: 10, // distance trigger in meters
          },
          (location) => {
            const currentCoords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setCoords(currentCoords);
            callback(currentCoords);
          }
        );
      } catch (err: any) {
        setErrorMsg(`Failed to watch position: ${err.message}`);
        return null;
      }
    },
    [requestPermissions]
  );

  // Initialize permission state on mount
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status);
    }).catch(console.warn);
  }, []);

  return {
    coords,
    permissionStatus,
    errorMsg,
    isLoading,
    getCurrentPosition,
    reverseGeocode,
    watchPosition,
    requestPermissions,
  };
}

// FICHIER SUIVANT : mobile/src/services/notifications.service.ts
