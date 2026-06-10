// mobile/src/components/Avatar.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { borderRadius, fontSize, fontWeight } from '../constants/spacing';

export interface AvatarProps {
  uri?: string | null;
  nom: string;
  prenom: string;
  size?: 'sm' | 'md' | 'lg' | number;
  online?: boolean;
  style?: ViewStyle;
}

// Preset sizing definitions
const sizePresets = {
  sm: 36,
  md: 52,
  lg: 76,
};

// Map deterministic initials background colors
const initialBackgroundColors = [
  '#E53E3E', // Red
  '#3182CE', // Blue
  '#38A169', // Green
  '#D69E2E', // Yellow
  '#805AD5', // Purple
  '#319795', // Teal
  '#DD6B20', // Orange
  '#4A5568', // Slate
];

/**
 * Deterministically picks a color from preset list based on string value.
 */
function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % initialBackgroundColors.length;
  return initialBackgroundColors[index];
}

/**
 * Avatar display profile component.
 * Features remote image loads, colored initials generator fallbacks, and real-time online state indicators.
 */
export const Avatar: React.FC<AvatarProps> = ({
  uri,
  nom,
  prenom,
  size = 'md',
  online = false,
  style,
}) => {
  // Compute diameter size
  const diameter = typeof size === 'number' ? size : sizePresets[size];

  // Resolve initials
  const initialF = prenom ? prenom.charAt(0).toUpperCase() : '';
  const initialL = nom ? nom.charAt(0).toUpperCase() : '';
  const initials = `${initialF}${initialL}`;

  // Deterministic bg color
  const initialsBgColor = getInitialsColor(`${prenom} ${nom}`);

  // Initials Font Size
  const resolvedFontSize = diameter * 0.42;

  // Online status indicator ring sizes
  const indicatorSize = Math.max(8, diameter * 0.2);
  const indicatorOffset = diameter * 0.02;

  return (
    <View style={[styles.container, { width: diameter, height: diameter }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallbackContainer,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: initialsBgColor,
            },
          ]}
        >
          <Text style={[styles.initialsText, { fontSize: resolvedFontSize }]}>{initials}</Text>
        </View>
      )}

      {online && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              bottom: indicatorOffset,
              right: indicatorOffset,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  initialsText: {
    color: colors.palette.white,
    fontWeight: fontWeight.bold,
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: colors.light.success,
    borderWidth: 1.5,
    borderColor: colors.palette.white,
  },
});

// FICHIER SUIVANT : mobile/src/components/BienCard.tsx
