// mobile/src/components/BienMap.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Dimensions } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';

export interface MapProperty {
  id: string;
  titre: string;
  loyer: number;
  lat: number;
  lng: number;
  photo?: string | null;
}

export interface BienMapProps {
  properties: MapProperty[];
  onSelectProperty?: (id: string) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Property map display component.
 * Features Airbnb-style pricing pins, custom details callout overlays, and locate-me triggers.
 */
export const BienMap: React.FC<BienMapProps> = ({
  properties,
  onSelectProperty,
  initialLatitude = 14.6937, // Default coordinates to Dakar, Senegal
  initialLongitude = -17.4441,
}) => {
  const mapRef = useRef<MapView>(null);
  const { coords, getCurrentPosition } = useLocation();

  // Initial region setup
  const initialRegion: Region = {
    latitude: initialLatitude,
    longitude: initialLongitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  /**
   * Centers the Map view on the user's current GPS position.
   */
  const centerOnUserLocation = async () => {
    const userCoords = await getCurrentPosition();
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
  };

  // Center on pins when properties list updates
  useEffect(() => {
    if (properties.length > 0 && mapRef.current) {
      // Fit map to coordinates of all visible pins
      const coordinates = properties.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [properties]);

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{ latitude: property.lat, longitude: property.lng }}
            tracksViewChanges={Platform.OS === 'android'} // prevents performance lags on Android
          >
            {/* Custom pricing Pin view */}
            <View style={[styles.pricePin, shadows.sm]}>
              <Text style={styles.pricePinText}>
                {Math.round(property.loyer).toLocaleString('fr-FR')} €
              </Text>
            </View>

            {/* Custom detailed Callout overlay */}
            <Callout
              onPress={() => onSelectProperty?.(property.id)}
              style={styles.calloutContainer}
            >
              <View style={styles.calloutContent}>
                {property.photo && (
                  <Image source={{ uri: property.photo }} style={styles.calloutImage} />
                )}
                <View style={styles.calloutTextContainer}>
                  <Text numberOfLines={1} style={styles.calloutTitle}>
                    {property.titre}
                  </Text>
                  <Text style={styles.calloutPrice}>
                    {property.loyer.toLocaleString('fr-FR')} € / mois
                  </Text>
                  <Text style={styles.calloutAction}>Voir les détails</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Locate Me floating Action Button */}
      <Pressable
        onPress={centerOnUserLocation}
        style={[styles.locateButton, shadows.md]}
      >
        <Ionicons name="locate" size={24} color={colors.light.primary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pricePin: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricePinText: {
    color: colors.palette.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  locateButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.light.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CALLOUT CONTAINER OVERLAYS
  calloutContainer: {
    width: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.palette.white,
  },
  calloutContent: {
    flexDirection: 'column',
    padding: spacing.xs,
  },
  calloutImage: {
    width: '100%',
    height: 80,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.xs,
  },
  calloutTextContainer: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[900],
    marginBottom: 2,
  },
  calloutPrice: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.primary,
    marginBottom: 4,
  },
  calloutAction: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.secondary,
    textTransform: 'uppercase',
  },
});

// FICHIER SUIVANT : mobile/src/components/CalendrierPicker.tsx
